import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Flame, RotateCcw, Volume2, Mic, Settings, Play, VolumeX, Radio } from 'lucide-react-native';
import { useWellness } from '@/providers/WellnessProvider';
import { Audio } from 'expo-av';



interface SmartResponse {
  text: string;
  quickActions?: string[];
  voiceType?: 'victory' | 'stress' | 'motivation' | 'default';
  emotion?: 'celebration' | 'comfort' | 'motivation' | 'default';
  visualEmoji?: string;
  messageColor?: string;
}

interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  rate: number;
  pitch: number;
  volume: number;
  voiceIndex?: number;
}

interface VoiceSettings {
  currentProfile: string;
  customRate: number;
  customPitch: number;
  customVolume: number;
  soundEffectsEnabled: boolean;
  backgroundMusicEnabled: boolean;
  autoSpeakEnabled: boolean;
  voiceModeEnabled: boolean;
  wakeWordEnabled: boolean;
  emotionalIntelligenceEnabled: boolean;
}

function PhoenixCoach() {
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
  } = useWellness();

  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [isWaitingForWakeWord, setIsWaitingForWakeWord] = useState(false);
  const [isWakeRecording, setIsWakeRecording] = useState<boolean>(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const wakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<'celebration' | 'comfort' | 'motivation' | 'default'>('default');
  const [emotionEmoji, setEmotionEmoji] = useState('🔥');
  const [selectedVoice, setSelectedVoice] = useState('default');
  const soundWaves = [0, 0, 0, 0, 0];
  const scrollViewRef = useRef<ScrollView>(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;
  const wakeWordHandlerRef = useRef<((e: any) => void) | null>(null);
  const recognitionRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wakeWordRecognitionRef = useRef<any>(null);
  const soundWaveAnimations = useRef(Array.from({ length: 5 }, () => new Animated.Value(0))).current;

  // Voice Profiles
  const voiceProfiles: VoiceProfile[] = [
    {
      id: 'motivator',
      name: 'Phoenix Motivator',
      description: 'Enthusiastic female voice for motivation',
      rate: 1.1,
      pitch: 1.2,
      volume: 1.0,
    },
    {
      id: 'calm',
      name: 'Calm Phoenix',
      description: 'Soothing voice for meditation and stress',
      rate: 0.9,
      pitch: 0.9,
      volume: 0.9,
    },
    {
      id: 'drill',
      name: 'Drill Sergeant Phoenix',
      description: 'Strong, commanding voice for tough love',
      rate: 1.0,
      pitch: 0.8,
      volume: 1.0,
    },
    {
      id: 'friend',
      name: 'Friend Phoenix',
      description: 'Casual, warm voice like a supportive friend',
      rate: 1.0,
      pitch: 1.0,
      volume: 0.95,
    },
  ];

  // Load voice settings from localStorage
  const loadVoiceSettings = (): VoiceSettings => {
    if (Platform.OS === 'web') {
      const saved = localStorage.getItem('phoenixVoiceSettings');
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return {
      currentProfile: 'motivator',
      customRate: 1.0,
      customPitch: 1.0,
      customVolume: 1.0,
      soundEffectsEnabled: true,
      backgroundMusicEnabled: false,
      autoSpeakEnabled: true,
      voiceModeEnabled: false,
      wakeWordEnabled: false,
      emotionalIntelligenceEnabled: true,
    };
  };

  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(loadVoiceSettings());

  // Initialize selected voice
  useEffect(() => {
    setSelectedVoice(loadSelectedVoice());
  }, []);

  // Save voice settings to localStorage
  const saveVoiceSettings = (settings: VoiceSettings) => {
    setVoiceSettings(settings);
    if (Platform.OS === 'web') {
      localStorage.setItem('phoenixVoiceSettings', JSON.stringify(settings));
    }
  };

  const suggestedQuestions = [
    "How can I stay motivated?",
    "I'm craving junk food",
    "I broke my streak",
    "Need workout ideas",
    "Feeling stressed",
  ];

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  // Emotion Detection Function
  const detectEmotion = (message: string): { emotion: 'celebration' | 'comfort' | 'motivation' | 'default', emoji: string, color: string } => {
    const lowerMessage = message.toLowerCase();
    
    // Celebration/Success patterns
    if (lowerMessage.includes('congratulations') || 
        lowerMessage.includes('amazing') || 
        lowerMessage.includes('incredible') ||
        lowerMessage.includes('fantastic') ||
        lowerMessage.includes('crushing it') ||
        lowerMessage.includes('well done') ||
        lowerMessage.includes('proud of you') ||
        lowerMessage.includes('victory') ||
        lowerMessage.includes('achievement')) {
      return { emotion: 'celebration', emoji: '🎉', color: '#FFD700' };
    }
    
    // Comfort/Support patterns
    if (lowerMessage.includes('sorry') || 
        lowerMessage.includes('tough') ||
        lowerMessage.includes('difficult') ||
        lowerMessage.includes('understand') ||
        lowerMessage.includes('here for you') ||
        lowerMessage.includes('it\'s okay') ||
        lowerMessage.includes('take your time') ||
        lowerMessage.includes('gentle') ||
        lowerMessage.includes('breathe')) {
      return { emotion: 'comfort', emoji: '💙', color: '#87CEEB' };
    }
    
    // Motivation/Push patterns
    if (lowerMessage.includes('you can do') || 
        lowerMessage.includes('push yourself') ||
        lowerMessage.includes('don\'t give up') ||
        lowerMessage.includes('keep going') ||
        lowerMessage.includes('rise up') ||
        lowerMessage.includes('transform') ||
        lowerMessage.includes('phoenix') ||
        lowerMessage.includes('stronger') ||
        lowerMessage.includes('power')) {
      return { emotion: 'motivation', emoji: '💪', color: '#FF4500' };
    }
    
    return { emotion: 'default', emoji: '🔥', color: '#FF4500' };
  };

  // Enhanced Voice Emotion Function
  const getVoiceEmotion = (message: string, baseEmotion?: string) => {
    if (!voiceSettings.emotionalIntelligenceEnabled) {
      return { pitch: 1.0, rate: 1.0, volume: 1.0 };
    }

    const detectedEmotion = detectEmotion(message);
    
    switch (detectedEmotion.emotion) {
      case 'celebration':
        return { pitch: 1.3, rate: 1.2, volume: 1.0 };
      case 'comfort':
        return { pitch: 0.9, rate: 0.8, volume: 0.8 };
      case 'motivation':
        return { pitch: 1.1, rate: 1.1, volume: 1.0 };
      default:
        return { pitch: 1.0, rate: 1.0, volume: 1.0 };
    }
  };



  const getLevel = useCallback(() => {
    return Math.floor(phoenixPoints / 100) + 1;
  }, [phoenixPoints]);

  const generateSmartResponse = useCallback((message: string): SmartResponse => {
    const lowerMessage = message.toLowerCase();
    const userName = userProfile.name || 'Phoenix Warrior';
    const timeOfDay = getTimeOfDay();
    const level = getLevel();
    const totalStreakDays = Object.values(streaks).reduce((sum, days) => sum + days, 0);
    const activeGoals = goals.filter(g => !g.completed).length;
    const completedGoals = goals.filter(g => g.completed).length;
    const recentJournal = journalEntries[0];

    // Craving responses
    if (lowerMessage.includes('craving') || lowerMessage.includes('want to eat') || lowerMessage.includes('hungry')) {
      const responses = [
        `I see you're having cravings, ${userName}. Let's try the 5-minute rule - wait 5 minutes and drink water. Your current streak is ${totalStreakDays} days - you're stronger than this craving! 🔥`,
        `${userName}, cravings are temporary but your progress is permanent! You've earned ${phoenixPoints} Phoenix Points. Try some carrots or go for a quick walk instead. 💪`,
        `Hey ${userName}! Remember why you started: "${userProfile.motivation}". This craving will pass in 10-15 minutes. You've got this! 🌟`,
      ];
      const responseText = responses[Math.floor(Math.random() * responses.length)];
      const emotionData = detectEmotion(responseText);
      const response = {
        text: responseText,
        quickActions: ['Log Healthy Snack', 'Start 5-Min Timer', 'Journal Craving'],
        voiceType: 'stress' as const,
        emotion: emotionData.emotion,
        visualEmoji: emotionData.emoji,
        messageColor: emotionData.color
      };
      return response;
    }

    // Failure/setback responses
    if (lowerMessage.includes('broke') || lowerMessage.includes('failed') || lowerMessage.includes('messed up') || lowerMessage.includes('relapsed')) {
      const responses = [
        `Remember, phoenixes rise from ashes! One setback doesn't erase your progress, ${userName}. You've already completed ${completedGoals} goals and maintained ${totalStreakDays} days of good habits. What matters is getting back up. 🔥`,
        `${userName}, falling is not failing - not getting up is! You're at Level ${level} with ${phoenixPoints} Phoenix Points. Every phoenix has burned before rising stronger. Let's start fresh right now! ✨`,
        `Hey ${userName}, I see you're being hard on yourself. You've shown incredible strength before - you can do it again. What's one small positive action you can take right now? 💫`,
      ];
      const responseText = responses[Math.floor(Math.random() * responses.length)];
      const emotionData = detectEmotion(responseText);
      return {
        text: responseText,
        quickActions: ['Reset Streak', 'Set New Goal', 'Journal Feelings'],
        voiceType: 'motivation' as const,
        emotion: emotionData.emotion,
        visualEmoji: emotionData.emoji,
        messageColor: emotionData.color
      };
    }

    // Motivation responses
    if (lowerMessage.includes('motivation') || lowerMessage.includes('unmotivated') || lowerMessage.includes('give up')) {
      const responses = [
        `${userName}, remember why you started: "${userProfile.motivation}". You've earned ${phoenixPoints} Phoenix Points and you're at Level ${level}. Every small step counts! 🚀`,
        `Look how far you've come, ${userName}! ${todaysMeals} meals tracked today, ${todaysSupplements} supplements taken, and ${activeGoals} active goals. You're literally transforming! 🔥`,
        `${userName}, motivation gets you started, but habit keeps you going. You've built ${totalStreakDays} days of streaks - that's pure discipline! What's the tiniest step you could take right now? 💪`,
      ];
      const responseText = responses[Math.floor(Math.random() * responses.length)];
      const emotionData = detectEmotion(responseText);
      return {
        text: responseText,
        quickActions: ['View Progress', 'Set Mini Goal', 'Read Wins'],
        voiceType: 'motivation' as const,
        emotion: emotionData.emotion,
        visualEmoji: emotionData.emoji,
        messageColor: emotionData.color
      };
    }

    // Stress/anxiety responses
    if (lowerMessage.includes('stressed') || lowerMessage.includes('anxiety') || lowerMessage.includes('overwhelmed')) {
      const responses = [
        `Let's pause together, ${userName}. Try this: Breathe in for 4, hold for 4, out for 4. Repeat 3 times. ${recentJournal ? `Your journal shows you've overcome stress before on ${recentJournal.date.toDateString()}. What helped then?` : 'You have the strength to handle this.'} 🌸`,
        `${userName}, stress is temporary but your resilience is permanent. You're at Level ${level} - that shows real mental strength! Let's break this down into smaller pieces. 🧘‍♀️`,
        `I hear you, ${userName}. When we're stressed, our phoenix energy gets scattered. Let's gather it back. What's one thing you can control right now? 🔥`,
      ];
      const responseText = responses[Math.floor(Math.random() * responses.length)];
      const emotionData = detectEmotion(responseText);
      return {
        text: responseText,
        quickActions: ['Start Breathing', 'Journal Now', 'List 3 Wins'],
        voiceType: 'stress' as const,
        emotion: emotionData.emotion,
        visualEmoji: emotionData.emoji,
        messageColor: emotionData.color
      };
    }

    // Workout/exercise responses
    if (lowerMessage.includes('workout') || lowerMessage.includes('exercise') || lowerMessage.includes('fitness')) {
      const workouts = [
        '20 push-ups, 30 squats, 1-minute plank',
        '10-minute walk or jog',
        '5-minute dance session to your favorite song',
        '15 burpees, 20 jumping jacks, 25 crunches',
        'Yoga flow: downward dog, warrior pose, child\'s pose (5 mins)',
      ];
      const workout = workouts[Math.floor(Math.random() * workouts.length)];
      const responseText = `Great question, ${userName}! Here's a quick workout for you: ${workout}. Remember, you're building your phoenix body - strong and resilient! 💪🔥`;
      const emotionData = detectEmotion(responseText);
      return {
        text: responseText,
        quickActions: ['Start Workout', 'Set Fitness Goal', 'Track Exercise'],
        voiceType: 'motivation' as const,
        emotion: emotionData.emotion,
        visualEmoji: emotionData.emoji,
        messageColor: emotionData.color
      };
    }

    // Time-based greetings
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      const greetings = {
        morning: `Good morning, ${userName}! Ready to rise today? You have ${activeGoals} goals to work on and you're at Level ${level}! 🌅🔥`,
        afternoon: `Good afternoon, ${userName}! How's your phoenix transformation going? You've earned ${phoenixPoints} points so far! ⭐`,
        evening: `Good evening, ${userName}! Time to reflect and log your progress. You've had ${todaysMeals} meals and ${todaysSupplements} supplements today! 🌙`,
      };
      const responseText = greetings[timeOfDay as keyof typeof greetings];
      const emotionData = detectEmotion(responseText);
      return {
        text: responseText,
        quickActions: ['View Today', 'Check Goals', 'Quick Journal'],
        voiceType: 'default' as const,
        emotion: emotionData.emotion,
        visualEmoji: emotionData.emoji,
        messageColor: emotionData.color
      };
    }

    // Default responses
    const defaultResponses = [
      `I'm here to support your phoenix journey, ${userName}! You're at Level ${level} with ${phoenixPoints} Phoenix Points. What's on your mind? 🔥`,
      `${userName}, every conversation with me is a step toward your transformation. You've got ${totalStreakDays} streak days - that's incredible! How can I help? ✨`,
      `Hey ${userName}! Remember, you're not just changing habits - you're becoming the phoenix version of yourself. What challenge can we tackle together? 💪`,
      `${userName}, your journey of ${phoenixPoints} Phoenix Points shows real dedication. I'm here to help you rise even higher! What's your question? 🚀`,
    ];

    const responseText = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    const emotionData = detectEmotion(responseText);
    return {
      text: responseText,
      quickActions: ['View Stats', 'Set Goal', 'Quick Check-in'],
      voiceType: 'default' as const,
      emotion: emotionData.emotion,
      visualEmoji: emotionData.emoji,
      messageColor: emotionData.color
    };
  }, [userProfile, phoenixPoints, goals, streaks, todaysMeals, todaysSupplements, journalEntries, getLevel]);

  const startTypingAnimation = () => {
    setIsTyping(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(typingAnimation, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopTypingAnimation = () => {
    setIsTyping(false);
    typingAnimation.stopAnimation();
    typingAnimation.setValue(0);
  };

  const sendMessage = async (text?: string) => {
    // Get text from input if not provided
    const messageText = text || inputText || '';
    if (!messageText.trim()) return;

    // Add user message
    addChatMessage({
      text: messageText.trim(),
      isUser: true,
    });

    // Clear input and maintain focus
    if (inputRef.current) {
      inputRef.current.clear();
      inputRef.current.focus();
    }
    setInputText('');
    startTypingAnimation();

    // Simulate thinking time
    setTimeout(() => {
      const response = generateSmartResponse(messageText);
      
      // Update emotion state for visual feedback
      if (response.emotion) {
        setCurrentEmotion(response.emotion);
        setEmotionEmoji(response.visualEmoji || '🔥');
      }
      
      // Add Phoenix response
      addChatMessage({
        text: response.text,
        isUser: false,
        quickActions: response.quickActions,
        emotion: response.emotion,
        visualEmoji: response.visualEmoji,
        messageColor: response.messageColor,
      });
      
      // Auto-speak the response if voice is enabled
      if (voiceSettings.autoSpeakEnabled) {
        setTimeout(() => {
          speakCoachMessage(response.text);
        }, 500);
      }
      
      stopTypingAnimation();
    }, 1000 + Math.random() * 1000); // 1-2 seconds
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear all chat messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearChatHistory },
      ]
    );
  };

  // Play sound effects
  const playSoundEffect = (type: 'victory' | 'chime' | 'fire') => {
    if (!voiceSettings.soundEffectsEnabled || Platform.OS !== 'web') return;
    
    // Create audio context for sound effects
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      switch (type) {
        case 'victory':
          // Victory fanfare
          oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
          oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
          oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
          break;
        case 'chime':
          // Gentle chime
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
          break;
        case 'fire':
          // Fire crackling (white noise simulation)
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
          break;
      }
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch {
      console.log('Sound effects not supported');
    }
  };

  // Load selected voice from localStorage
  const loadSelectedVoice = () => {
    if (Platform.OS === 'web') {
      const saved = localStorage.getItem('phoenixSelectedVoice');
      return saved || 'default';
    }
    return 'default';
  };

  // Save selected voice to localStorage
  const saveSelectedVoice = (voice: string) => {
    setSelectedVoice(voice);
    if (Platform.OS === 'web') {
      localStorage.setItem('phoenixSelectedVoice', voice);
    }
  };

  const ANUNA_VOICE_ID = 'ahvd0TWxmVC87GTyJn2P' as const;

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    try {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.length;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return typeof btoa !== 'undefined' ? btoa(binary) : '';
    } catch (e) {
      console.log('[Coach] arrayBufferToBase64 error', e);
      return '';
    }
  };

  // API call function for voice synthesis
  const speakWithAPI = async (text: string) => {
    try {
      const key = (elevenLabsApiKey ?? '').trim();

      if (!key) {
        speakWithBrowser(text);
        return;
      }

      const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${ANUNA_VOICE_ID}`;

      const body = {
        text,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      } as const;

      console.log('[Coach] ElevenLabs request init');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify(body),
      });
      console.log('[Coach] ElevenLabs response', res.status);

      if (!res.ok) {
        console.warn('[Coach] ElevenLabs TTS failed', res.status);
        speakWithBrowser(text);
        return;
      }

      const arrayBuffer = await res.arrayBuffer();

      if (Platform.OS === 'web') {
        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new (window as any).Audio(url);
        audio.play().catch((e: unknown) => console.log('[Coach] web audio play error', e));
        return;
      }

      const base64 = arrayBufferToBase64(arrayBuffer);
      const { sound } = await Audio.Sound.createAsync({ uri: `data:audio/mpeg;base64,${base64}` });
      await sound.playAsync();
    } catch (error) {
      console.log('[Coach] speakWithAPI error, using browser fallback', error);
      speakWithBrowser(text);
    }
  };

  // Browser TTS function
  const speakWithBrowser = (text: string) => {
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Different settings for each "voice" (still using browser TTS)
      if (selectedVoice === 'custom') {
        utterance.pitch = 1.2;
        utterance.rate = 1.0;
        utterance.volume = 1.0;
      } else if (selectedVoice === 'mentor') {
        utterance.pitch = 0.8;
        utterance.rate = 0.9;
        utterance.volume = 1.0;
      } else {
        // Default Phoenix voice
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
        utterance.volume = 1.0;
      }
      
      speechSynthesis.speak(utterance);
    }
  };

  // Function to speak coach messages with voice selection
  const speakCoachMessage = async (text: string) => {
    try {
      const key = (elevenLabsApiKey ?? '').trim();
      if (key) {
        await speakWithAPI(text);
        return;
      }
      speakWithBrowser(text);
    } catch (e) {
      console.log('speakCoachMessage fallback', e);
      speakWithBrowser(text);
    }
  };



  // Enhanced Text-to-Speech function with emotional intelligence
  const speakText = (text: string, messageType?: 'victory' | 'stress' | 'motivation' | 'default') => {
    if (Platform.OS === 'web') {
      // Stop any current speech
      if (currentUtteranceRef.current) {
        speechSynthesis.cancel();
      }
      
      if ('speechSynthesis' in window) {
        const currentProfile = voiceProfiles.find(p => p.id === voiceSettings.currentProfile) || voiceProfiles[0];
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Apply voice personality settings
        let baseRate = currentProfile.rate * voiceSettings.customRate;
        let basePitch = currentProfile.pitch * voiceSettings.customPitch;
        let baseVolume = currentProfile.volume * voiceSettings.customVolume;
        
        // Apply emotional intelligence adjustments
        if (voiceSettings.emotionalIntelligenceEnabled) {
          const emotionAdjustments = getVoiceEmotion(text, messageType);
          baseRate *= emotionAdjustments.rate;
          basePitch *= emotionAdjustments.pitch;
          baseVolume *= emotionAdjustments.volume;
        }
        
        utterance.rate = baseRate;
        utterance.pitch = basePitch;
        utterance.volume = baseVolume;
        
        // Adjust based on message type
        if (messageType === 'victory') {
          utterance.rate *= 1.1;
          utterance.pitch *= 1.1;
          playSoundEffect('victory');
        } else if (messageType === 'stress') {
          utterance.rate *= 0.8;
          utterance.pitch *= 0.9;
          playSoundEffect('chime');
        } else if (messageType === 'motivation') {
          utterance.rate *= 1.05;
          utterance.pitch *= 1.05;
          playSoundEffect('fire');
        }
        
        // Select appropriate voice based on profile
        const voices = speechSynthesis.getVoices();
        let preferredVoice;
        
        switch (voiceSettings.currentProfile) {
          case 'motivator':
            preferredVoice = voices.find(voice => 
              voice.name.toLowerCase().includes('female') ||
              voice.name.includes('Samantha') ||
              voice.name.includes('Victoria')
            );
            break;
          case 'calm':
            preferredVoice = voices.find(voice => 
              voice.name.toLowerCase().includes('male') ||
              voice.name.includes('Daniel') ||
              voice.name.includes('Alex')
            );
            break;
          case 'drill':
            preferredVoice = voices.find(voice => 
              voice.name.includes('Daniel') ||
              voice.name.includes('Tom') ||
              (voice.name.toLowerCase().includes('male') && voice.lang.startsWith('en'))
            );
            break;
          case 'friend':
            preferredVoice = voices.find(voice => 
              voice.name.includes('Karen') ||
              voice.name.includes('Moira') ||
              voice.lang.startsWith('en')
            );
            break;
        }
        
        // Fallback to any English voice
        if (!preferredVoice) {
          preferredVoice = voices.find(voice => 
            voice.lang.startsWith('en') && 
            (voice.name.includes('Google') || voice.name.includes('Microsoft'))
          );
        }
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        
        // Event handlers
        utterance.onstart = () => {
          setIsSpeaking(true);
          startSoundWaveAnimation();
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          currentUtteranceRef.current = null;
          stopSoundWaveAnimation();
          
          // If voice mode is active, start listening again after speaking
          if (voiceModeActive && voiceSettings.voiceModeEnabled) {
            setTimeout(() => {
              startListening(true); // true for continuous mode
            }, 1000);
          }
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          currentUtteranceRef.current = null;
          stopSoundWaveAnimation();
        };
        
        currentUtteranceRef.current = utterance;
        speechSynthesis.speak(utterance);
      }
    } else {
      Alert.alert('Voice', 'Text-to-speech not available on mobile in this demo');
    }
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
    }
  };

  // Test voice with current settings
  const testVoice = () => {
    const testMessages = {
      motivator: "🔥 You're absolutely crushing it! Every step you take is building the phoenix version of yourself!",
      calm: "Take a deep breath. You have everything you need within you to handle this moment with grace.",
      drill: "No excuses! You committed to this transformation, now show me what you're made of!",
      friend: "Hey, I believe in you completely. You've got this, and I'm here cheering you on every step of the way.",
    };
    
    const currentProfile = voiceSettings.currentProfile as keyof typeof testMessages;
    const message = testMessages[currentProfile] || testMessages.motivator;
    speakText(message, 'motivation');
  };

  // Sound wave animation
  const startSoundWaveAnimation = useCallback(() => {
    const animations = soundWaveAnimations.map((anim, index) => 
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 300 + (index * 100),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300 + (index * 100),
            useNativeDriver: true,
          }),
        ])
      )
    );
    
    animations.forEach(anim => anim.start());
  }, [soundWaveAnimations]);
  
  const stopSoundWaveAnimation = useCallback(() => {
    soundWaveAnimations.forEach(anim => {
      anim.stopAnimation();
      anim.setValue(0);
    });
  }, [soundWaveAnimations]);
  
  // Wake word detection
  const startWakeWordDetection = () => {
    if (Platform.OS === 'web' && voiceSettings.wakeWordEnabled) {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          setIsWaitingForWakeWord(true);
        };
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
          
          if (transcript.includes('hey phoenix') || transcript.includes('phoenix')) {
            setIsWaitingForWakeWord(false);
            recognition.stop();
            // Start main listening after wake word detected
            setTimeout(() => {
              startListening(true);
            }, 500);
          }
        };
        
        recognition.onerror = () => {
          setIsWaitingForWakeWord(false);
          // Restart wake word detection after error
          setTimeout(() => {
            if (voiceSettings.wakeWordEnabled && voiceModeActive) {
              startWakeWordDetection();
            }
          }, 2000);
        };
        
        recognition.onend = () => {
          if (voiceSettings.wakeWordEnabled && voiceModeActive) {
            // Restart wake word detection
            setTimeout(() => {
              startWakeWordDetection();
            }, 1000);
          }
        };
        
        wakeWordRecognitionRef.current = recognition;
        recognition.start();
      }
    }
  };
  
  const stopWakeWordDetection = () => {
    if (wakeWordRecognitionRef.current) {
      wakeWordRecognitionRef.current.stop();
      wakeWordRecognitionRef.current = null;
    }
    setIsWaitingForWakeWord(false);
  };
  
  // Speech-to-Text function
  const startListening = (continuous = false) => {
    if (Platform.OS === 'web') {
      // Web Speech Recognition API
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          setIsListening(true);
        };
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
          setIsListening(false);
          
          // Auto-send in voice mode
          if (continuous && voiceModeActive) {
            setTimeout(() => {
              sendMessage(transcript);
            }, 500);
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          Alert.alert('Voice Input Error', 'Could not recognize speech. Please try again.');
        };
        
        recognition.onend = () => {
          setIsListening(false);
          
          // If in continuous voice mode and not speaking, restart listening
          if (continuous && voiceModeActive && !isSpeaking) {
            setTimeout(() => {
              if (voiceSettings.wakeWordEnabled) {
                startWakeWordDetection();
              } else {
                startListening(true);
              }
            }, 1000);
          }
        };
        
        recognitionRef.current = recognition;
        recognition.start();
      } else {
        Alert.alert('Voice Input', 'Speech recognition not supported in this browser');
      }
    } else {
      // For mobile, we'd use expo-speech, but keeping it simple
      Alert.alert('Voice Input', 'Speech-to-text not available on mobile in this demo');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };
  
  const focusCoachInput = useCallback(() => {
    try {
      inputRef.current?.focus();
    } catch (err) {
      console.log('[Coach] focus input failed', err);
    }
  }, []);

  const detectHeyAnunaInText = useCallback((text: string) => {
    try {
      const t = (text ?? '').toLowerCase();
      const matched = t.includes('hey anuna') || t.includes('hey annuna') || t.includes('hey anunna') || t.includes('anuna');
      console.log('[Coach] Detect Hey Anuna in text:', { matched, text: t.slice(0, 100) });
      if (matched) {
        console.log('Hey Anuna detected');
        focusCoachInput();
      }
      return matched;
    } catch (e) {
      console.log('[Coach] detectHeyAnunaInText error', e);
      return false;
    }
  }, [focusCoachInput]);

  const stopWakeRecordingTimer = useCallback(() => {
    if (wakeTimerRef.current) {
      clearTimeout(wakeTimerRef.current);
      wakeTimerRef.current = null;
    }
  }, []);

  const stopWakeRecording = useCallback(async () => {
    try {
      stopWakeRecordingTimer();
      if (recordingRef.current) {
        console.log('[Coach] Stopping wake recording');
        await recordingRef.current.stopAndUnloadAsync();
      }
    } catch (e) {
      console.log('[Coach] stopWakeRecording error', e);
    } finally {
      setIsWakeRecording(false);
    }
  }, [stopWakeRecordingTimer]);

  const transcribeAndCheckWakeWord = useCallback(async () => {
    try {
      if (Platform.OS === 'web') return;
      const uri = recordingRef.current?.getURI();
      if (!uri) {
        console.log('[Coach] No recording URI');
        return;
      }
      const uriParts = uri.split('.');
      const ext = uriParts[uriParts.length - 1] || 'm4a';
      const mime = `audio/${ext}`;
      const name = `wake.${ext}`;

      const formData = new FormData();
      formData.append('audio', { uri, name, type: mime } as any);

      const res = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        console.log('[Coach] STT failed', res.status);
        return;
      }
      const json = await res.json();
      const text: string = json?.text ?? '';
      console.log('[Coach] STT result:', text);
      detectHeyAnunaInText(text);
    } catch (e) {
      console.log('[Coach] transcribeAndCheckWakeWord error', e);
    }
  }, [detectHeyAnunaInText]);

  const activateHeyAnuna = useCallback(async () => {
    try {
      if (!voiceSettings.wakeWordEnabled) {
        Alert.alert('Wake Word Disabled', 'Enable Hey Anuna in Voice Settings first.');
        return;
      }

      const isWeb = Platform.OS === 'web';
      if (isWeb) {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = 'en-US';
          console.log('[Coach] Web wake-word recognition started (5s)');
          let stopped = false;
          const stopAfter = setTimeout(() => {
            if (!stopped) {
              try { recognition.stop(); } catch {}
            }
          }, 5000);
          recognition.onresult = (event: any) => {
            try {
              const transcript = event?.results?.[0]?.[0]?.transcript ?? '';
              detectHeyAnunaInText(transcript);
            } catch (e) {
              console.log('[Coach] web onresult parse error', e);
            }
          };
          recognition.onend = () => {
            stopped = true;
            clearTimeout(stopAfter);
            console.log('[Coach] Web wake-word recognition ended');
          };
          recognition.onerror = (ev: any) => {
            console.log('[Coach] Web wake-word recognition error', ev?.error);
          };
          try { recognition.start(); } catch (e) { console.log('[Coach] recognition.start failed', e); }
        } else {
          Alert.alert('Unavailable', 'Web Speech API not available in this browser.');
        }
        return;
      }

      console.log('[Coach] Mobile wake-word 5s recording start');
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone Permission', 'Please allow microphone access.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const rec = new Audio.Recording();
      recordingRef.current = rec;
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY as any);
      await rec.startAsync();
      setIsWakeRecording(true);
      stopWakeRecordingTimer();
      wakeTimerRef.current = setTimeout(async () => {
        await stopWakeRecording();
        await transcribeAndCheckWakeWord();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      }, 5000);
    } catch (e) {
      console.log('[Coach] activateHeyAnuna error', e);
      setIsWakeRecording(false);
    }
  }, [voiceSettings.wakeWordEnabled, stopWakeRecording, stopWakeRecordingTimer, transcribeAndCheckWakeWord]);
  
  // Voice Mode Toggle
  const toggleVoiceMode = () => {
    const newVoiceModeActive = !voiceModeActive;
    setVoiceModeActive(newVoiceModeActive);
    
    if (newVoiceModeActive) {
      // Start voice mode
      if (voiceSettings.wakeWordEnabled) {
        startWakeWordDetection();
      } else {
        startListening(true);
      }
    } else {
      // Stop voice mode
      stopListening();
      stopWakeWordDetection();
      stopSpeaking();
    }
  };

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [chatMessages, isTyping]);
  
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handler = (e: any) => {
        console.log('Hey Anuna detected');
        try {
          inputRef.current?.focus();
        } catch (err) {
          console.log('[Coach] focus on wake-word failed', err);
        }
      };
      wakeWordHandlerRef.current = handler;
      window.addEventListener('phoenix:wake-word', handler as any);
      return () => {
        if (wakeWordHandlerRef.current) {
          window.removeEventListener('phoenix:wake-word', wakeWordHandlerRef.current as any);
          wakeWordHandlerRef.current = null;
        }
      };
    }
    return undefined;
  }, []);

  // Cleanup effect for voice recognition
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (wakeWordRecognitionRef.current) {
        wakeWordRecognitionRef.current.stop();
      }
      if (currentUtteranceRef.current) {
        speechSynthesis.cancel();
      }
      stopSoundWaveAnimation();
    };
  }, [stopSoundWaveAnimation]);
  
  // Update voice mode when settings change
  useEffect(() => {
    if (!voiceSettings.voiceModeEnabled && voiceModeActive) {
      setVoiceModeActive(false);
      stopListening();
      stopWakeWordDetection();
    }
  }, [voiceSettings.voiceModeEnabled, voiceModeActive]);
  
  // Start sound wave animation when listening starts
  useEffect(() => {
    if (isListening) {
      startSoundWaveAnimation();
    } else {
      stopSoundWaveAnimation();
    }
  }, [isListening, startSoundWaveAnimation, stopSoundWaveAnimation]);

  // Welcome message for first-time users
  useEffect(() => {
    if (chatMessages.length === 0) {
      setTimeout(() => {
        const userName = userProfile.name || 'Phoenix Warrior';
        const welcomeText = `🔥 Welcome, ${userName}! I'm Phoenix, your AI life coach. I'm here to help you rise from any challenge and transform into your best self. What would you like to talk about today?`;
        const emotionData = detectEmotion(welcomeText);
        addChatMessage({
          text: welcomeText,
          isUser: false,
          quickActions: ['Tell me about yourself', 'How does this work?', 'I need motivation'],
          emotion: emotionData.emotion,
          visualEmoji: emotionData.emoji,
          messageColor: emotionData.color
        });
      }, 500);
    }
  }, [chatMessages.length, userProfile.name, addChatMessage]);

  const renderMessage = (message: any, index: number) => {
    const isUser = message.isUser;
    const theme = currentTheme.colors;

    return (
      <View key={message.id} style={[styles.messageContainer, isUser ? styles.userMessage : styles.phoenixMessage]}>
        {!isUser && (
          <View style={[
            styles.phoenixAvatar,
            message.messageColor && voiceSettings.emotionalIntelligenceEnabled && {
              backgroundColor: `${message.messageColor}30`,
              borderWidth: 2,
              borderColor: `${message.messageColor}60`
            }
          ]}>
            <Text style={styles.phoenixAvatarText}>
              {message.visualEmoji && voiceSettings.emotionalIntelligenceEnabled ? message.visualEmoji : '🔥'}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.messageBubble, 
          isUser ? { backgroundColor: theme.primary } : { 
            backgroundColor: theme.card,
            ...(message.messageColor && voiceSettings.emotionalIntelligenceEnabled && {
              borderLeftWidth: 4,
              borderLeftColor: message.messageColor,
              backgroundColor: `${message.messageColor}10`
            })
          }
        ]}>
          <View style={styles.messageContent}>
            <Text style={[styles.messageText, { color: theme.text }]}>
              {message.text}
            </Text>
            {!isUser && (
              <View style={styles.voiceControls}>
                <TouchableOpacity
                  style={[styles.speakButton, isSpeaking && styles.speakButtonActive]}
                  onPress={() => isSpeaking ? stopSpeaking() : speakCoachMessage(message.text)}
                >
                  {isSpeaking ? (
                    <VolumeX size={16} color={theme.primary} />
                  ) : (
                    <Volume2 size={16} color={theme.primary} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {message.quickActions && (
            <View style={styles.quickActionsContainer}>
              {message.quickActions.map((action: string, actionIndex: number) => (
                <TouchableOpacity
                  key={actionIndex}
                  testID={`quick-action-${actionIndex}`}
                  style={[styles.quickActionButton, { borderColor: theme.primary }]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPressIn={() => {
                    if (Platform.OS === 'android') {
                      console.log('[Coach] quickAction onPressIn', action);
                      sendMessage(action);
                    }
                  }}
                  onPress={() => {
                    if (Platform.OS !== 'android') {
                      console.log('[Coach] quickAction onPress', action);
                      sendMessage(action);
                    }
                  }}
                >
                  <Text style={[styles.quickActionText, { color: theme.primary }]}>
                    {action}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        {isUser && (
          <View style={[styles.userAvatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.userAvatarText}>
              {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <View style={[styles.messageContainer, styles.phoenixMessage]}>
        <View style={[
          styles.phoenixAvatar,
          currentEmotion !== 'default' && voiceSettings.emotionalIntelligenceEnabled && {
            backgroundColor: currentEmotion === 'celebration' ? '#FFD70030' :
                           currentEmotion === 'comfort' ? '#87CEEB30' :
                           currentEmotion === 'motivation' ? '#FF450030' : 'rgba(255, 69, 0, 0.2)',
            borderWidth: 2,
            borderColor: currentEmotion === 'celebration' ? '#FFD70060' :
                        currentEmotion === 'comfort' ? '#87CEEB60' :
                        currentEmotion === 'motivation' ? '#FF450060' : 'rgba(255, 69, 0, 0.4)'
          }
        ]}>
          <Text style={styles.phoenixAvatarText}>
            {voiceSettings.emotionalIntelligenceEnabled ? emotionEmoji : '🔥'}
          </Text>
        </View>
        
        <View style={[
          styles.messageBubble, 
          { 
            backgroundColor: currentTheme.colors.card,
            ...(currentEmotion !== 'default' && voiceSettings.emotionalIntelligenceEnabled && {
              borderLeftWidth: 4,
              borderLeftColor: currentEmotion === 'celebration' ? '#FFD700' :
                              currentEmotion === 'comfort' ? '#87CEEB' :
                              currentEmotion === 'motivation' ? '#FF4500' : '#FF4500',
              backgroundColor: currentEmotion === 'celebration' ? '#FFD70010' :
                              currentEmotion === 'comfort' ? '#87CEEB10' :
                              currentEmotion === 'motivation' ? '#FF450010' : currentTheme.colors.card
            })
          }
        ]}>
          <View style={styles.typingContainer}>
            <Animated.View style={[styles.typingDot, { opacity: typingAnimation }]} />
            <Animated.View style={[styles.typingDot, { opacity: typingAnimation }]} />
            <Animated.View style={[styles.typingDot, { opacity: typingAnimation }]} />
          </View>
          <Text style={[styles.typingText, { color: currentTheme.colors.text }]}>Phoenix is thinking...</Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[currentTheme.colors.background, currentTheme.colors.secondary]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.phoenixIcon}>
              <Flame size={24} color={currentTheme.colors.primary} />
            </View>
            <View>
              <Text testID="coach-header-title" style={[styles.headerTitle, { color: currentTheme.colors.text }]}>Phoenix Coach</Text>
              {isWakeRecording && (
                <Text style={[styles.headerSubtitle, { color: currentTheme.colors.text, opacity: 0.7 }]}>Listening 5s…</Text>
              )}
              <Text style={[styles.headerSubtitle, { color: currentTheme.colors.text, opacity: 0.7 }]}>Your AI Life Coach</Text>
            </View>
          </View>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity
              testID="activate-hey-anuna"
              style={styles.settingsButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPressIn={() => {
                if (Platform.OS === 'android') {
                  console.log('[Coach] Activate Hey Anuna onPressIn');
                  void activateHeyAnuna();
                }
              }}
              onPress={() => {
                if (Platform.OS !== 'android') {
                  console.log('[Coach] Activate Hey Anuna onPress');
                  void activateHeyAnuna();
                }
              }}
            >
              <Mic size={20} color={currentTheme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              testID="coach-header-settings"
              style={styles.settingsButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPressIn={() => {
                if (Platform.OS === 'android') {
                  console.log('[Coach] settings onPressIn');
                  setShowVoiceSettings(true);
                }
              }}
              onPress={() => {
                if (Platform.OS !== 'android') {
                  console.log('[Coach] settings onPress');
                  setShowVoiceSettings(true);
                }
              }}
            >
              <Settings size={20} color={currentTheme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              testID="coach-header-clear"
              style={styles.clearButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPressIn={() => {
                if (Platform.OS === 'android') {
                  console.log('[Coach] clear onPressIn');
                  handleClearChat();
                }
              }}
              onPress={() => {
                if (Platform.OS !== 'android') {
                  console.log('[Coach] clear onPress');
                  handleClearChat();
                }
              }}
            >
              <RotateCcw size={20} color={currentTheme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {chatMessages.map(renderMessage)}
          {renderTypingIndicator()}
        </ScrollView>

        {/* Suggested Questions */}
        {chatMessages.length <= 1 && (
          <View style={styles.suggestionsContainer}>
            <Text testID="coach-suggestions-title" style={[styles.suggestionsTitle, { color: currentTheme.colors.text }]}>Suggested questions:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
              {suggestedQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  testID={`coach-suggestion-${index}`}
                  style={[styles.suggestionChip, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.primary }]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPressIn={() => {
                    if (Platform.OS === 'android') {
                      console.log('[Coach] suggestion onPressIn', question);
                      handleSuggestedQuestion(question);
                    }
                  }}
                  onPress={() => {
                    if (Platform.OS !== 'android') {
                      console.log('[Coach] suggestion onPress', question);
                      handleSuggestedQuestion(question);
                    }
                  }}
                >
                  <Text style={[styles.suggestionText, { color: currentTheme.colors.text }]}>{question}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Voice Mode Status */}
        {voiceModeActive && (
          <View style={[styles.voiceModeStatus, { backgroundColor: currentTheme.colors.primary }]}>
            <Radio size={16} color="white" />
            <Text style={styles.voiceModeText}>
              {isWaitingForWakeWord ? 'Say &quot;Hey Phoenix&quot; to start...' : 
               isSpeaking ? 'Phoenix is speaking...' :
               isListening ? 'Listening...' : 'Voice Mode Active'}
            </Text>
            {(isListening || isSpeaking) && (
              <View style={styles.voiceStatusIndicator}>
                {soundWaves.map((_, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.statusWave,
                      {
                        backgroundColor: 'white',
                        transform: [{
                          scaleY: soundWaveAnimations[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 2],
                          })
                        }]
                      }
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}
        
        {/* Voice Selection Dropdown */}
        <View style={[styles.voiceSelectionContainer, { backgroundColor: currentTheme.colors.card }]}>
          <Text style={[styles.voiceSelectionLabel, { color: currentTheme.colors.text }]}>Voice:</Text>
          <View style={[styles.dropdownContainer, { borderColor: currentTheme.colors.primary }]}>
            <TouchableOpacity
              testID="coach-voice-dropdown"
              style={styles.dropdownButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPressIn={() => {
                if (Platform.OS === 'android') {
                  console.log('[Coach] voice dropdown onPressIn');
                  const voices = ['default', 'custom', 'mentor'];
                  const currentIndex = voices.indexOf(selectedVoice);
                  const nextIndex = (currentIndex + 1) % voices.length;
                  const nextVoice = voices[nextIndex];
                  saveSelectedVoice(nextVoice);
                }
              }}
              onPress={() => {
                if (Platform.OS !== 'android') {
                  console.log('[Coach] voice dropdown onPress');
                  const voices = ['default', 'custom', 'mentor'];
                  const currentIndex = voices.indexOf(selectedVoice);
                  const nextIndex = (currentIndex + 1) % voices.length;
                  const nextVoice = voices[nextIndex];
                  saveSelectedVoice(nextVoice);
                }
              }}
            >
              <Text style={[styles.dropdownText, { color: currentTheme.colors.text }]}>
                {selectedVoice === 'default' ? 'Default Phoenix' :
                 selectedVoice === 'custom' ? 'My Voice (Demo)' :
                 selectedVoice === 'mentor' ? 'Mentor Voice (Demo)' : 'Default Phoenix'}
              </Text>
              <Text style={[styles.dropdownArrow, { color: currentTheme.colors.primary }]}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: currentTheme.colors.card }]}>
          <TextInput
            style={[styles.textInput, { color: currentTheme.colors.text, borderColor: currentTheme.colors.primary }]}
            placeholder="Ask your Phoenix Coach..."
            placeholderTextColor={`${currentTheme.colors.text}80`}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage()}
            blurOnSubmit={false}
          />
          
          <TouchableOpacity
            testID="coach-mic"
            style={[styles.voiceButton, { 
              backgroundColor: isListening ? currentTheme.colors.primary : 'rgba(255, 255, 255, 0.1)',
              borderColor: currentTheme.colors.primary 
            }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPressIn={() => {
              if (Platform.OS === 'android' && !isTyping && !voiceModeActive) {
                console.log('[Coach] mic onPressIn');
                (isListening ? stopListening() : startListening(false));
              }
            }}
            onPress={() => {
              if (Platform.OS !== 'android' && !isTyping && !voiceModeActive) {
                console.log('[Coach] mic onPress');
                (isListening ? stopListening() : startListening(false));
              }
            }}
            disabled={isTyping || voiceModeActive}
          >
            {isListening ? (
              <View style={styles.listeningIndicator}>
                {soundWaves.map((_, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.soundWave,
                      {
                        backgroundColor: 'white',
                        transform: [{
                          scaleY: soundWaveAnimations[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 1.5],
                          })
                        }]
                      }
                    ]}
                  />
                ))}
              </View>
            ) : (
              <Mic size={20} color={currentTheme.colors.primary} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            testID="coach-voice-mode"
            style={[styles.voiceModeButton, { 
              backgroundColor: voiceModeActive ? currentTheme.colors.primary : 'rgba(255, 255, 255, 0.1)',
              borderColor: currentTheme.colors.primary 
            }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPressIn={() => {
              if (Platform.OS === 'android' && !isTyping) {
                console.log('[Coach] voice mode onPressIn');
                toggleVoiceMode();
              }
            }}
            onPress={() => {
              if (Platform.OS !== 'android' && !isTyping) {
                console.log('[Coach] voice mode onPress');
                toggleVoiceMode();
              }
            }}
            disabled={isTyping}
          >
            <Radio size={20} color={voiceModeActive ? 'white' : currentTheme.colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            testID="coach-send"
            style={[styles.sendButton, { backgroundColor: currentTheme.colors.primary }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPressIn={() => {
              if (Platform.OS === 'android' && inputText.trim() && !isTyping) {
                console.log('[Coach] send onPressIn');
                sendMessage();
              }
            }}
            onPress={() => {
              if (Platform.OS !== 'android' && inputText.trim() && !isTyping) {
                console.log('[Coach] send onPress');
                sendMessage();
              }
            }}
            disabled={!inputText.trim() || isTyping}
          >
            <Send size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Voice Settings Modal */}
        <Modal
          visible={showVoiceSettings}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowVoiceSettings(false)}
        >
          <LinearGradient
            colors={[currentTheme.colors.background, currentTheme.colors.secondary]}
            style={styles.modalContainer}
          >
            <SafeAreaView style={styles.modalSafeArea}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: currentTheme.colors.text }]}>Voice Settings</Text>
                <TouchableOpacity onPress={() => setShowVoiceSettings(false)}>
                  <Text style={[styles.modalCloseButton, { color: currentTheme.colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                {/* Voice Profiles */}
                <View style={styles.settingsSection}>
                  <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Voice Personality</Text>
                  {voiceProfiles.map((profile) => (
                    <TouchableOpacity
                      key={profile.id}
                      style={[
                        styles.profileCard,
                        {
                          backgroundColor: currentTheme.colors.card,
                          borderColor: voiceSettings.currentProfile === profile.id ? currentTheme.colors.primary : 'transparent',
                        },
                      ]}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPressIn={() => {
                        if (Platform.OS === 'android') {
                          console.log('[Coach] select profile onPressIn', profile.id);
                          saveVoiceSettings({ ...voiceSettings, currentProfile: profile.id });
                        }
                      }}
                      onPress={() => {
                        if (Platform.OS !== 'android') {
                          console.log('[Coach] select profile onPress', profile.id);
                          saveVoiceSettings({ ...voiceSettings, currentProfile: profile.id });
                        }
                      }}
                    >
                      <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, { color: currentTheme.colors.text }]}>{profile.name}</Text>
                        <Text style={[styles.profileDescription, { color: currentTheme.colors.text, opacity: 0.7 }]}>
                          {profile.description}
                        </Text>
                      </View>
                      {voiceSettings.currentProfile === profile.id && (
                        <View style={[styles.selectedIndicator, { backgroundColor: currentTheme.colors.primary }]} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Settings */}
                <View style={styles.settingsSection}>
                  <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Custom Settings</Text>
                  
                  {/* Speed */}
                  <View style={styles.sliderContainer}>
                    <Text style={[styles.sliderLabel, { color: currentTheme.colors.text }]}>Speed: {voiceSettings.customRate.toFixed(1)}x</Text>
                    <View style={styles.customSliderContainer}>
                      <TouchableOpacity
                        style={[styles.sliderButton, { backgroundColor: currentTheme.colors.card }]}
                        onPress={() => saveVoiceSettings({ ...voiceSettings, customRate: Math.max(0.5, voiceSettings.customRate - 0.1) })}
                      >
                        <Text style={[styles.sliderButtonText, { color: currentTheme.colors.text }]}>-</Text>
                      </TouchableOpacity>
                      <View style={[styles.sliderTrack, { backgroundColor: `${currentTheme.colors.text}20` }]}>
                        <View
                          style={[
                            styles.sliderFill,
                            {
                              backgroundColor: currentTheme.colors.primary,
                              width: `${((voiceSettings.customRate - 0.5) / 1.5) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                      <TouchableOpacity
                        style={[styles.sliderButton, { backgroundColor: currentTheme.colors.card }]}
                        onPress={() => saveVoiceSettings({ ...voiceSettings, customRate: Math.min(2.0, voiceSettings.customRate + 0.1) })}
                      >
                        <Text style={[styles.sliderButtonText, { color: currentTheme.colors.text }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Pitch */}
                  <View style={styles.sliderContainer}>
                    <Text style={[styles.sliderLabel, { color: currentTheme.colors.text }]}>Pitch: {voiceSettings.customPitch.toFixed(1)}</Text>
                    <View style={styles.customSliderContainer}>
                      <TouchableOpacity
                        style={[styles.sliderButton, { backgroundColor: currentTheme.colors.card }]}
                        onPress={() => saveVoiceSettings({ ...voiceSettings, customPitch: Math.max(0.5, voiceSettings.customPitch - 0.1) })}
                      >
                        <Text style={[styles.sliderButtonText, { color: currentTheme.colors.text }]}>-</Text>
                      </TouchableOpacity>
                      <View style={[styles.sliderTrack, { backgroundColor: `${currentTheme.colors.text}20` }]}>
                        <View
                          style={[
                            styles.sliderFill,
                            {
                              backgroundColor: currentTheme.colors.primary,
                              width: `${((voiceSettings.customPitch - 0.5) / 1.5) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                      <TouchableOpacity
                        style={[styles.sliderButton, { backgroundColor: currentTheme.colors.card }]}
                        onPress={() => saveVoiceSettings({ ...voiceSettings, customPitch: Math.min(2.0, voiceSettings.customPitch + 0.1) })}
                      >
                        <Text style={[styles.sliderButtonText, { color: currentTheme.colors.text }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Volume */}
                  <View style={styles.sliderContainer}>
                    <Text style={[styles.sliderLabel, { color: currentTheme.colors.text }]}>Volume: {Math.round(voiceSettings.customVolume * 100)}%</Text>
                    <View style={styles.customSliderContainer}>
                      <TouchableOpacity
                        style={[styles.sliderButton, { backgroundColor: currentTheme.colors.card }]}
                        onPress={() => saveVoiceSettings({ ...voiceSettings, customVolume: Math.max(0.1, voiceSettings.customVolume - 0.1) })}
                      >
                        <Text style={[styles.sliderButtonText, { color: currentTheme.colors.text }]}>-</Text>
                      </TouchableOpacity>
                      <View style={[styles.sliderTrack, { backgroundColor: `${currentTheme.colors.text}20` }]}>
                        <View
                          style={[
                            styles.sliderFill,
                            {
                              backgroundColor: currentTheme.colors.primary,
                              width: `${((voiceSettings.customVolume - 0.1) / 0.9) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                      <TouchableOpacity
                        style={[styles.sliderButton, { backgroundColor: currentTheme.colors.card }]}
                        onPress={() => saveVoiceSettings({ ...voiceSettings, customVolume: Math.min(1.0, voiceSettings.customVolume + 0.1) })}
                      >
                        <Text style={[styles.sliderButtonText, { color: currentTheme.colors.text }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Test Voice */}
                <View style={styles.settingsSection}>
                  <TouchableOpacity
                    testID="coach-test-voice"
                    style={[styles.testButton, { backgroundColor: currentTheme.colors.primary }]}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    onPressIn={() => {
                      if (Platform.OS === 'android') {
                        console.log('[Coach] test voice onPressIn');
                        testVoice();
                      }
                    }}
                    onPress={() => {
                      if (Platform.OS !== 'android') {
                        console.log('[Coach] test voice onPress');
                        testVoice();
                      }
                    }}
                  >
                    <Play size={20} color="white" />
                    <Text style={styles.testButtonText}>Test Voice</Text>
                  </TouchableOpacity>
                </View>

                {/* Sound Effects */}
                <View style={styles.settingsSection}>
                  <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Audio Effects</Text>
                  
                  <TouchableOpacity
                    style={[styles.toggleRow, { backgroundColor: currentTheme.colors.card }]}
                    onPress={() => saveVoiceSettings({ ...voiceSettings, soundEffectsEnabled: !voiceSettings.soundEffectsEnabled })}
                  >
                    <Text style={[styles.toggleLabel, { color: currentTheme.colors.text }]}>Sound Effects</Text>
                    <View style={[
                      styles.toggle,
                      {
                        backgroundColor: voiceSettings.soundEffectsEnabled ? currentTheme.colors.primary : `${currentTheme.colors.text}30`,
                      },
                    ]}>
                      <View style={[
                        styles.toggleThumb,
                        {
                          backgroundColor: 'white',
                          transform: [{ translateX: voiceSettings.soundEffectsEnabled ? 20 : 2 }],
                        },
                      ]} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleRow, { backgroundColor: currentTheme.colors.card }]}
                    onPress={() => saveVoiceSettings({ ...voiceSettings, backgroundMusicEnabled: !voiceSettings.backgroundMusicEnabled })}
                  >
                    <Text style={[styles.toggleLabel, { color: currentTheme.colors.text }]}>Background Music</Text>
                    <View style={[
                      styles.toggle,
                      {
                        backgroundColor: voiceSettings.backgroundMusicEnabled ? currentTheme.colors.primary : `${currentTheme.colors.text}30`,
                      },
                    ]}>
                      <View style={[
                        styles.toggleThumb,
                        {
                          backgroundColor: 'white',
                          transform: [{ translateX: voiceSettings.backgroundMusicEnabled ? 20 : 2 }],
                        },
                      ]} />
                    </View>
                  </TouchableOpacity>
                </View>
                
                {/* Voice Interaction Settings */}
                <View style={styles.settingsSection}>
                  <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Voice Interaction</Text>
                  
                  <TouchableOpacity
                    style={[styles.toggleRow, { backgroundColor: currentTheme.colors.card }]}
                    onPress={() => saveVoiceSettings({ ...voiceSettings, autoSpeakEnabled: !voiceSettings.autoSpeakEnabled })}
                  >
                    <View>
                      <Text style={[styles.toggleLabel, { color: currentTheme.colors.text }]}>Auto-read Responses</Text>
                      <Text style={[styles.toggleDescription, { color: currentTheme.colors.text, opacity: 0.6 }]}>Automatically speak coach responses</Text>
                    </View>
                    <View style={[
                      styles.toggle,
                      {
                        backgroundColor: voiceSettings.autoSpeakEnabled ? currentTheme.colors.primary : `${currentTheme.colors.text}30`,
                      },
                    ]}>
                      <View style={[
                        styles.toggleThumb,
                        {
                          backgroundColor: 'white',
                          transform: [{ translateX: voiceSettings.autoSpeakEnabled ? 20 : 2 }],
                        },
                      ]} />
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.toggleRow, { backgroundColor: currentTheme.colors.card }]}
                    onPress={() => saveVoiceSettings({ ...voiceSettings, voiceModeEnabled: !voiceSettings.voiceModeEnabled })}
                  >
                    <View>
                      <Text style={[styles.toggleLabel, { color: currentTheme.colors.text }]}>Voice Mode</Text>
                      <Text style={[styles.toggleDescription, { color: currentTheme.colors.text, opacity: 0.6 }]}>Continuous voice conversation</Text>
                    </View>
                    <View style={[
                      styles.toggle,
                      {
                        backgroundColor: voiceSettings.voiceModeEnabled ? currentTheme.colors.primary : `${currentTheme.colors.text}30`,
                      },
                    ]}>
                      <View style={[
                        styles.toggleThumb,
                        {
                          backgroundColor: 'white',
                          transform: [{ translateX: voiceSettings.voiceModeEnabled ? 20 : 2 }],
                        },
                      ]} />
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.toggleRow, { backgroundColor: currentTheme.colors.card }]}
                    onPress={() => saveVoiceSettings({ ...voiceSettings, wakeWordEnabled: !voiceSettings.wakeWordEnabled })}
                  >
                    <View>
                      <Text style={[styles.toggleLabel, { color: currentTheme.colors.text }]}>Wake Word &quot;Hey Phoenix&quot;</Text>
                      <Text style={[styles.toggleDescription, { color: currentTheme.colors.text, opacity: 0.6 }]}>Activate listening with &quot;Hey Phoenix&quot;</Text>
                    </View>
                    <View style={[
                      styles.toggle,
                      {
                        backgroundColor: voiceSettings.wakeWordEnabled ? currentTheme.colors.primary : `${currentTheme.colors.text}30`,
                      },
                    ]}>
                      <View style={[
                        styles.toggleThumb,
                        {
                          backgroundColor: 'white',
                          transform: [{ translateX: voiceSettings.wakeWordEnabled ? 20 : 2 }],
                        },
                      ]} />
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.toggleRow, { backgroundColor: currentTheme.colors.card }]}
                    onPress={() => saveVoiceSettings({ ...voiceSettings, emotionalIntelligenceEnabled: !voiceSettings.emotionalIntelligenceEnabled })}
                  >
                    <View>
                      <Text style={[styles.toggleLabel, { color: currentTheme.colors.text }]}>Emotional Intelligence</Text>
                      <Text style={[styles.toggleDescription, { color: currentTheme.colors.text, opacity: 0.6 }]}>Adaptive voice tone and visual feedback</Text>
                    </View>
                    <View style={[
                      styles.toggle,
                      {
                        backgroundColor: voiceSettings.emotionalIntelligenceEnabled ? currentTheme.colors.primary : `${currentTheme.colors.text}30`,
                      },
                    ]}>
                      <View style={[
                        styles.toggleThumb,
                        {
                          backgroundColor: 'white',
                          transform: [{ translateX: voiceSettings.emotionalIntelligenceEnabled ? 20 : 2 }],
                        },
                      ]} />
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </SafeAreaView>
          </LinearGradient>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

class CoachErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: unknown }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }
  componentDidCatch(error: unknown, info: any) {
    console.log('[Coach] ErrorBoundary caught', { error, info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text testID="coach-error" style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>
            Something went wrong in Coach. Please try again.
          </Text>
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
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoenixIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 69, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsButton: {
    minWidth: 60,
    minHeight: 60,
    padding: 12,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  clearButton: {
    minWidth: 60,
    minHeight: 60,
    padding: 12,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  chatContent: {
    paddingVertical: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  phoenixMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  voiceControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  speakButtonActive: {
    backgroundColor: 'rgba(255, 69, 0, 0.3)',
  },
  phoenixAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 69, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoenixAvatarText: {
    fontSize: 16,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  quickActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4500',
    marginRight: 4,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  suggestionsContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    opacity: 0.8,
  },
  suggestionsScroll: {
    flexDirection: 'row',
  },
  suggestionChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  voiceButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  voiceModeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  soundWave: {
    width: 3,
    height: 12,
    borderRadius: 1.5,
  },
  voiceModeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 20,
    gap: 8,
  },
  voiceModeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  voiceStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statusWave: {
    width: 2,
    height: 8,
    borderRadius: 1,
  },
  toggleDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  sendButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  settingsSection: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileDescription: {
    fontSize: 14,
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  customSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 3,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 10,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  // Voice Selection Styles
  voiceSelectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 10,
  },
  voiceSelectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    minWidth: 50,
  },
  dropdownContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    marginLeft: 8,
  },
});