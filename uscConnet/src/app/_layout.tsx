import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import '@/global.css';

// Side-effect import: initializes the i18next singleton (see src/i18n/index.ts)
// synchronously from bundled JSON catalogs. Unlike some i18n setups that load
// catalogs over the network, there's no async step here — no Suspense/loading
// guard is needed before LocaleProvider mounts.
import '@/i18n';

import { fontsToLoad } from '@/constants/fonts';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { BannerProvider } from '@/context/banner-context';
import { ChatProvider } from '@/context/chat-context';
import { LocaleProvider } from '@/context/locale-context';
import { MatchProvider } from '@/context/match-context';
import { NotificationProvider } from '@/context/notification-context';
import { ProfilePhotosProvider } from '@/context/profile-photos-context';
import { ThemeProvider, useTheme } from '@/context/theme-context';
import { ToastProvider } from '@/context/toast-context';
import { toastConfig } from '@/lib/toast-config';

SplashScreen.preventAutoHideAsync();

// Data-layer providers, nested in the same order as the web app's
// `app/page.tsx` provider tree (see Phase 2 port notes). All of these must
// mount cleanly with no logged-in user — `AuthProvider` starts with
// `user: null, isLoading: true` and resolves `isLoading: false` once it
// finds no token in SecureStore, without throwing. Auth-gating (routing to
// `(auth)` vs `(tabs)`) is handled by `RootNavigator` below, via
// `Stack.Protected` — that component reads `useAuth()`, so it must render
// underneath `AuthProvider`, which it does here.
function AppProviders({ children }: PropsWithChildren) {
  return (
    <LocaleProvider>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <MatchProvider>
              <ChatProvider>
                <BannerProvider>
                  <ProfilePhotosProvider>{children}</ProfilePhotosProvider>
                </BannerProvider>
              </ChatProvider>
            </MatchProvider>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontsToLoad);
  const isReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppProviders>
            <RootNavigator />
          </AppProviders>
        </ThemeProvider>
      </SafeAreaProvider>
      {/* Mounted once at the root so it overlays the entire app regardless
          of navigation state. Styled via src/lib/toast-config.tsx to match
          the app's design tokens instead of the library's stock look. */}
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { theme, colors } = useTheme();
  const { isLoading, isLoggedIn, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Matches the web app's `if (isLoading) return <div className="min-h-screen
  // bg-background" />` — a blank themed frame while the auth check resolves,
  // avoiding a flash of the auth screen for users who are actually logged in.
  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        {/* Phase 9: admins are routed to the admin dashboard instead of the
            tabbed app — mirrors the web app's `app/page.tsx`:
            `if (isAdmin) return <AdminDashboardPage onClose={() => {}} />`
            with nothing else rendered. `admin/index.tsx` has no `_layout.tsx`
            of its own, so expo-router hoists it into this root Stack with
            its full relative path as the route name (same convention as
            `chat/[userId]` and `user/[id]` below), not just "admin". */}
        <Stack.Protected guard={isLoggedIn && isAdmin}>
          <Stack.Screen name="admin/index" />
        </Stack.Protected>
        {/* Logged-in, non-admin users get the full tabbed app. Guarding on
            `!isAdmin` here (rather than just `isLoggedIn`, as before Phase 9)
            keeps this branch and the admin branch above mutually exclusive —
            an admin should never see the bottom tab bar or reach Feed/
            Explore/etc, matching the web app's all-or-nothing admin gate. */}
        <Stack.Protected guard={isLoggedIn && !isAdmin}>
          <Stack.Screen name="(tabs)" />
          {/* Phase 6: stacked routes pushed on top of the tabs, gated at the
              same protection tier — both require a matched conversation
              (chat) or a logged-in inbox (notifications), so neither makes
              sense to reach while logged out (or while an admin, who has no
              tabs to push these on top of). */}
          <Stack.Screen name="notifications" />
          <Stack.Screen name="chat/[userId]" />
          {/* Phase 8: the real user profile route — every author-tap /
              search-result-tap TODO left by earlier phases now pushes here. */}
          <Stack.Screen name="user/[id]" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
