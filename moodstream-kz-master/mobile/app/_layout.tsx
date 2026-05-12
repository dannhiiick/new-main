import '../lib/i18n';
import { loadSavedLocale } from '../lib/i18n';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TrackPlayer from 'react-native-track-player';

import { registerClearAuth } from '../lib/api';
import { PlaybackService } from '../lib/playbackService';
import { registerPushToken } from '../lib/pushNotifications';
import { useAuthStore } from '../store/auth';
import { setupPlayer, initPlayerListeners } from '../store/player';
import { useTestMode } from '../store/testMode';
import { useThemeStore } from '../store/theme';

// Must be called before any TrackPlayer operation
TrackPlayer.registerPlaybackService(() => PlaybackService);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading, loadFromStorage, clearAuth } = useAuthStore();
  const checkTestSession = useTestMode(s => s.check);

  useEffect(() => {
    registerClearAuth(clearAuth);
  }, [clearAuth]);

  useEffect(() => {
    void loadSavedLocale();
    void loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (user) void checkTestSession();
  }, [user, checkTestSession]);

  useEffect(() => {
    if (user) {
      const deviceId = user.id; // stable per-user device identifier
      void registerPushToken(deviceId);
    }
  }, [user]);

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }

    void SplashScreen.hideAsync();
  }, [user, isLoading, segments, router]);

  return null;
}

export default function RootLayout() {
  const loadTheme = useThemeStore(s => s.loadTheme);

  useEffect(() => {
    void loadTheme();
    let cleanup: (() => void) | undefined;
    void setupPlayer().then(() => {
      cleanup = initPlayerListeners();
    });
    return () => {
      cleanup?.();
    };
  }, [loadTheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthGate />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="subscription" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="artist/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="album/[id]" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
