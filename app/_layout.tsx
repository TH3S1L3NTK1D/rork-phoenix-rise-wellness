import { QueryClient, QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, View, Text, TouchableOpacity, DevSettings, ScrollView } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WellnessProvider, useWellness } from "@/providers/WellnessProvider";
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

const ANUNA_VOICE_ID = 'ahvd0TWxmVC87GTyJn2P' as const;

const GlobalVoiceAgentInner = React.memo(function GlobalVoiceAgentInner() {
  const { wakeWordEnabled, elevenLabsApiKey, addAddiction } = useWellness();
  const wakeRecognizerRef = React.useRef<any>(null);
  const cmdRecognizerRef = React.useRef<any>(null);
  const isWeb = Platform.OS === 'web';

  const speak = React.useCallback(async (text: string) => {
    try {
      const key = (elevenLabsApiKey ?? '').trim();
      if (isWeb && key) {
        const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${ANUNA_VOICE_ID}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'xi-api-key': key,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        });
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const blob = new Blob([buf], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          const audio = new (window as any).Audio(url);
          await audio.play().catch((e: unknown) => console.log('[GlobalVoiceAgent] audio play error', e));
          return;
        }
        console.warn('[GlobalVoiceAgent] ElevenLabs TTS failed', res.status);
      }
      if (isWeb && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
        speechSynthesis.speak(u);
      }
    } catch (e) {
      console.log('[GlobalVoiceAgent] speak error', e);
      if (isWeb && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(u);
      }
    }
  }, [elevenLabsApiKey, isWeb]);

  const dispatchFocusCoach = React.useCallback(() => {
    try {
      if (isWeb) {
        window.dispatchEvent(new CustomEvent('phoenix:wake-word'));
      }
    } catch (e) {
      console.log('[GlobalVoiceAgent] dispatchFocusCoach error', e);
    }
  }, [isWeb]);

  const parseAndExecute = React.useCallback(async (raw: string) => {
    try {
      const text = (raw ?? '').toLowerCase();
      console.log('[GlobalVoiceAgent] Command heard:', text);

      const addAddictionMatch = text.match(/add (?:new )?addiction\s+([a-zA-Z0-9\- ]{2,40})/);
      if (addAddictionMatch?.[1]) {
        const name = addAddictionMatch[1].trim();
        addAddiction(name);
        await speak(`Added new addiction ${name}. I will track your streaks from today.`);
        return;
      }

      if (text.includes('break habit') || text.includes('break the habit')) {
        let tips = 'Here are evidence-based ways to break a habit: identify the trigger, replace the routine, add friction, stack a competing habit, and track streaks with rewards.';
        try {
          const q = encodeURIComponent('how to break a bad habit key steps');
          const url = `https://r.jina.ai/http://www.google.com/search?q=${q}`;
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) {
            const md = await res.text();
            const lines = md.split('\n').filter(l => l.trim().length > 0).slice(0, 8).join(' ');
            if (lines && lines.length > 40) tips = lines.slice(0, 300) + '...';
          }
        } catch (e) {
          console.log('[GlobalVoiceAgent] web fetch tips failed', e);
        }
        await speak(tips);
        return;
      }

      await speak('Hey, I am listening. Say a command like add new addiction smoking.');
    } catch (e) {
      console.log('[GlobalVoiceAgent] parseAndExecute error', e);
    }
  }, [addAddiction, speak]);

  const startCommandRecognition = React.useCallback(() => {
    if (!isWeb) return;
    try {
      const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!SR) return;
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onstart = () => console.log('[GlobalVoiceAgent] Command recognition start');
      rec.onresult = (ev: any) => {
        try {
          const t = ev?.results?.[0]?.[0]?.transcript ?? '';
          parseAndExecute(t);
        } catch (e) {
          console.log('[GlobalVoiceAgent] onresult error', e);
        }
      };
      rec.onerror = (ev: any) => console.log('[GlobalVoiceAgent] command error', ev?.error);
      rec.onend = () => {
        cmdRecognizerRef.current = null;
        if (wakeWordEnabled) {
          setTimeout(() => startWakeRecognition(), 800);
        }
      };
      cmdRecognizerRef.current = rec;
      rec.start();
    } catch (e) {
      console.log('[GlobalVoiceAgent] startCommandRecognition error', e);
    }
  }, [isWeb, parseAndExecute, wakeWordEnabled]);

  const startWakeRecognition = React.useCallback(() => {
    if (!isWeb || !wakeWordEnabled) return;
    try {
      const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!SR) return;
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onstart = () => console.log('[GlobalVoiceAgent] Wake recognition active');
      rec.onresult = (ev: any) => {
        try {
          const idx = ev.results.length - 1;
          const transcript = ev.results[idx][0].transcript.toLowerCase();
          const matched = transcript.includes('hey anuna') || transcript.includes('anuna');
          if (matched) {
            console.log('Hey Anuna detected');
            dispatchFocusCoach();
            try { rec.stop(); } catch {}
            setTimeout(() => startCommandRecognition(), 300);
          }
        } catch (e) {
          console.log('[GlobalVoiceAgent] wake onresult error', e);
        }
      };
      rec.onerror = (ev: any) => console.log('[GlobalVoiceAgent] wake error', ev?.error);
      rec.onend = () => {
        wakeRecognizerRef.current = null;
        if (wakeWordEnabled) {
          setTimeout(() => startWakeRecognition(), 1000);
        }
      };
      wakeRecognizerRef.current = rec;
      rec.start();
    } catch (e) {
      console.log('[GlobalVoiceAgent] startWakeRecognition error', e);
    }
  }, [dispatchFocusCoach, isWeb, startCommandRecognition, wakeWordEnabled]);

  React.useEffect(() => {
    if (!isWeb) return;
    if (wakeWordEnabled) {
      startWakeRecognition();
    } else {
      try {
        wakeRecognizerRef.current?.stop?.();
      } catch {}
      try {
        cmdRecognizerRef.current?.stop?.();
      } catch {}
    }
    return () => {
      try { wakeRecognizerRef.current?.stop?.(); } catch {}
      try { cmdRecognizerRef.current?.stop?.(); } catch {}
      wakeRecognizerRef.current = null;
      cmdRecognizerRef.current = null;
    };
  }, [wakeWordEnabled, isWeb, startWakeRecognition]);

  return null;
});

function GlobalVoiceAgent() {
  return (
    <ErrorBoundary>
      <GlobalVoiceAgentInner />
    </ErrorBoundary>
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
      const onOnline = () => onlineManager.setOnline(true);
      const onOffline = () => onlineManager.setOnline(false);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
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
        // remove with references defined above
        const onOnline = () => onlineManager.setOnline(true);
        const onOffline = () => onlineManager.setOnline(false);
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      }
    };
  }, [initializePWA, clearWebCaches]);

  // Disable expo-updates checks in dev; only run in production to avoid preview errors
  React.useEffect(() => {
    try {
      if (process.env.NODE_ENV === 'production' && Platform.OS !== 'web') {
        (async () => {
          try {
            const Updates: any = await (eval('import')('expo-updates') as Promise<any>);
            console.log('[Updates] Checking for updates (production only)');
            const result = await Updates.checkForUpdateAsync();
            console.log('[Updates] isAvailable =', result?.isAvailable ?? false);
          } catch (e) {
            console.log('[Updates] Update check skipped/failed:', e);
          }
        })();
      } else {
        console.log('[Updates] Skipping update checks in dev mode/previews');
      }
    } catch (e) {
      console.log('[Updates] Guarded check error:', e);
    }
  }, []);

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }} testID="gesture-root">
            <WellnessProvider>
              <RootLayoutNav />
              {Platform.OS === 'web' && <PWAInstallPrompt />}
              <GlobalVoiceAgent />
            </WellnessProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}