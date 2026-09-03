// API Configuration
//
// Ported from the web app's `lib/api-config.ts`. The only change is the env
// var name: Expo inlines `EXPO_PUBLIC_*` vars at build time (the web app
// used Next's `NEXT_PUBLIC_*` convention) — see `.env` / `.env.example` at
// the project root for the local dev value and platform-specific caveats
// (iOS simulator vs Android emulator vs physical device).
export const API_CONFIG = {
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3002/api',
  timeout: 30000,
  // Kept for parity with the web client. RN's axios adapter doesn't use
  // browser cookies the way `withCredentials` implies on web, but the app
  // doesn't rely on cookie-based auth anyway (it's Bearer-token based via
  // the request interceptor below), so this is a harmless no-op today.
  withCredentials: true,
};

export const ENDPOINTS = {
  // Auth
  register: '/auth/register',
  login: '/auth/login',
  verifyOtp: '/auth/verify-otp',
  logout: '/auth/logout',
  refresh: '/auth/refresh',

  // Users
  me: '/users/me',
  updateProfile: '/users/me',
  deleteAccount: '/users/me',
  getUser: (id: string) => `/users/${id}`,
  getUserProfile: (id: string) => `/users/${id}/profile`,
  getRandomUsers: '/users/random',
  searchUsers: '/users/search',

  // Likes
  createLike: '/likes',
  sentLikes: '/likes/sent',
  receivedLikes: '/likes/received',

  // Matches
  matches: '/matches',
  unmatch: (userId: string) => `/matches/user/${userId}`,
  ephemeral: (userId: string) => `/matches/user/${userId}/ephemeral`,

  // Blocks
  getBlockedUsers: '/blocks',
  blockUser: '/blocks',
  unblockUser: (userId: string) => `/blocks/${userId}`,

  // Reports
  createReport: '/reports',
  adminReports: '/admin/reports',
  resolveReport: (id: string) => `/admin/reports/${id}`,

  // Messages
  sendMessage: '/messages',
  conversations: '/messages/conversations',
  getConversation: (userId: string) => `/messages/conversation/${userId}`,
  reportScreenshot: (userId: string) => `/messages/screenshot/${userId}`,
  typing: (userId: string) => `/messages/typing/${userId}`,
  messagesUnreadCount: '/messages/unread-count',

  // Notifications
  notifications: '/notifications',
  unreadCount: '/notifications/unread-count',
  markAsRead: (id: string) => `/notifications/${id}/read`,
  markAllRead: '/notifications/read-all',

  // Leaderboard
  leaderboard: '/leaderboard',
  usersRanking: '/leaderboard/users',
  postsRanking: '/leaderboard/posts',
  myRank: '/leaderboard/my-rank',

  // Admin
  adminStats: '/admin/stats',
  adminUsers: '/admin/users',
  adminLeaderboard: '/admin/leaderboard',
  resetLikes: '/admin/reset-likes',
  deleteUser: (id: string) => `/admin/users/${id}`,

  // Health
  health: '/health',
};
