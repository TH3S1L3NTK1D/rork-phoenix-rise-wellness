import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Animated, Platform, Modal, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Flame, RotateCcw, Volume2, VolumeX, Mic } from 'lucide-react-native';
import { useWellness } from '@/providers/WellnessProvider';
import { trpc } from '@/lib/trpc';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { getHref } from '@/constants/routes';


interface SmartResponse {
  text: string;
  quickActions?: string[];
  emotion?: 'celebration' | 'comfort' | 'motivation' | 'default';
  visualEmoji?: string;
  messageColor?: string;
}

const ANUNA_DEFAULT_VOICE_ID = 'ahvd0TWxmVC87GTyJn2P' as const;

function PhoenixCoach() {
  const router = useRouter();
  const {
    chatMessages,
    addChatMessage,
    clearChatHistory,
    userProfile,
    phoenixPoints,
    goals,
    streaks,
    todaysMeals,
    todaysSupplements,
    journalEntries,
    currentTheme,
    elevenLabsApiKey,
    assemblyAiApiKey,
    wakeWordEnabled,
    ttsSpeed,
    openWeatherApiKey,
    addAddiction,
    addMeal,
    addGoal,
  } = useWellness();

  const theme = currentTheme.colors;

  const [inputText, setInputText] = useState<string>('');
  const inputRef = useRef<TextInput>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  type IntentKind = 'add_addiction' | 'set_goal' | 'log_meal';
  type PendingIntent = { kind: IntentKind; step: number; data: Record<string, any> } | null;
  const [pendingIntent, setPendingIntent] = useState<PendingIntent>(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;
  const soundWaveAnimations = useRef(Array.from({ length: 5 }, () => new Animated.Value(0))).current;

  const [listeningModalVisible, setListeningModalVisible] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Using default Anuna voice id; settings can override globally when available
  const [voiceId, setVoiceId] = useState<string>(ANUNA_DEFAULT_VOICE_ID);
  useEffect(() => {
    (async () => {
      try {
        const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
        const saved = await AsyncStorage.getItem('@phoenix_anuna_voice_id');
        if (saved && saved.trim().length > 0) setVoiceId(saved.trim());
      } catch {}
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const ls = window.localStorage.getItem('@phoenix_anuna_voice_id');
          if (ls && ls.trim().length > 0) setVoiceId(ls.trim());
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS !== 'web') {
          const perm = await Audio.requestPermissionsAsync();
          console.log('[Coach] Mic permission:', perm);
          if (!perm.granted) Alert.alert('Grant mic access');
        }
      } catch (e) {
        console.log('[Coach] request mic permission error', e);
      }
    })();
  }, []);



  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const detectEmotion = (message: string): { emotion: SmartResponse['emotion']; emoji: string; color: string } => {
    const lower = (message ?? '').toLowerCase();
    if (/(congratulations|amazing|incredible|fantastic|proud of you|victory|achievement)/.test(lower)) return { emotion: 'celebration', emoji: '🎉', color: '#FFD700' };
    if (/(sorry|tough|difficult|understand|it\s*'s ok|breathe)/.test(lower)) return { emotion: 'comfort', emoji: '💙', color: '#87CEEB' };
    if (/(you can do|push yourself|don\'t give up|keep going|rise up|transform|stronger|power)/.test(lower)) return { emotion: 'motivation', emoji: '💪', color: '#FF4500' };
    return { emotion: 'default', emoji: '🔥', color: '#FF4500' };
  };

  const getLevel = useMemo(() => Math.floor(phoenixPoints / 100) + 1, [phoenixPoints]);

  const generateSmartResponse = useCallback((message: string): SmartResponse => {
    const lowerMessage = (message ?? '').toLowerCase();
    const userName = userProfile.name || 'Phoenix Warrior';
    const timeOfDay = getTimeOfDay();
    const totalStreakDays = Object.values(streaks).reduce((sum, days) => sum + days, 0);
    const activeGoals = goals.filter(g => !g.completed).length;
    const completedGoals = goals.filter(g => g.completed).length;
    const recentJournal = journalEntries[0];

    if (/(craving|want to eat|hungry)/.test(lowerMessage)) {
      const responseText = `${userName}, cravings are temporary. Your streak is ${totalStreakDays} days – drink water and breathe. 🔥`;
      const e = detectEmotion(responseText);
      return { text: responseText, quickActions: ['Log Healthy Snack', 'Start 5-Min Timer'], emotion: e.emotion, visualEmoji: e.emoji, messageColor: e.color };
    }
    if (/(broke|failed|messed up|relapsed)/.test(lowerMessage)) {
      const responseText = `Phoenixes rise from ashes. One setback ≠ failure, ${userName}. Completed goals: ${completedGoals}. Back on track now. ✨`;
      const e = detectEmotion(responseText);
      return { text: responseText, quickActions: ['Reset Streak', 'Journal Feelings'], emotion: e.emotion, visualEmoji: e.emoji, messageColor: e.color };
    }
    if (/(motivation|unmotivated|give up)/.test(lowerMessage)) {
      const responseText = `${userName}, Level ${getLevel}. ${todaysMeals} meals, ${todaysSupplements} supplements. Small step now. 🚀`;
      const e = detectEmotion(responseText);
      return { text: responseText, quickActions: ['View Progress', 'Set Mini Goal'], emotion: e.emotion, visualEmoji: e.emoji, messageColor: e.color };
    }
    if (/(stressed|anxiety|overwhelmed)/.test(lowerMessage)) {
      const responseText = `Pause with me, ${userName}. 4-4-4 breathing. ${recentJournal ? `You handled stress on ${new Date(recentJournal.date).toDateString()}.` : ''}`;
      const e = detectEmotion(responseText);
      return { text: responseText, quickActions: ['Start Breathing', 'Quick Journal'], emotion: e.emotion, visualEmoji: e.emoji, messageColor: e.color };
    }
    if (/(hello|hi|hey)/.test(lowerMessage)) {
      const greetings: Record<string, string> = {
        morning: `Good morning, ${userName}! Goals active: ${activeGoals}. Level ${getLevel}. 🌅`,
        afternoon: `Good afternoon, ${userName}! Points: ${phoenixPoints}. ⭐`,
        evening: `Good evening, ${userName}! Logged ${todaysMeals} meals today. 🌙`,
      };
      const responseText = greetings[timeOfDay];
      const e = detectEmotion(responseText);
      return { text: responseText, quickActions: ['View Today', 'Check Goals'], emotion: e.emotion, visualEmoji: e.emoji, messageColor: e.color };
    }
    const responseText = `I'm here for your transformation, ${userName}. Level ${getLevel}, Points ${phoenixPoints}. What shall we tackle? 🔥`;
    const e = detectEmotion(responseText);
    return { text: responseText, quickActions: ['Set Goal', 'Quick Check-in'], emotion: e.emotion, visualEmoji: e.emoji, messageColor: e.color };
  }, [userProfile.name, phoenixPoints, goals, streaks, todaysMeals, todaysSupplements, journalEntries, getLevel]);

  const startTypingAnimation = () => {
    setIsTyping(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnimation, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(typingAnimation, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  };
  const stopTypingAnimation = () => {
    setIsTyping(false);
    typingAnimation.stopAnimation();
    typingAnimation.setValue(0);
  };

  const speakWithAPI = async (text: string) => {
    try {
      const key = (elevenLabsApiKey ?? '').trim();
      if (!key) {
        speakWithBrowser(text);
        return;
      }
      const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || ANUNA_DEFAULT_VOICE_ID}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
        body: JSON.stringify({ text }),
      });
      console.log('[Coach] ElevenLabs status', res.status);
      if (!res.ok) { speakWithBrowser(text); return; }
      const arrayBuffer = await res.arrayBuffer();
      if (Platform.OS === 'web') {
        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new (window as any).Audio(url);
        try { (audio as HTMLAudioElement).playbackRate = (ttsSpeed ?? 0.8) || 0.8; } catch {}
        audio.play().catch((e: unknown) => console.log('[Coach] web audio play error', e));
        return;
      }
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = typeof btoa !== 'undefined' ? btoa(binary) : '';
      const { sound } = await Audio.Sound.createAsync({ uri: `data:audio/mpeg;base64,${base64}` });
      try { await sound.setRateAsync(Math.max(0.5, Math.min(1.5, ttsSpeed ?? 0.8)), true); } catch {}
      await sound.playAsync();
    } catch (e) {
      console.log('[Coach] speakWithAPI error', e);
      speakWithBrowser(text);
    }
  };

  const speakWithBrowser = (text: string) => {
    try {
      if (Platform.OS === 'web' && 'speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(text);
        try { utter.rate = Math.max(0.5, Math.min(1.5, ttsSpeed ?? 0.8)); } catch {}
        utter.onstart = () => setIsSpeaking(true);
        utter.onend = () => { setIsSpeaking(false); currentUtteranceRef.current = null; };
        currentUtteranceRef.current = utter;
        speechSynthesis.speak(utter);
      }
    } catch (e) { console.log('[Coach] speakWithBrowser error', e); }
  };

  const speakCoachMessage = async (text: string) => {
    try { await speakWithAPI(text); } catch (e) { console.log('speakCoachMessage error', e); }
  };

  const confirmAndSpeak = useCallback((text: string) => {
    const e = detectEmotion(text);
    addChatMessage({ 
      text,
      isUser: false,
      quickActions: [],
      emotion: e.emotion,
      visualEmoji: e.emoji,
      messageColor: e.color,
    });
    setTimeout(() => { void speakCoachMessage(text); }, 150);
  }, [addChatMessage]);

  const fetchWeather = useCallback(async (): Promise<string | null> => {
    try {
      const key = (openWeatherApiKey ?? '').trim();
      if (!key) return null;
      let url = '';
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        const coords = await new Promise<{lat: number; lon: number} | null>((resolve) => {
          try {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
              () => resolve(null),
              { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
            );
          } catch {
            resolve(null);
          }
        });
        if (coords) {
          url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${encodeURIComponent(key)}&units=metric`;
        }
      }
      if (!url) {
        const city = 'New York';
        url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${encodeURIComponent(key)}&units=metric`;
      }
      console.log('[Coach][Weather] Fetching', url);
      const res = await fetch(url);
      if (!res.ok) {
        console.log('[Coach][Weather] API error', res.status);
        if (res.status === 401 || res.status === 403) {
          Alert.alert('Weather', 'Invalid OpenWeather API key');
        }
        return null;
      }
      const json = await res.json();
      const name: string = (json?.name as string) ?? 'Your area';
      const main = json?.main ?? {};
      const weather0 = Array.isArray(json?.weather) ? json.weather[0] : undefined;
      const temp = typeof main?.temp === 'number' ? Math.round(main.temp) : undefined;
      const feels = typeof main?.feels_like === 'number' ? Math.round(main.feels_like) : undefined;
      const humidity = typeof main?.humidity === 'number' ? main.humidity : undefined;
      const wind = json?.wind?.speed ? Math.round(json.wind.speed) : undefined;
      const cond = typeof weather0?.description === 'string' ? weather0.description : 'conditions unavailable';
      const parts: string[] = [];
      if (typeof temp === 'number') parts.push(`${temp}°C`);
      if (typeof feels === 'number') parts.push(`feels like ${feels}°C`);
      if (typeof humidity === 'number') parts.push(`humidity ${humidity}%`);
      if (typeof wind === 'number') parts.push(`wind ${wind} m/s`);
      const summary = `Live weather for ${name}: ${cond}; ${parts.join(', ')}`;
      console.log('[Coach][Weather] Summary', summary);
      return summary;
    } catch (e) {
      console.log('[Coach][Weather] fetch error', e);
      return null;
    }
  }, []);

  const handleIntentFlow = useCallback(async (raw: string): Promise<boolean> => {
    try {
      const text = (raw ?? '').trim();
      if (!text) return false;
      console.log('[Coach][Intent] incoming:', text, 'pending:', pendingIntent);

      if (pendingIntent) {
        if (pendingIntent.kind === 'add_addiction') {
          const name = text.replace(/\./g, '').trim();
          if (name.length < 2) { confirmAndSpeak('Please say the addiction name.'); return true; }
          addAddiction(name);
          setPendingIntent(null);
          confirmAndSpeak(`Added addiction: ${name}. I am rooting for your streak.`);
          return true;
        }
        if (pendingIntent.kind === 'log_meal') {
          const lower = text.toLowerCase();
          const typeMatch = /(breakfast|lunch|dinner|snack)/.exec(lower);
          const type = (typeMatch ? (typeMatch[1] as 'breakfast'|'lunch'|'dinner'|'snack') : (pendingIntent.data.type as any)) as 'breakfast'|'lunch'|'dinner'|'snack' | undefined;
          const caloriesMatch = /(\d{2,4})\s*cal(ories)?/i.exec(text);
          const calories = caloriesMatch ? Number(caloriesMatch[1]) : (typeof pendingIntent.data.calories === 'number' ? pendingIntent.data.calories : 0);
          const name = pendingIntent.data.name ? String(pendingIntent.data.name) : (text.replace(/\b(breakfast|lunch|dinner|snack)\b/i, '').replace(/\d{2,4}\s*cal(ories)?/i, '').trim());
          if (!type) { setPendingIntent({ kind: 'log_meal', step: 1, data: { ...pendingIntent.data, name } }); confirmAndSpeak('What meal type is it? Breakfast, lunch, dinner, or snack?'); return true; }
          if (!name || name.length < 2) { setPendingIntent({ kind: 'log_meal', step: 2, data: { ...pendingIntent.data, type, calories } }); confirmAndSpeak('What did you have?'); return true; }
          addMeal({ type, name, calories: Number.isFinite(calories) ? calories : 0, completed: true });
          setPendingIntent(null);
          confirmAndSpeak(`Logged ${type}: ${name}${calories ? `, ${calories} calories` : ''}. Well done.`);
          return true;
        }
        if (pendingIntent.kind === 'set_goal') {
          const title = text.trim();
          const goal = {
            title,
            description: '',
            category: 'personal' as const,
            targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            measurementMethod: '',
            priority: 'medium' as const,
            milestones: [] as string[],
            progress: 0,
            completed: false,
          };
          addGoal(goal);
          setPendingIntent(null);
          try { router.push(getHref('goals')); } catch {}
          confirmAndSpeak(`Goal created: ${title}. I opened your goals.`);
          return true;
        }
        return false;
      }

      if (/\badd\s+addiction\b/i.test(text)) {
        const nameMatch = text.match(/add\s+addiction\s+(?:called\s+)?(.+)/i);
        if (nameMatch && nameMatch[1]?.trim()) {
          const name = nameMatch[1].trim();
          addAddiction(name);
          confirmAndSpeak(`Added addiction: ${name}. Stay strong.`);
          return true;
        }
        setPendingIntent({ kind: 'add_addiction', step: 1, data: {} });
        confirmAndSpeak('What addiction?');
        return true;
      }

      if (/\b(log|add)\s+meal\b/i.test(text) || /\bmeal\s+log\b/i.test(text)) {
        const lower = text.toLowerCase();
        const typeMatch = /(breakfast|lunch|dinner|snack)/.exec(lower);
        const type = typeMatch ? (typeMatch[1] as 'breakfast'|'lunch'|'dinner'|'snack') : undefined;
        const caloriesMatch = /(\d{2,4})\s*cal(ories)?/i.exec(text);
        const calories = caloriesMatch ? Number(caloriesMatch[1]) : undefined;
        const name = text.replace(/\b(log|add)\s+meal\b/i, '').replace(/\bmeal\s+log\b/i, '').replace(/\b(breakfast|lunch|dinner|snack)\b/i, '').replace(/\d{2,4}\s*cal(ories)?/i, '').trim();
        if (type && name) {
          addMeal({ type, name, calories: Number.isFinite(calories as any) ? (calories as number) : 0, completed: true });
          confirmAndSpeak(`Logged ${type}: ${name}${calories ? `, ${calories} calories` : ''}.`);
          return true;
        }
        setPendingIntent({ kind: 'log_meal', step: 0, data: { type, name, calories } });
        if (!type) { confirmAndSpeak('What meal type is it? Breakfast, lunch, dinner, or snack?'); }
        else if (!name) { confirmAndSpeak('What did you have?'); }
        else { confirmAndSpeak('How many calories, approximately?'); }
        return true;
      }

      if (/\bset\s+goal\b/i.test(text) || /\bcreate\s+goal\b/i.test(text)) {
        const titleMatch = text.match(/(?:set|create)\s+goal\s+(?:to\s+)?(.+)/i);
        if (titleMatch && titleMatch[1]?.trim()) {
          const title = titleMatch[1].trim();
          const goal = {
            title,
            description: '',
            category: 'personal' as const,
            targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            measurementMethod: '',
            priority: 'medium' as const,
            milestones: [] as string[],
            progress: 0,
            completed: false,
          };
          addGoal(goal);
          try { router.push(getHref('goals')); } catch {}
          confirmAndSpeak(`Goal created: ${title}. I opened your goals.`);
          return true;
        }
        setPendingIntent({ kind: 'set_goal', step: 1, data: {} });
        confirmAndSpeak('What is the goal title?');
        try { router.push(getHref('goals')); } catch {}
        return true;
      }

      return false;
    } catch (e) {
      console.log('[Coach][Intent] error', e);
      return false;
    }
  }, [pendingIntent, addAddiction, addMeal, addGoal, confirmAndSpeak, router]);

  const sendMessage = async (text?: string) => {
    const messageText = (text ?? inputText ?? '').trim();
    if (!messageText) return;
    console.log('[Coach] sendMessage ->', messageText);
    
    addChatMessage({ text: messageText, isUser: true });
    setInputText('');
    inputRef.current?.clear();
    inputRef.current?.focus();

    if (await handleIntentFlow(messageText)) {
      return;
    }

    startTypingAnimation();
    
    try {
      console.log('[Coach] Calling AI chat mutation...');
      const messages: any[] = [
        { role: 'system', content: 'You are Anuna, a concise motivational wellness coach. Provide unique, helpful responses.' },
      ];
      if (/\bweather\b/i.test(messageText)) {
        const weather = await fetchWeather();
        if (weather) {
          messages.push({ role: 'system', content: `Context: ${weather}. Include this live data in your answer.` });
        } else {
          console.log('[Coach] Weather lookup failed or no key');
        }
      }
      messages.push({ role: 'user', content: messageText });
      const result = await aiChat.mutateAsync({ messages });
      
      console.log('[Coach] AI response received:', result);
      const reply = (result?.completion as string)?.trim() || generateSmartResponse(messageText).text;
      
      if (reply && reply !== 'Anuna is thinking...') {
        const e = detectEmotion(reply);
        addChatMessage({ 
          text: reply, 
          isUser: false, 
          quickActions: ['Set Mini Goal'], 
          emotion: e.emotion, 
          visualEmoji: e.emoji, 
          messageColor: e.color 
        });
        setTimeout(() => { void speakCoachMessage(reply); }, 200);
      } else {
        throw new Error('Empty or invalid response');
      }
    } catch (err) {
      console.log('[Coach] sendMessage error', err);
      const smartResponse = generateSmartResponse(messageText);
      const e = detectEmotion(smartResponse.text);
      addChatMessage({ 
        text: smartResponse.text, 
        isUser: false, 
        quickActions: smartResponse.quickActions || [], 
        emotion: e.emotion, 
        visualEmoji: e.emoji, 
        messageColor: e.color 
      });
      setTimeout(() => { void speakCoachMessage(smartResponse.text); }, 200);
    } finally {
      stopTypingAnimation();
    }
  };

  const handleClearChat = () => {
    Alert.alert('Clear Chat History', 'Are you sure you want to clear all chat messages?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearChatHistory },
    ]);
  };

  const startSoundWaveAnimation = useCallback(() => {
    const animations = soundWaveAnimations.map((anim, index) =>
      Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 300 + index * 100, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300 + index * 100, useNativeDriver: true }),
      ]))
    );
    animations.forEach(a => a.start());
  }, [soundWaveAnimations]);
  const stopSoundWaveAnimation = useCallback(() => {
    soundWaveAnimations.forEach(anim => { anim.stopAnimation(); anim.setValue(0); });
  }, [soundWaveAnimations]);

  useEffect(() => {
    if (isListening || isSpeaking) startSoundWaveAnimation(); else stopSoundWaveAnimation();
  }, [isListening, isSpeaking, startSoundWaveAnimation, stopSoundWaveAnimation]);

  const openListeningModal = () => setListeningModalVisible(true);
  const closeListeningModal = () => setListeningModalVisible(false);

  const detectHeyAnunaInText = (text: string) => {
    try {
      const matched = /\bhey\s+anuna\b/i.test(text ?? '');
      console.log('[Coach] wake regex match:', matched, text);
      return matched;
    } catch (e) { console.log('[Coach] detect error', e); return false; }
  };

  const startWakeDetectionWeb = useCallback(() => {
    try {
      if (Platform.OS !== 'web') return;
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!SpeechRecognition) return;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onstart = () => { console.log('[Coach] wake WEB started'); setIsListening(true); };
      recognition.onresult = (event: any) => {
        try {
          const last = event.results[event.results.length - 1];
          const transcript = last && last[0] && typeof last[0].transcript === 'string' ? last[0].transcript : '';
          if (detectHeyAnunaInText(transcript)) {
            console.log('[Coach] wake detected (web)');
            recognition.stop();
            setIsListening(false);
            openListeningModal();
            setTimeout(() => startSpeechCaptureWeb(), 300);
          }
        } catch (e) { console.log('[Coach] wake web parse error', e); }
      };
      recognition.onerror = (ev: any) => { console.log('[Coach] wake web error', ev?.error); setIsListening(false); };
      recognition.onend = () => {
        setIsListening(false);
        if (wakeWordEnabled) {
          try { recognition.start(); } catch (e) { console.log('[Coach] restart wake web failed', e); }
        }
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) { console.log('[Coach] startWakeDetectionWeb error', e); }
  }, [wakeWordEnabled]);

  const startSpeechCaptureWeb = () => {
    try {
      if (Platform.OS !== 'web') return;
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!SpeechRecognition) { Alert.alert('Speech not supported'); closeListeningModal(); return; }
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onstart = () => { setIsListening(true); };
      recognition.onresult = async (event: any) => {
        try {
          const transcript = event.results[0][0].transcript as string;
          setIsListening(false);
          closeListeningModal();
          await handleVoiceQuery(transcript);
        } catch (e) { console.log('[Coach] web capture onresult error', e); }
      };
      recognition.onerror = (ev: any) => { console.log('[Coach] web capture error', ev?.error); setIsListening(false); closeListeningModal(); };
      recognition.onend = () => { setIsListening(false); closeListeningModal(); };
      recognition.start();
    } catch (e) { console.log('[Coach] startSpeechCaptureWeb error', e); closeListeningModal(); }
  };

  const recordingRef = useRef<Audio.Recording | null>(null);

  const uploadToAssemblyAIAndTranscribe = useCallback(async (apiKey: string, blob: Blob): Promise<string> => {
    try {
      console.log('[Coach][AAI] Uploading blob size', blob.size);
      const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: { Authorization: apiKey },
        body: blob,
      });
      if (!uploadRes.ok) {
        console.log('[Coach][AAI] upload failed', uploadRes.status);
        throw new Error('upload-failed');
      }
      const uploadJson = await uploadRes.json();
      const audioUrl: string = uploadJson?.upload_url ?? uploadJson?.url ?? '';
      if (!audioUrl) throw new Error('no-upload-url');
      const createRes = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_url: audioUrl }),
      });
      if (!createRes.ok) throw new Error('create-failed');
      const createJson = await createRes.json();
      const id: string = createJson?.id ?? '';
      if (!id) throw new Error('no-id');
      const started = Date.now();
      while (Date.now() - started < 60000) {
        await new Promise(r => setTimeout(r, 1500));
        const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, { headers: { Authorization: apiKey } });
        const pjson = await poll.json();
        const status: string = pjson?.status ?? '';
        console.log('[Coach][AAI] poll status', status);
        if (status === 'completed') return (pjson?.text as string) || '';
        if (status === 'error') throw new Error(pjson?.error || 'transcription-error');
      }
      throw new Error('timeout');
    } catch (e) {
      console.log('[Coach][AAI] transcribe error', e);
      throw e;
    }
  }, []);

  const transcribeMobileWithAssembly = useCallback(async (apiKey: string, fileUri: string): Promise<string> => {
    try {
      console.log('[Coach][AAI] Mobile upload', fileUri);
      const result = await FileSystem.uploadAsync('https://api.assemblyai.com/v2/upload', fileUri, {
        httpMethod: 'POST',
        headers: { Authorization: apiKey },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });
      if (result.status < 200 || result.status >= 300) {
        console.log('[Coach][AAI] uploadAsync failed', result.status, result.body?.slice(0, 200));
        throw new Error('upload-failed');
      }
      const uploadJson = JSON.parse(result.body || '{}');
      const audioUrl: string = uploadJson?.upload_url ?? uploadJson?.url ?? '';
      if (!audioUrl) throw new Error('no-upload-url');
      const createRes = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_url: audioUrl }),
      });
      if (!createRes.ok) throw new Error('create-failed');
      const createJson = await createRes.json();
      const id: string = createJson?.id ?? '';
      if (!id) throw new Error('no-id');
      const started = Date.now();
      while (Date.now() - started < 60000) {
        await new Promise(r => setTimeout(r, 1500));
        const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, { headers: { Authorization: apiKey } });
        const pjson = await poll.json();
        const status: string = pjson?.status ?? '';
        console.log('[Coach][AAI] poll status', status);
        if (status === 'completed') return (pjson?.text as string) || '';
        if (status === 'error') throw new Error(pjson?.error || 'transcription-error');
      }
      throw new Error('timeout');
    } catch (e) {
      console.log('[Coach][AAI] mobile transcribe error', e);
      throw e;
    }
  }, []);

  const startWakeDetectionMobile = useCallback(async () => {
    try {
      if (Platform.OS === 'web') return;
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('Grant mic access'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      recordingRef.current = rec;
      try {
        // @ts-ignore preset exists in Expo Go
        await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      } catch {}
      await rec.startAsync();
      setIsListening(true);
      setTimeout(async () => {
        try {
          await rec.stopAndUnloadAsync();
        } catch {}
        setIsListening(false);
        const uri = rec.getURI();
        if (!uri) return;
        const formData = new FormData();
        const fileType = uri.split('.').pop() || 'm4a';
        formData.append('audio', { uri, name: `wake.${fileType}`, type: `audio/${fileType}` } as any);
        const res = await fetch('https://toolkit.rork.com/stt/transcribe/', { method: 'POST', body: formData });
        if (!res.ok) { console.log('[Coach] wake STT failed', res.status); return; }
        const json = await res.json();
        const text: string = json?.text ?? '';
        if (detectHeyAnunaInText(text)) {
          openListeningModal();
          setTimeout(() => { void startSpeechCaptureMobile(); }, 300);
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      }, 3500);
    } catch (e) { console.log('[Coach] startWakeDetectionMobile error', e); setIsListening(false); }
  }, []);

  const startSpeechCaptureMobile = useCallback(async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('Grant mic access'); closeListeningModal(); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      try {
        await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY as any);
      } catch {}
      await rec.startAsync();
      setIsListening(true);
      setTimeout(async () => {
        try { await rec.stopAndUnloadAsync(); } catch {}
        setIsListening(false);
        const uri = rec.getURI();
        if (!uri) { closeListeningModal(); return; }
        const fileType = uri.split('.').pop() || 'm4a';
        const formData = new FormData();
        formData.append('audio', { uri, name: `query.${fileType}`, type: `audio/${fileType}` } as any);
        const res = await fetch('https://toolkit.rork.com/stt/transcribe/', { method: 'POST', body: formData });
        if (!res.ok) { Alert.alert('Voice', 'Could not transcribe'); closeListeningModal(); return; }
        const json = await res.json();
        const transcript: string = json?.text ?? '';
        closeListeningModal();
        await handleVoiceQuery(transcript);
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      }, 6000);
    } catch (e) { console.log('[Coach] startSpeechCaptureMobile error', e); setIsListening(false); closeListeningModal(); }
  }, []);


  const aiChat = trpc.ai.chat.useMutation();

  const handleVoiceQuery = async (transcript: string) => {
    try {
      if (!transcript || !transcript.trim()) return;
      console.log('[Coach] Voice query:', transcript);
      
      addChatMessage({ text: transcript.trim(), isUser: true });

      if (await handleIntentFlow(transcript)) {
        return;
      }

      startTypingAnimation();
      
      const voiceMessages: any[] = [ { role: 'system', content: 'You are Anuna, a concise motivational wellness coach. Provide unique, helpful responses.' } ];
      if (/\bweather\b/i.test(transcript)) {
        const weather = await fetchWeather();
        if (weather) voiceMessages.push({ role: 'system', content: `Context: ${weather}. Include this live data in your answer.` });
      }
      voiceMessages.push({ role: 'user', content: transcript.trim() });
      const result = await aiChat.mutateAsync({ messages: voiceMessages });
      
      console.log('[Coach] Voice AI response:', result);
      const reply = (result?.completion as string)?.trim() || generateSmartResponse(transcript).text;
      
      if (reply && reply !== 'Anuna is thinking...') {
        const e = detectEmotion(reply);
        addChatMessage({ 
          text: reply, 
          isUser: false, 
          quickActions: ['Set Mini Goal'], 
          emotion: e.emotion, 
          visualEmoji: e.emoji, 
          messageColor: e.color 
        });
        setTimeout(() => { void speakCoachMessage(reply); }, 200);
      } else {
        const smartResponse = generateSmartResponse(transcript);
        const e = detectEmotion(smartResponse.text);
        addChatMessage({ 
          text: smartResponse.text, 
          isUser: false, 
          quickActions: smartResponse.quickActions || [], 
          emotion: e.emotion, 
          visualEmoji: e.emoji, 
          messageColor: e.color 
        });
        setTimeout(() => { void speakCoachMessage(smartResponse.text); }, 200);
      }
    } catch (e) {
      console.log('[Coach] handleVoiceQuery error', e);
      const smartResponse = generateSmartResponse(transcript);
      const emotion = detectEmotion(smartResponse.text);
      addChatMessage({ 
        text: smartResponse.text, 
        isUser: false, 
        quickActions: smartResponse.quickActions || [], 
        emotion: emotion.emotion, 
        visualEmoji: emotion.emoji, 
        messageColor: emotion.color 
      });
      setTimeout(() => { void speakCoachMessage(smartResponse.text); }, 200);
    } finally { 
      stopTypingAnimation(); 
    }
  };

  const handleManualMic = useCallback(async () => {
    try {
      if ((assemblyAiApiKey ?? '').trim().length === 0) {
        Alert.alert('Voice', 'Enter your AssemblyAI API key in Settings to use STT. Falling back to device STT.');
        if (Platform.OS === 'web') startSpeechCaptureWeb(); else void startSpeechCaptureMobile();
        return;
      }
      const key = (assemblyAiApiKey ?? '').trim();
      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
        recorder.onstop = async () => {
          try {
            stream.getTracks().forEach(t => t.stop());
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const text = await uploadToAssemblyAIAndTranscribe(key, blob);
            if (!text) throw new Error('no-text');
            await handleVoiceQuery(text);
          } catch (e) {
            console.log('[Coach] web AAI mic error', e);
            Alert.alert('STT Error', 'Failed to transcribe. Check API key.');
          } finally {
            setIsListening(false);
          }
        };
        recorder.start();
        setIsListening(true);
        setTimeout(() => { try { recorder.stop(); } catch {} }, 6000);
      } else {
        const perm = await Audio.requestPermissionsAsync();
        if (!perm.granted) { Alert.alert('Grant mic access'); return; }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const rec = new Audio.Recording();
        try { await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY as any); } catch {}
        await rec.startAsync();
        setIsListening(true);
        setTimeout(async () => {
          try { await rec.stopAndUnloadAsync(); } catch {}
          setIsListening(false);
          const uri = rec.getURI();
          if (!uri) return;
          try {
            const text = await transcribeMobileWithAssembly(key, uri);
            if (!text) throw new Error('no-text');
            await handleVoiceQuery(text);
          } catch (e) {
            console.log('[Coach] mobile AAI mic error', e);
            Alert.alert('STT Error', 'Transcription failed. Invalid API key?');
          } finally {
            try { await Audio.setAudioModeAsync({ allowsRecordingIOS: false }); } catch {}
          }
        }, 6000);
      }
    } catch (e) {
      console.log('[Coach] handleManualMic error', e);
      Alert.alert('STT Error', 'Could not access microphone.');
      setIsListening(false);
    }
  }, [assemblyAiApiKey, startSpeechCaptureWeb, startSpeechCaptureMobile, uploadToAssemblyAIAndTranscribe, transcribeMobileWithAssembly, handleVoiceQuery]);

  useEffect(() => {
    if (!wakeWordEnabled) return;
    if (Platform.OS === 'web') startWakeDetectionWeb(); else void startWakeDetectionMobile();
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active' && wakeWordEnabled) {
        if (Platform.OS === 'web') startWakeDetectionWeb(); else void startWakeDetectionMobile();
      }
    });
    return () => { try { sub.remove(); } catch {} try { recognitionRef.current?.stop?.(); } catch {} };
  }, [wakeWordEnabled, startWakeDetectionWeb, startWakeDetectionMobile]);

  useEffect(() => {
    if (chatMessages.length === 0) {
      setTimeout(() => {
        const name = userProfile.name || 'Phoenix Warrior';
        const text = `🔥 Welcome, ${name}! I'm Anuna. What would you like to talk about today?`;
        const e = detectEmotion(text);
        addChatMessage({ text, isUser: false, quickActions: ['How does this work?', 'I need motivation'], emotion: e.emotion, visualEmoji: e.emoji, messageColor: e.color });
      }, 400);
    }
  }, [chatMessages.length, userProfile.name, addChatMessage]);

  const renderMessage = (message: any) => {
    const isUser = !!message.isUser;
    return (
      <View key={message.id} style={[styles.messageContainer, isUser ? styles.userMessage : styles.phoenixMessage]}>
        {!isUser && (
          <View style={[styles.phoenixAvatar, message.messageColor && { backgroundColor: `${message.messageColor}30`, borderWidth: 2, borderColor: `${message.messageColor}60` }]}>
            <Text style={styles.phoenixAvatarText}>{message.visualEmoji || '🔥'}</Text>
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? { backgroundColor: theme.primary } : { backgroundColor: theme.card }]}> 
          <View style={styles.messageContent}>
            <Text style={[styles.messageText, { color: theme.text }]}>{message.text}</Text>
            {!isUser && (
              <TouchableOpacity testID="speak-msg" style={[styles.speakButton, isSpeaking && styles.speakButtonActive]} onPress={() => {
                if (isSpeaking) {
                  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    try { window.speechSynthesis.cancel(); } catch (e) { console.log('[Coach] speech cancel error', e); }
                  }
                  setIsSpeaking(false);
                } else {
                  void speakCoachMessage(message.text);
                }
              }}>
                {isSpeaking ? <VolumeX size={16} color={theme.primary} /> : <Volume2 size={16} color={theme.primary} />}
              </TouchableOpacity>
            )}
          </View>
          {Array.isArray(message.quickActions) && message.quickActions.length > 0 && (
            <View style={styles.quickActionsContainer}>
              {message.quickActions.map((action: string, idx: number) => (
                <TouchableOpacity key={idx} testID={`quick-${idx}`} style={[styles.quickActionButton, { borderColor: theme.primary }]}
                  onPress={() => sendMessage(action)}>
                  <Text style={[styles.quickActionText, { color: theme.primary }]}>{action}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {isUser && (
          <View style={[styles.userAvatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.userAvatarText}>{userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}</Text>
          </View>
        )}
      </View>
    );
  };

  useEffect(() => {
    setTimeout(() => { try { scrollViewRef.current?.scrollToEnd({ animated: true }); } catch {} }, 100);
  }, [chatMessages, isTyping]);

  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <LinearGradient colors={[theme.background, theme.secondary]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.phoenixIcon}><Flame size={24} color={theme.primary} /></View>
            <View>
              <Text testID="coach-header-title" style={[styles.headerTitle, { color: theme.text }]}>Anuna Coach</Text>
              <Text style={[styles.headerSubtitle, { color: theme.text, opacity: 0.7 }]}>{isListening ? 'Listening' : 'Your AI Life Coach'}</Text>
            </View>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity testID="coach-header-clear" style={styles.headerBtn} onPress={handleClearChat}>
              <RotateCcw size={20} color={theme.text} />
            </TouchableOpacity>
            <View style={[styles.headerMicDot, { backgroundColor: isListening ? theme.primary : 'transparent', borderColor: theme.primary }]}>
              <Mic size={14} color={isListening ? 'white' : theme.primary} />
            </View>
          </View>
        </View>

        <ScrollView ref={scrollViewRef} style={styles.chatContainer} contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false}>
          {chatMessages.map(renderMessage)}
          {isTyping && (
            <View style={[styles.messageContainer, styles.phoenixMessage]}>
              <View style={styles.phoenixAvatar}><Text style={styles.phoenixAvatarText}>🔥</Text></View>
              <View style={[styles.messageBubble, { backgroundColor: theme.card }]}>
                <View style={styles.typingContainer}>
                  <Animated.View style={[styles.typingDot, { opacity: typingAnimation }]} />
                  <Animated.View style={[styles.typingDot, { opacity: typingAnimation }]} />
                  <Animated.View style={[styles.typingDot, { opacity: typingAnimation }]} />
                </View>
                <Text style={[styles.typingText, { color: theme.text }]}>Anuna is thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: theme.text, borderColor: theme.primary }]}
            placeholder="Ask Anuna..."
            placeholderTextColor={`${theme.text}80`}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage()}
            blurOnSubmit={false}
          />
          <TouchableOpacity testID="coach-mic" style={[styles.voiceButton, { backgroundColor: isListening ? theme.primary : 'rgba(255,255,255,0.1)', borderColor: theme.primary }]} onPress={() => {
            void handleManualMic();
          }}>
            {isListening ? (
              <View style={styles.listeningIndicator}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Animated.View key={index} style={[styles.soundWave, { backgroundColor: 'white', transform: [{ scaleY: soundWaveAnimations[index].interpolate({ inputRange: [0,1], outputRange: [0.3,1.5] }) }] }]} />
                ))}
              </View>
            ) : (
              <Mic size={20} color={theme.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity testID="coach-send" style={[styles.sendButton, { backgroundColor: theme.primary }]} disabled={!inputText.trim() || isTyping} onPress={() => sendMessage()}>
            <Send size={20} color="white" />
          </TouchableOpacity>
        </View>

        <Modal visible={listeningModalVisible} animationType="fade" transparent onRequestClose={closeListeningModal}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.listeningModal, { backgroundColor: theme.card, borderColor: theme.primary }]}>
              <Mic size={24} color={theme.primary} />
              <Text style={[styles.modalTitle, { color: theme.text }]}>Anuna is listening...</Text>
              <Text style={[styles.modalSubtitle, { color: theme.text, opacity: 0.8 }]}>Speak your message</Text>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

class CoachErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: unknown }> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error: unknown) { return { hasError: true, error }; }
  componentDidCatch(error: unknown, info: any) { console.log('[Coach] ErrorBoundary caught', { error, info }); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text testID="coach-error" style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>Something went wrong in Coach. Please try again.</Text>
        </View>
      );
    }
    return this.props.children as any;
  }
}

function PhoenixCoachScreen() {
  return (
    <CoachErrorBoundary>
      <PhoenixCoach />
    </CoachErrorBoundary>
  );
}

export default React.memo(PhoenixCoachScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  phoenixIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 69, 0, 0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: { minWidth: 60, minHeight: 60, padding: 12, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  headerMicDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  chatContainer: { flex: 1, paddingHorizontal: 15 },
  chatContent: { paddingVertical: 20 },
  messageContainer: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
  userMessage: { justifyContent: 'flex-end' },
  phoenixMessage: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '75%', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 20, marginHorizontal: 8 },
  messageContent: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  messageText: { fontSize: 16, lineHeight: 22, flex: 1 },
  speakButton: { marginLeft: 8, padding: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  speakButtonActive: { backgroundColor: 'rgba(255, 69, 0, 0.3)' },
  phoenixAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 69, 0, 0.2)', alignItems: 'center', justifyContent: 'center' },
  phoenixAvatarText: { fontSize: 16 },
  userAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  quickActionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 },
  quickActionButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  quickActionText: { fontSize: 12, fontWeight: '500' },
  typingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4500', marginRight: 4 },
  typingText: { fontSize: 12, fontStyle: 'italic', opacity: 0.7 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 15, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  textInput: { flex: 1, borderWidth: 1, borderRadius: 25, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, maxHeight: 100, marginRight: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  voiceButton: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1 },
  listeningIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  soundWave: { width: 3, height: 12, borderRadius: 1.5 },
  sendButton: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: '#FF4500', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  listeningModal: { width: '100%', maxWidth: 360, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1 },
  modalTitle: { marginTop: 10, fontSize: 16, fontWeight: '600' },
  modalSubtitle: { marginTop: 6, fontSize: 13 },
});