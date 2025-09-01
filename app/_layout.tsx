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

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      networkMode: 'online',
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});



function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
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

  const handlePWAUpdate = () => {
    console.log('[Phoenix Rise] App update available');
    if (typeof window !== 'undefined' && 'confirm' in window && confirm('A new version of Phoenix Rise is available. Update now?')) {
      pwaManager.updateApp();
    }
  };

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
      window.addEventListener('pwa-update-available', handlePWAUpdate);
      console.log('[Phoenix Rise] PWA initialization complete');
    } catch (error) {
      console.error('[Phoenix Rise] PWA initialization failed:', error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (__DEV__ && Platform.OS === 'android') {
          console.log('[RootLayout] Dev Android launch: clearing potential stale caches');
          await AsyncStorage.removeItem('@@expo/bundles');
          queryClient.clear();
        }
      } catch (e) {
        console.warn('[RootLayout] Cache clear noop:', e);
      } finally {
        await SplashScreen.hideAsync();
      }
    })();

    // React Query focus manager hookup for RN/Web
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
  }, [initializePWA]);

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