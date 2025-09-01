import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { WellnessProvider } from "@/providers/WellnessProvider";
import { pwaManager } from "@/utils/pwa";
import { offlineStorage } from "@/utils/offlineStorage";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const initializePWA = React.useCallback(async () => {
    try {
      console.log('[Phoenix Rise] Initializing PWA features...');
      
      // Only run PWA features on web platform
      if (typeof window === 'undefined') {
        console.log('[Phoenix Rise] Not a web environment, skipping PWA initialization');
        return;
      }
      
      // Initialize PWA manager (registers service worker)
      await pwaManager.requestNotificationPermission();
      
      // Set up offline data sync
      const pendingCount = await offlineStorage.getPendingSyncCount();
      if (pendingCount > 0) {
        console.log(`[Phoenix Rise] Found ${pendingCount} items pending sync`);
        // Attempt to sync when online
        if (offlineStorage.isOnline()) {
          await pwaManager.syncOfflineData();
        }
      }
      
      // Listen for online/offline events
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // Listen for PWA update events
      window.addEventListener('pwa-update-available', handlePWAUpdate);
      
      console.log('[Phoenix Rise] PWA initialization complete');
    } catch (error) {
      console.error('[Phoenix Rise] PWA initialization failed:', error);
    }
  }, []);

  useEffect(() => {
    SplashScreen.hideAsync();
    
    // Initialize PWA and offline functionality on web only
    if (Platform.OS === 'web') {
      initializePWA().catch(error => {
        console.error('[Phoenix Rise] PWA initialization failed:', error);
      });
    }
  }, [initializePWA]);



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
    // You could show a notification to the user here
    if (typeof window !== 'undefined' && 'confirm' in window && confirm('A new version of Phoenix Rise is available. Update now?')) {
      pwaManager.updateApp();
    }
  };

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <WellnessProvider>
            <RootLayoutNav />
            {Platform.OS === 'web' && <PWAInstallPrompt />}
          </WellnessProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}