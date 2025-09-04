import { QueryClient, QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, View, Text, TouchableOpacity, DevSettings, ScrollView, Modal, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WellnessProvider, useWellness } from "@/providers/WellnessProvider";
import { pwaManager } from "@/utils/pwa";
import { offlineStorage } from "@/utils/offlineStorage";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { trpc, trpcClient } from "@/lib/trpc";
import { Audio } from 'expo-av';
import { Mic } from 'lucide-react-native';

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
  const { wakeWordEnabled, elevenLabsApiKey, assemblyAiApiKey, ttsSpeed } = useWellness();
  const wakeRecognizerRef = React.useRef<any>(null);
  const cmdRecognizerRef = React.useRef<any>(null);
  const isWeb = Platform.OS === 'web';
  const [listeningModal, setListeningModal] = React.useState<boolean>(false);
  const [busy, setBusy] = React.useState<boolean>(false);
  const cancelledRef = React.useRef<boolean>(false);
  const micPermissionGrantedRef = React.useRef<boolean>(false);
  const audioGloballyMutedRef = React.useRef<boolean>(false);
  const wakeLoopRunningRef = React.useRef<boolean>(false);
  const wakeShotTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const setGlobalAudioEnabled = React.useCallback(async (enabled: boolean) => {
    try {
      if (Platform.OS === 'web') return;
      await Audio.setIsEnabledAsync(enabled);
      console.log('[GlobalVoiceAgent] Global audio', enabled ? 'ENABLED' : 'MUTED');
    } catch (e) {
      console.log('[GlobalVoiceAgent] setGlobalAudioEnabled error', e);
    }
  }, []);

  const speak = React.useCallback(async (text: string) => {
    try {
      const key = (elevenLabsApiKey ?? '').trim();
      if (!isWeb && audioGloballyMutedRef.current) {
        console.log('[GlobalVoiceAgent] Unmuting before TTS playback');
        await setGlobalAudioEnabled(true);
        audioGloballyMutedRef.current = false;
      }
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
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true },
            model_id: 'eleven_multilingual_v2',
            optimize_streaming_latency: 2,
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
      if (isWeb && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = (ttsSpeed ?? 0.8) as number; u.pitch = 1.0; u.volume = 1.0;
        speechSynthesis.speak(u);
        return;
      }
      if (Platform.OS !== 'web' && (elevenLabsApiKey ?? '').trim().length > 0) {
        try {
          const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${ANUNA_VOICE_ID}`;
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'xi-api-key': (elevenLabsApiKey ?? '').trim(),
              'Content-Type': 'application/json',
              'Accept': 'audio/mpeg',
            },
            body: JSON.stringify({ text, voice_settings: { stability: 0.5, similarity_boost: 0.75 }, model_id: 'eleven_multilingual_v2' }),
          });
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const u8 = new Uint8Array(arrayBuffer);
            let tmp = '';
            for (let i = 0; i < u8.length; i++) tmp += String.fromCharCode(u8[i]);
            const base64 = (global as any).btoa ? (global as any).btoa(tmp) : '';
            const soundObject = new Audio.Sound();
            await soundObject.loadAsync({ uri: `data:audio/mpeg;base64,${base64}` } as any);
            await soundObject.playAsync();
            return;
          }
        } catch (e) {
          console.log('[GlobalVoiceAgent] native TTS play failed', e);
        }
      }
    } catch (e) {
      console.log('[GlobalVoiceAgent] speak error', e);
      if (isWeb && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = (ttsSpeed ?? 0.8) as number;
        speechSynthesis.speak(u);
      }
    }
  }, [elevenLabsApiKey, isWeb, ttsSpeed, setGlobalAudioEnabled]);

  const chatMutation = trpc.ai.chat.useMutation();

  const processChat = React.useCallback(async (text: string) => {
    try {
      console.log('[GlobalVoiceAgent] Sending chat:', text);
      const res = await chatMutation.mutateAsync({ messages: [{ role: 'user', content: text }] as any });
      const completion: string = (res as any)?.completion ?? '';
      const reply = completion && completion.length > 0 ? completion : 'Anuna is thinking...';
      await speak(reply);
    } catch (e) {
      console.log('[GlobalVoiceAgent] chat error', e);
      await speak('Anuna is thinking...');
    }
  }, [chatMutation, speak]);

  const dispatchFocusCoach = React.useCallback(() => {
    try {
      if (isWeb) {
        window.dispatchEvent(new CustomEvent('phoenix:wake-word'));
      }
    } catch (e) {
      console.log('[GlobalVoiceAgent] dispatchFocusCoach error', e);
    }
  }, [isWeb]);

  const startCommandRecognitionWeb = React.useCallback(() => {
    if (!isWeb) return;
    try {
      const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!SR) return;
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onstart = () => console.log('[GlobalVoiceAgent] Command recognition start');
      rec.onresult = async (ev: any) => {
        try {
          const t = ev?.results?.[0]?.[0]?.transcript ?? '';
          setListeningModal(false);
          if ((t ?? '').length > 0) await processChat(t);
        } catch (e) {
          console.log('[GlobalVoiceAgent] onresult error', e);
        }
      };
      rec.onerror = (ev: any) => console.log('[GlobalVoiceAgent] command error', ev?.error);
      rec.onend = () => {
        cmdRecognizerRef.current = null;
        if (wakeWordEnabled) {
          setTimeout(() => startWakeRecognitionWeb(), 800);
        }
      };
      cmdRecognizerRef.current = rec;
      setListeningModal(true);
      rec.start();
    } catch (e) {
      console.log('[GlobalVoiceAgent] startCommandRecognitionWeb error', e);
    }
  }, [isWeb, processChat, wakeWordEnabled]);

  const startWakeRecognitionWeb = React.useCallback(() => {
    if (!isWeb || !wakeWordEnabled) return;
    try {
      const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!SR) return;
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onstart = () => console.log('[GlobalVoiceAgent] Wake recognition active (web)');
      rec.onresult = (ev: any) => {
        try {
          const idx = ev.results.length - 1;
          const transcript: string = ev.results[idx][0].transcript?.toLowerCase?.() ?? '';
          const matched = /\bhey\s+anuna\b/.test(transcript) || /\banuna\b/.test(transcript);
          if (matched) {
            console.log('[GlobalVoiceAgent] Hey Anuna detected (web)');
            dispatchFocusCoach();
            try { rec.stop(); } catch {}
            setTimeout(() => startCommandRecognitionWeb(), 300);
          }
        } catch (e) {
          console.log('[GlobalVoiceAgent] wake onresult error', e);
        }
      };
      rec.onerror = (ev: any) => console.log('[GlobalVoiceAgent] wake error', ev?.error);
      rec.onend = () => {
        wakeRecognizerRef.current = null;
        if (wakeWordEnabled) setTimeout(() => startWakeRecognitionWeb(), 1000);
      };
      wakeRecognizerRef.current = rec;
      rec.start();
    } catch (e) {
      console.log('[GlobalVoiceAgent] startWakeRecognitionWeb error', e);
    }
  }, [dispatchFocusCoach, isWeb, startCommandRecognitionWeb, wakeWordEnabled]);

  React.useEffect(() => {
    if (!isWeb) return;
    if (wakeWordEnabled) {
      startWakeRecognitionWeb();
    } else {
      try { wakeRecognizerRef.current?.stop?.(); } catch {}
      try { cmdRecognizerRef.current?.stop?.(); } catch {}
    }
    return () => {
      try { wakeRecognizerRef.current?.stop?.(); } catch {}
      try { cmdRecognizerRef.current?.stop?.(); } catch {}
      wakeRecognizerRef.current = null;
      cmdRecognizerRef.current = null;
    };
  }, [wakeWordEnabled, isWeb, startWakeRecognitionWeb]);

  const transcribeWithAssemblyAI = React.useCallback(async (uri: string, key: string): Promise<string> => {
    try {
      const fs = await import('expo-file-system');
      const base64 = await fs.default.readAsStringAsync(uri, { encoding: fs.default.EncodingType.Base64 });
      const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: { 'authorization': key },
        body: (typeof atob === 'function' ? (Uint8Array.from(atob(base64), c => c.charCodeAt(0)) as any) : base64) as any,
      } as any);
      if (!uploadRes.ok) throw new Error('upload failed');
      const audioUrl = await uploadRes.text();
      const createRes = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: { 'authorization': key, 'content-type': 'application/json' },
        body: JSON.stringify({ audio_url: audioUrl }),
      });
      if (!createRes.ok) throw new Error('create transcript failed');
      const job = await createRes.json();
      const id: string = job.id as string;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 1500));
        const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, { headers: { 'authorization': key } });
        const js = await poll.json();
        if ((js as any).status === 'completed') return (js as any).text as string;
        if ((js as any).status === 'error') throw new Error((js as any).error || 'aai error');
      }
      return '';
    } catch (e) {
      console.log('[GlobalVoiceAgent] AAI transcribe error', e);
      return '';
    }
  }, []);

  const transcribeAudio = React.useCallback(async (uri: string, aaiKey: string): Promise<string> => {
    try {
      if ((aaiKey ?? '').trim().length > 0) {
        try {
          const text = await transcribeWithAssemblyAI(uri, aaiKey);
          if (text && text.length > 0) return text;
        } catch (e) {
          console.log('[GlobalVoiceAgent] AssemblyAI failed, fallback', e);
        }
      }
      const fd = new FormData();
      const ext = (uri.split('.').pop() ?? 'm4a');
      fd.append('audio', { uri, name: `clip.${ext}`, type: `audio/${ext}` } as any);
      const res = await fetch('https://toolkit.rork.com/stt/transcribe/', { method: 'POST', body: fd });
      if (!res.ok) return '';
      const json = await res.json();
      const text: string = json?.text ?? '';
      return text;
    } catch (e) {
      console.log('[GlobalVoiceAgent] transcribeAudio error', e);
      return '';
    }
  }, [transcribeWithAssemblyAI]);

  const handleFullCommandNative = React.useCallback(async (aaiKey: string) => {
    try {
      setBusy(true);
      if (!micPermissionGrantedRef.current) {
        console.log('[GlobalVoiceAgent] Mic permission denied (cached)');
        Alert.alert('Mic access needed');
        setListeningModal(false);
        setBusy(false);
        return;
      }
      if (audioGloballyMutedRef.current) {
        console.log('[GlobalVoiceAgent] Unmuting for full command capture');
        await setGlobalAudioEnabled(true);
        audioGloballyMutedRef.current = false;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY as any);
      await rec.startAsync();
      await new Promise(r => setTimeout(r, 8000));
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      setListeningModal(false);
      if (uri) {
        const transcript = await transcribeAudio(uri, aaiKey);
        if (transcript && transcript.length > 0) {
          await processChat(transcript);
        } else {
          Alert.alert('Did not catch that');
        }
      }
    } catch (e) {
      console.log('[GlobalVoiceAgent] handleFullCommandNative error', e);
    } finally {
      setBusy(false);
    }
  }, [processChat, transcribeAudio, setGlobalAudioEnabled]);

  React.useEffect(() => {
    if (isWeb || !wakeWordEnabled) return;
    if (wakeLoopRunningRef.current) return;
    wakeLoopRunningRef.current = true;
    let cancelled = false;
    cancelledRef.current = false;

    const startWakeShotNative = async () => {
      if (cancelled) return;
      try {
        if (!micPermissionGrantedRef.current) {
          const perm = await Audio.requestPermissionsAsync();
          console.log('[GlobalVoiceAgent] Mic permission (native):', perm);
          micPermissionGrantedRef.current = !!perm.granted;
          if (!perm.granted) {
            console.log('[GlobalVoiceAgent] Mic access denied, stopping listener');
            Alert.alert('Mic access denied, stopping listener');
            return;
          }
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        if (!audioGloballyMutedRef.current) {
          try {
            await setGlobalAudioEnabled(false);
            audioGloballyMutedRef.current = true;
            console.log('[GlobalVoiceAgent] Audio muted');
          } catch (e) {
            console.log('[GlobalVoiceAgent] Beep detected, stopping', e);
          }
        }

        const rec = new Audio.Recording();
        await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY as any);
        await rec.startAsync();
        await new Promise(r => setTimeout(r, 3000));
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        if (cancelled || !uri) return;
        const text = await transcribeAudio(uri, assemblyAiApiKey ?? '');
        console.log('[GlobalVoiceAgent] Wake chunk transcript:', text);
        const matched = /\bhey\s*anuna\b/i.test(text) || /\banuna\b/i.test(text);
        if (matched) {
          console.log('[GlobalVoiceAgent] Hey Anuna detected (native)');
          dispatchFocusCoach();
          if (audioGloballyMutedRef.current) {
            console.log('[GlobalVoiceAgent] Unmuting on detection');
            await setGlobalAudioEnabled(true);
            audioGloballyMutedRef.current = false;
          }
          setListeningModal(true);
          await handleFullCommandNative(assemblyAiApiKey ?? '');
          try {
            await setGlobalAudioEnabled(false);
            audioGloballyMutedRef.current = true;
          } catch (e) {
            console.log('[GlobalVoiceAgent] Failed to remute after command', e);
          }
        }
      } catch (e) {
        console.log('[GlobalVoiceAgent] wake shot error', e);
      } finally {
        if (!cancelled && wakeWordEnabled) {
          if (wakeShotTimerRef.current) clearTimeout(wakeShotTimerRef.current);
          wakeShotTimerRef.current = setTimeout(() => {
            void startWakeShotNative();
          }, 1200);
        }
      }
    };

    (async () => {
      try {
        const perm = await Audio.requestPermissionsAsync();
        console.log('[GlobalVoiceAgent] Mic permission (native/init):', perm);
        micPermissionGrantedRef.current = !!perm.granted;
        if (!perm.granted) {
          console.log('[GlobalVoiceAgent] Mic access denied, stopping listener');
          Alert.alert('Mic access denied, stopping listener');
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        try {
          await setGlobalAudioEnabled(false);
          audioGloballyMutedRef.current = true;
          console.log('[GlobalVoiceAgent] Wake listener starting silently');
        } catch (e) {
          console.log('[GlobalVoiceAgent] Beep detected, stopping', e);
        }
        await startWakeShotNative();
      } catch (e) {
        console.log('[GlobalVoiceAgent] audio init error', e);
      }
    })();

    return () => {
      cancelled = true;
      cancelledRef.current = true;
      wakeLoopRunningRef.current = false;
      if (wakeShotTimerRef.current) {
        clearTimeout(wakeShotTimerRef.current);
        wakeShotTimerRef.current = null;
      }
      if (audioGloballyMutedRef.current) {
        void setGlobalAudioEnabled(true);
        audioGloballyMutedRef.current = false;
      }
    };
  }, [isWeb, wakeWordEnabled, assemblyAiApiKey, dispatchFocusCoach, handleFullCommandNative, transcribeAudio, setGlobalAudioEnabled]);

  return (
    <>
      <Modal visible={listeningModal} transparent animationType="fade" onRequestClose={() => setListeningModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="anuna-listening-modal">
            <Text style={styles.modalTitle}>Anuna is listening...</Text>
            <ActivityIndicator color="#FF4500" />
          </View>
        </View>
      </Modal>
      {busy && <View style={styles.busyOverlay} pointerEvents="none" />}
    </>
  );
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
        const onOnline = () => onlineManager.setOnline(true);
        const onOffline = () => onlineManager.setOnline(false);
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
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
              <GlobalVoiceAgent />
              <HeaderMicIndicator />
            </WellnessProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}

function HeaderMicIndicator() {
  const { wakeWordEnabled } = useWellness();
  if (!wakeWordEnabled) return null as any;
  return (
    <View
      testID="header-mic-indicator"
      style={styles.headerMicWrap}
      pointerEvents="none"
    >
      <View style={styles.headerMicPill}>
        <Mic size={14} color="#FF4500" />
        <Text style={styles.headerMicText}>listening</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: 260,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#0b0f14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 10,
  },
  busyOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  headerMicWrap: {
    position: 'absolute',
    top: Platform.select({ ios: 14, android: 8, web: 8, default: 10 }) as number,
    right: 12,
    zIndex: 2000,
  },
  headerMicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,69,0,0.35)',
  },
  headerMicText: {
    color: '#FF4500',
    fontSize: 12,
    fontWeight: '700' as const,
    marginLeft: 6,
    opacity: 0.9,
  },
});
