import * as SecureStore from 'expo-secure-store';
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { API_CONFIG, ENDPOINTS } from './api-config';

// Create axios instance
const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  withCredentials: API_CONFIG.withCredentials,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Token storage
//
// The web version keeps `accessToken`/`refreshToken` in module-level vars,
// lazily hydrated from `localStorage` (synchronous). RN has no synchronous
// persistent storage API, so these become async, backed by expo-secure-store
// (Keychain on iOS, Keystore-backed EncryptedSharedPreferences on Android).
//
// We still keep an in-memory cache — mirroring the web's optimization of not
// hitting the storage layer on every read — but the cache uses `undefined` as
// a distinct "not yet hydrated" sentinel (as opposed to `null`, which means
// "hydrated, no token present"). This avoids re-reading SecureStore forever
// for a logged-out user, which the web's `if (!token) read storage` check
// would otherwise do on every single call since `null` is falsy there too.
// ---------------------------------------------------------------------------

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

let accessTokenCache: string | null | undefined;
let refreshTokenCache: string | null | undefined;

// Concurrent callers (e.g. several requests firing at app boot, all racing
// through the request interceptor before hydration finishes) must not each
// kick off their own pair of SecureStore reads. This promise is shared so
// only the first caller actually reads from storage.
let hydrationPromise: Promise<void> | null = null;

function ensureHydrated(): Promise<void> {
  if (accessTokenCache !== undefined && refreshTokenCache !== undefined) {
    return Promise.resolve();
  }
  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      const [access, refresh] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      ]);
      accessTokenCache = access;
      refreshTokenCache = refresh;
    })();
  }
  return hydrationPromise;
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  accessTokenCache = access;
  refreshTokenCache = refresh;

  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  await ensureHydrated();
  return accessTokenCache ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  await ensureHydrated();
  return refreshTokenCache ?? null;
}

export async function clearTokens(): Promise<void> {
  accessTokenCache = null;
  refreshTokenCache = null;

  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

// ---------------------------------------------------------------------------
// Cross-cutting logout event
//
// The web interceptor does `window.dispatchEvent(new CustomEvent('auth:logout'))`
// when a token refresh fails, and `auth-context.tsx` listens for it via
// `window.addEventListener`. Neither API exists in RN. This is a tiny
// zero-dependency pub/sub standing in for that — `onLogout` returns an
// unsubscribe function so consumers can use it directly as a useEffect
// cleanup, same shape as the web's `removeEventListener` pattern.
// ---------------------------------------------------------------------------
type Listener = () => void;

const logoutListeners = new Set<Listener>();

export const authEvents = {
  onLogout(listener: Listener): () => void {
    logoutListeners.add(listener);
    return () => logoutListeners.delete(listener);
  },
  emitLogout(): void {
    logoutListeners.forEach((listener) => listener());
  },
};

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

// Helper functions
function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// Request interceptor
//
// Axios supports async interceptor functions (it awaits whatever the
// callback returns), so switching `getAccessToken` to async composes here
// with no structural change beyond adding `async`/`await`.
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Un 401 en estos endpoints es credenciales/código inválido — parte
    // normal del flujo de auth, no una sesión expirada. Antes esto disparaba
    // el intento de refresh-token, que al no haber sesión previa fallaba y
    // forzaba una redirección (recarga completa que borraba el mensaje de
    // error y devolvía al usuario al landing en vez de mostrarle
    // "credenciales inválidas").
    const isAuthFlowRequest = [ENDPOINTS.login, ENDPOINTS.register, ENDPOINTS.verifyOtp].some(
      (endpoint) => originalRequest.url?.includes(endpoint)
    );

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthFlowRequest) {
      if (isRefreshing) {
        // Wait for the refresh to complete
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refresh = await getRefreshToken();

        if (!refresh) {
          throw new Error('No refresh token available');
        }

        // Attempt to refresh token
        const response = await axios.post(
          `${API_CONFIG.baseURL}${ENDPOINTS.refresh}`,
          { refreshToken: refresh },
          { withCredentials: true }
        );

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        await setTokens(newAccessToken, newRefreshToken);
        onTokenRefreshed(newAccessToken);

        isRefreshing = false;

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and notify listeners
        isRefreshing = false;
        await clearTokens();

        // Trigger logout event — auth-context.tsx subscribes to clear its
        // `user` state. The web version also hard-redirected to `/` here
        // (`window.location.href = '/'`); RN doesn't need an imperative
        // redirect — src/app/_layout.tsx's Stack.Protected guard reacts to
        // `isLoggedIn` declaratively and routes to (auth) on its own once
        // `user` clears.
        authEvents.emitLogout();

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API methods
export const authApi = {
  // La cuenta recién creada también pasa por el 2FA (igual que login) antes
  // de abrir sesión — la respuesta es { requiresTwoFactor: true, email }.
  register: async (data: {
    name: string;
    nickname?: string;
    email: string;
    password: string;
    major: string;
  }) => {
    const response = await api.post(ENDPOINTS.register, data);
    const { accessToken, refreshToken } = response.data;
    if (accessToken && refreshToken) {
      await setTokens(accessToken, refreshToken);
    }
    return response.data as
      | { user: any; accessToken: string; refreshToken: string }
      | { requiresTwoFactor: true; email: string; message: string };
  },

  // Paso 1: valida credenciales. El 2FA por correo solo se exige la primera
  // vez que la cuenta inicia sesión (justo tras crearla) — ahí la API
  // responde { requiresTwoFactor: true, email } y el código llega por correo.
  // En logins posteriores, ya verificada la cuenta, la API entrega los
  // tokens de una vez.
  login: async (data: { email: string; password: string }) => {
    const response = await api.post(ENDPOINTS.login, data);
    const { user, accessToken, refreshToken } = response.data;
    if (accessToken && refreshToken) {
      await setTokens(accessToken, refreshToken);
    }
    return response.data as
      | { user: any; accessToken: string; refreshToken: string }
      | { requiresTwoFactor: true; email: string; message: string };
  },

  // Paso 2: valida el código OTP de 6 dígitos. Solo aquí se emiten y
  // guardan los tokens de sesión.
  verifyOtp: async (data: { email: string; code: string }) => {
    const response = await api.post(ENDPOINTS.verifyOtp, data);
    const { user, accessToken, refreshToken } = response.data;
    await setTokens(accessToken, refreshToken);
    return { user, accessToken, refreshToken };
  },

  logout: async () => {
    try {
      const refresh = await getRefreshToken();
      await api.post(ENDPOINTS.logout, { refreshToken: refresh });
    } finally {
      await clearTokens();
    }
  },

  getCurrentUser: async () => {
    const response = await api.get(ENDPOINTS.me);
    return response.data;
  },
};

export const usersApi = {
  getProfile: async () => {
    const response = await api.get(ENDPOINTS.me);
    return response.data;
  },

  updateProfile: async (data: { name?: string; nickname?: string; major?: string; photoUrl?: string | null; photos?: string[]; bio?: string; bannerUrl?: string | null }) => {
    const response = await api.put(ENDPOINTS.updateProfile, data);
    return response.data;
  },

  deleteAccount: async () => {
    const response = await api.delete(ENDPOINTS.deleteAccount);
    return response.data;
  },

  getUser: async (id: string) => {
    const response = await api.get(ENDPOINTS.getUser(id));
    return response.data;
  },

  getUserProfile: async (id: string) => {
    const response = await api.get(ENDPOINTS.getUserProfile(id));
    return response.data;
  },

  getRandomUsers: async (limit?: number) => {
    const response = await api.get(ENDPOINTS.getRandomUsers, {
      params: { limit },
    });
    return response.data;
  },

  searchUsers: async (query: string) => {
    const response = await api.get(ENDPOINTS.searchUsers, {
      params: { q: query },
    });
    return response.data;
  },
};

export const likesApi = {
  createLike: async (receiverId: string) => {
    const response = await api.post(ENDPOINTS.createLike, { receiverId });
    return response.data;
  },

  getSentLikes: async () => {
    const response = await api.get(ENDPOINTS.sentLikes);
    return response.data;
  },

  getReceivedLikes: async () => {
    const response = await api.get(ENDPOINTS.receivedLikes);
    return response.data;
  },
};

export const matchesApi = {
  getMatches: async () => {
    const response = await api.get(ENDPOINTS.matches);
    return response.data;
  },

  unmatch: async (userId: string) => {
    const response = await api.delete(ENDPOINTS.unmatch(userId));
    return response.data;
  },

  getEphemeral: async (userId: string) => {
    const response = await api.get(ENDPOINTS.ephemeral(userId));
    return response.data as { active: boolean; mine: boolean };
  },

  setEphemeral: async (userId: string, enabled: boolean) => {
    const response = await api.patch(ENDPOINTS.ephemeral(userId), { enabled });
    return response.data as { active: boolean; mine: boolean };
  },
};

export const blocksApi = {
  getBlockedUsers: async () => {
    const response = await api.get(ENDPOINTS.getBlockedUsers);
    return response.data;
  },

  blockUser: async (blockedId: string) => {
    const response = await api.post(ENDPOINTS.blockUser, { blockedId });
    return response.data;
  },

  unblockUser: async (userId: string) => {
    const response = await api.delete(ENDPOINTS.unblockUser(userId));
    return response.data;
  },
};

export const reportsApi = {
  createReport: async (data: { reportedId: string; reason: string; details?: string }) => {
    const response = await api.post(ENDPOINTS.createReport, data);
    return response.data;
  },
};

export const messagesApi = {
  sendMessage: async (data: { receiverId: string; content: string }) => {
    const response = await api.post(ENDPOINTS.sendMessage, data);
    return response.data;
  },

  getConversations: async () => {
    const response = await api.get(ENDPOINTS.conversations);
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get(ENDPOINTS.messagesUnreadCount);
    return response.data as { count: number };
  },

  getConversation: async (userId: string) => {
    const response = await api.get(ENDPOINTS.getConversation(userId));
    return response.data;
  },

  reportScreenshot: async (userId: string) => {
    const response = await api.post(ENDPOINTS.reportScreenshot(userId));
    return response.data;
  },

  setTyping: async (userId: string, isTyping: boolean) => {
    const response = await api.post(ENDPOINTS.typing(userId), { isTyping });
    return response.data;
  },

  getTypingStatus: async (userId: string) => {
    const response = await api.get(ENDPOINTS.typing(userId));
    return response.data as { typing: boolean };
  },
};

export const notificationsApi = {
  getNotifications: async () => {
    const response = await api.get(ENDPOINTS.notifications);
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get(ENDPOINTS.unreadCount);
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await api.patch(ENDPOINTS.markAsRead(id));
    return response.data;
  },

  markAllRead: async () => {
    const response = await api.patch(ENDPOINTS.markAllRead);
    return response.data;
  },
};

export const leaderboardApi = {
  getLeaderboard: async (limit?: number) => {
    const response = await api.get(ENDPOINTS.leaderboard, {
      params: { limit },
    });
    return response.data;
  },

  getMyRank: async () => {
    const response = await api.get(ENDPOINTS.myRank);
    return response.data;
  },

  getUsersRanking: async (limit?: number) => {
    const response = await api.get(ENDPOINTS.usersRanking, { params: { limit } });
    return response.data;
  },

  getPostsRanking: async (limit?: number) => {
    const response = await api.get(ENDPOINTS.postsRanking, { params: { limit } });
    return response.data;
  },
};

export const adminApi = {
  getStats: async () => {
    const response = await api.get(ENDPOINTS.adminStats);
    return response.data;
  },

  getUsers: async (page?: number, limit?: number) => {
    const response = await api.get(ENDPOINTS.adminUsers, {
      params: { page, limit },
    });
    return response.data;
  },

  getLeaderboard: async (limit?: number) => {
    const response = await api.get(ENDPOINTS.adminLeaderboard, {
      params: { limit },
    });
    return response.data;
  },

  resetLikes: async () => {
    const response = await api.post(ENDPOINTS.resetLikes);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await api.delete(ENDPOINTS.deleteUser(id));
    return response.data;
  },

  getReports: async (status?: string) => {
    const response = await api.get(ENDPOINTS.adminReports, { params: { status } });
    return response.data;
  },

  resolveReport: async (id: string, action: 'dismiss' | 'resolve' | 'suspend_1w' | 'suspend_1m' | 'ban') => {
    const response = await api.patch(ENDPOINTS.resolveReport(id), { action });
    return response.data;
  },
};

export const postsApi = {
  getFeed: async (offset = 0, limit = 20) => {
    const response = await api.get('/posts/feed', { params: { offset, limit } });
    return response.data;
  },

  createPost: async (data: { content: string; imageUrl?: string }) => {
    const response = await api.post('/posts', data);
    return response.data;
  },

  likePost: async (postId: string) => {
    const response = await api.post(`/posts/${postId}/like`);
    return response.data;
  },

  unlikePost: async (postId: string) => {
    const response = await api.delete(`/posts/${postId}/like`);
    return response.data;
  },

  addComment: async (postId: string, content: string) => {
    const response = await api.post(`/posts/${postId}/comment`, { content });
    return response.data;
  },

  getComments: async (postId: string, limit?: number, offset?: number) => {
    const response = await api.get(`/posts/${postId}/comments`, {
      params: { limit, offset },
    });
    return response.data;
  },

  deleteComment: async (commentId: string) => {
    const response = await api.delete(`/posts/comments/${commentId}`);
    return response.data;
  },

  deletePost: async (postId: string) => {
    const response = await api.delete(`/posts/${postId}`);
    return response.data;
  },
};

export default api;
