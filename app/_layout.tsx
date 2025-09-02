import { QueryClient, QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, View, Text, TouchableOpacity, DevSettings, ScrollView } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WellnessProvider } from "@/providers/WellnessProvider";
import { pwaManager } from "@/utils/pwa";
import { offlineStorage } from "@/utils/offlineStorage";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { trpc, trpcClient } from "@/lib/trpc";

const APP_VERSION = '1.0.3';
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as any)?.status ?? (error as any)?.response?.status;
        if (status && (status < 500 && status !== 408 && status !== 429)) return false;
        return failureCount < 3;
      },
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      networkMode: 'online',
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retryDelay: (attempt) => Math.min(2000, 500 * Math.pow(2, attempt)) + Math.random() * 150,
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack initialRouteName="index" screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error; info?: { componentStack: string } }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[Root ErrorBoundary] Caught error', error, info);
    this.setState({ info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#0b0f14' }} contentContainerStyle={{ padding: 16 }} testID="error-boundary-fallback">
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Something went wrong</Text>
          <Text style={{ color: '#ff6b6b', marginBottom: 8 }} selectable>{this.state.error?.name}: {this.state.error?.message}</Text>
          {!!this.state.error?.stack && (
            <Text style={{ color: '#9fb3c8', fontSize: 12 }} selectable>{this.state.error.stack}</Text>
          )}
          {!!this.state.info?.componentStack && (
            <Text style={{ color: '#70889e', fontSize: 12, marginTop: 12 }} selectable>{this.state.info.componentStack}</Text>
          )}
          <View style={{ height: 16 }} />
          <TouchableOpacity
            testID="retry-button"
            onPress={async () => {
              try {
                if (__DEV__ && Platform.OS === 'android') {
                  await AsyncStorage.clear();
                  console.log('[Root ErrorBoundary] Cleared AsyncStorage cache');
                }
              } catch (e) {
                console.warn('[Root ErrorBoundary] Failed to clear cache', e);
              } finally {
                if (Platform.OS === 'web' && typeof location !== 'undefined') {
                  location.reload();
                } else if ((DevSettings as any)?.reload) {
                  (DevSettings as any).reload();
                }
              }
            }}
            style={{ backgroundColor: '#FF4500', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export const unstable_settings = { initialRouteName: 'index' };

export default function RootLayout() {
  const handleOnline = async () => {
    console.log('[Phoenix Rise] Device is back online');
    try {
      await pwaManager.syncOfflineData();
      const pendingCount = await offlineStorage.getPendingSyncCount();
      if (pendingCount > 0) {
        console.log(`[Phoenix Rise] Syncing ${pendingCount} pending items...`);
      }
    } catch (error) {
      console.error('[Phoenix Rise] Sync failed:', error);
    }
  };

  const handleOffline = () => {
    console.log('[Phoenix Rise] Device is offline - data will be cached locally');
  };



  const clearWebCaches = React.useCallback(async () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try {
      const last = localStorage.getItem('phoenix:lastCacheClear');
      const now = Date.now();
      const shouldClear = __DEV__ || !last || now - Number(last) > 6 * 60 * 60 * 1000;
      if (!shouldClear) return;
      console.log('[RootLayout] Clearing web caches and SW registrations');
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      } catch (e) {
        console.warn('[RootLayout] SW unregister failed', e);
      }
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      } catch (e) {
        console.warn('[RootLayout] CacheStorage clear failed', e);
      }
      localStorage.setItem('phoenix:lastCacheClear', String(now));
    } catch (e) {
      console.warn('[RootLayout] clearWebCaches noop', e);
    }
  }, []);

  const initializePWA = React.useCallback(async () => {
    try {
      console.log('[Phoenix Rise] Initializing PWA features...');
      if (typeof window === 'undefined') {
        console.log('[Phoenix Rise] Not a web environment, skipping PWA initialization');
        return;
      }
      await pwaManager.requestNotificationPermission();
      const pendingCount = await offlineStorage.getPendingSyncCount();
      if (pendingCount > 0 && offlineStorage.isOnline()) {
        await pwaManager.syncOfflineData();
      }
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      // Update prompt disabled temporarily
      console.log('[Phoenix Rise] PWA initialization complete');
    } catch (error) {
      console.error('[Phoenix Rise] PWA initialization failed:', error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        let didClearForVersion = false;
        try {
          const storedVersion = await AsyncStorage.getItem('phoenix:appVersion');
          if (storedVersion !== APP_VERSION) {
            console.log(`[RootLayout] App version changed ${storedVersion ?? 'none'} -> ${APP_VERSION}. Clearing caches...`);
            await AsyncStorage.clear();
            await AsyncStorage.setItem('phoenix:appVersion', APP_VERSION);
            didClearForVersion = true;
          }
        } catch (e) {
          console.warn('[RootLayout] Versioned clear failed', e);
        }

        if ((__DEV__ && Platform.OS === 'android') || didClearForVersion) {
          console.log('[RootLayout] Dev/Version clear: removing potential stale caches');
          await AsyncStorage.removeItem('@@expo/bundles');
          await AsyncStorage.removeItem('EXPO_DEV_TOOLS_CACHE');
          await AsyncStorage.removeItem('EXPO_ERROR_RECOVERY_CACHE');
          await AsyncStorage.removeItem('react-query-cache');
          try {
            const keys = await AsyncStorage.getAllKeys();
            const routerKeys = keys.filter(k => k.includes('expo-router') || k.includes('__expo_router'));
            if (routerKeys.length) {
              await AsyncStorage.multiRemove(routerKeys);
              console.log('[RootLayout] Cleared Expo Router keys:', routerKeys);
            }
          } catch (e) {
            console.warn('[RootLayout] Failed to clear router keys', e);
          }
          queryClient.clear();
        }
        if (Platform.OS === 'web') {
          await clearWebCaches();
        }
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        const url = `${base}/api/healthz`;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            console.log(`[RootLayout] Preflight ping ${url} (attempt ${attempt + 1}/3)`);
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
            clearTimeout(id);
            if (res.ok) {
              console.log('[RootLayout] Preflight OK');
              break;
            } else {
              console.warn('[RootLayout] Preflight non-OK', res.status);
              await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
            }
          } catch (e) {
            console.warn('[RootLayout] Preflight failed', e);
            await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
          }
        }
      } catch (e) {
        console.warn('[RootLayout] Cache clear noop:', e);
      } finally {
        await SplashScreen.hideAsync();
      }
    })();

    const sub = () => {
      const isFocused = typeof document !== 'undefined' ? !document.hidden : true;
      focusManager.setFocused(isFocused);
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', sub);
    }

    if (Platform.OS === 'web') {
      initializePWA().catch(error => {
        console.error('[Phoenix Rise] PWA initialization failed:', error);
      });
      window.addEventListener('online', () => onlineManager.setOnline(true));
      window.addEventListener('offline', () => onlineManager.setOnline(false));
    }

    const globalHandler = (global as any)?.ErrorUtils?.getGlobalHandler?.();
    (global as any).ErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
      console.error('[GlobalErrorHandler]', { isFatal, error });
      if (globalHandler) globalHandler(error, isFatal);
    });

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', sub);
      }
      if (Platform.OS === 'web') {
        window.removeEventListener('online', () => onlineManager.setOnline(true));
        window.removeEventListener('offline', () => onlineManager.setOnline(false));
      }
    };
  }, [initializePWA, clearWebCaches]);

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }} testID="gesture-root">
            <WellnessProvider>
              <RootLayoutNav />
              {Platform.OS === 'web' && <PWAInstallPrompt />}
            </WellnessProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}