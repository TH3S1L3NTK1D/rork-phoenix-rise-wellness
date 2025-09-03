import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
  Pressable,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { User, Database, Download, Trash2, Save, Award, Palette, RotateCcw, Mic, Upload } from "lucide-react-native";
import { useWellness, PRESET_THEMES, Theme, ThemeColors } from "@/providers/WellnessProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from 'expo-document-picker';
import { Audio as ExpoAudio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

interface UserProfile {
  name: string;
  age: string;
  motivation: string;
  joinDate: Date;
}

const PROFILE_STORAGE_KEY = "@phoenix_user_profile";

function SettingsScreen() {
  const { phoenixPoints, meals, extendedMeals, goals, journalEntries, supplements, addictions, currentTheme, updateTheme, resetToPhoenixTheme, elevenLabsApiKey, updateElevenLabsApiKey, wakeWordEnabled, updateWakeWordEnabled, soundEffectsEnabled, backgroundMusicEnabled, autoReadResponsesEnabled, voiceModeEnabled, emotionalIntelligenceEnabled, ttsSpeed, updateSoundEffectsEnabled, updateBackgroundMusicEnabled, updateAutoReadResponsesEnabled, updateVoiceModeEnabled, updateEmotionalIntelligenceEnabled, updateTtsSpeed } = useWellness();
  const [clonedVoicePath, setClonedVoicePath] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"profile" | "data" | "theme" | "voice">("profile");
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    age: "",
    motivation: "",
    joinDate: new Date(),
  });
  const [tempProfile, setTempProfile] = useState<UserProfile>({
    name: "",
    age: "",
    motivation: "",
    joinDate: new Date(),
  });

  const nameInputId = 'settings-name';
  const ageInputId = 'settings-age';
  const motivationInputId = 'settings-motivation';
  const apiKeyInputId = 'settings-api-key';
  const colorPrimaryId = 'settings-color-primary';
  const colorSecondaryId = 'settings-color-secondary';
  const colorBackgroundId = 'settings-color-background';
  const colorCardId = 'settings-color-card';
  const colorTextId = 'settings-color-text';

  const nameRef = useRef<string>("");
  const ageRef = useRef<string>("");
  const motivationRef = useRef<string>("");
  const apiKeyRef = useRef<string>("");
  const primaryRef = useRef<string>("");
  const secondaryRef = useRef<string>("");
  const backgroundRef = useRef<string>("");
  const cardRef = useRef<string>("");
  const textRef = useRef<string>("");

  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [customColors, setCustomColors] = useState<ThemeColors>(currentTheme.colors);
  const [tempColors, setTempColors] = useState<ThemeColors>(currentTheme.colors);
  const [selectedVoice, setSelectedVoice] = useState<string>('default');
  const [showRecordingInterface, setShowRecordingInterface] = useState<boolean>(false);
  const [currentSampleIndex, setCurrentSampleIndex] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedSamples, setRecordedSamples] = useState<Record<number, string>>({});
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordingTimer, setRecordingTimer] = useState<number | null>(null);
  const [playingAudio, setPlayingAudio] = useState<HTMLAudioElement | null>(null);
  const wakeRecognitionRef = useRef<any>(null);
  const [playingSampleIndex, setPlayingSampleIndex] = useState<number | null>(null);
  const [elevenLabsApiKeyLocal, setElevenLabsApiKeyLocal] = useState<string>('');
  const [tempApiKey, setTempApiKey] = useState<string>('');

  const [apiKeyVisible, setApiKeyVisible] = useState<boolean>(false);
  const [apiConnectionStatus, setApiConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [voiceCloneStatus, setVoiceCloneStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [clonedVoiceId, setClonedVoiceId] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const [promptVisible, setPromptVisible] = useState<boolean>(false);
  const [promptTitle, setPromptTitle] = useState<string>('');
  const [promptValue, setPromptValue] = useState<string>('');
  const [promptSecure, setPromptSecure] = useState<boolean>(false);
  const [promptKeyboard, setPromptKeyboard] = useState<"default" | "numeric" | "email-address" | "phone-pad">('default');
  const [promptTarget, setPromptTarget] = useState<string>('');
  
  const SAMPLE_TEXTS = [
    "Welcome to Phoenix Rise, your personal wellness companion.",
    "You're making incredible progress on your journey to better health.",
    "Remember, every small step counts towards your bigger goals.",
    "It's time to take your supplements and fuel your body right.",
    "You've got this! Your determination is your greatest strength.",
    "Let's focus on gratitude today. What are you thankful for?",
    "Breaking old habits takes courage, and you have plenty of it.",
    "Your wellness journey is unique, and that's what makes it powerful.",
    "Consistency beats perfection every single time.",
    "You're not just changing habits, you're transforming your entire life."
  ];

  useEffect(() => {
    loadProfile();
    getLastSaveTime();
  }, []);

  useEffect(() => {
    setTempProfile(profile);
  }, [profile]);

  useEffect(() => {
    setTempApiKey(elevenLabsApiKeyLocal || elevenLabsApiKey || '');
  }, [elevenLabsApiKeyLocal, elevenLabsApiKey]);

  useEffect(() => {
    setTempColors(customColors);
  }, [customColors]);

  useEffect(() => {
    setCustomColors(currentTheme.colors);
  }, [currentTheme]);

  useEffect(() => {
    loadVoicePreference();
    loadRecordedSamples();
    loadClonedVoiceId();
    setElevenLabsApiKeyLocal(elevenLabsApiKey || '');
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('@phoenix_cloned_voice_path');
        if (stored) setClonedVoicePath(stored);
      } catch (e) {
        console.error('Error loading clonedVoicePath', e);
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
      if (playingAudio) {
        playingAudio.pause();
      }
    };
  }, [audioStream, recordingTimer, playingAudio]);

  useEffect(() => {
    const isWeb = Platform.select({ web: true, default: false }) as boolean;
    if (!isWeb) return;

    try {
      if (wakeWordEnabled && (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window))) {
        const SpeechRecognition: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          console.log('[Settings] Wake word listener started');
        };

        recognition.onresult = (event: any) => {
          try {
            const result = event.results[event.results.length - 1];
            const transcript: string = result && result[0] && typeof result[0].transcript === 'string' ? result[0].transcript.toLowerCase() : '';
            if (!transcript) return;
            if (transcript.includes('hey anuna') || transcript.includes('hey annuna') || transcript.includes('hey anunna') || transcript.includes('anuna')) {
              console.log('Hey Anuna detected');
              try {
                const evt = new CustomEvent('phoenix:wake-word', { detail: { phrase: 'hey anuna', source: 'settings' } });
                window.dispatchEvent(evt);
              } catch (e) {
                console.log('[Settings] Dispatch wake-word event failed', e);
              }
              try {
                const el = document.querySelector('textarea[placeholder="Ask your Phoenix Coach..."]') as HTMLTextAreaElement | null;
                if (el) {
                  el.focus();
                }
              } catch (e) {
                console.log('[Settings] Focus coach input failed', e);
              }
            }
          } catch (e) {
            console.log('[Settings] onresult parse error', e);
          }
        };

        recognition.onerror = (event: any) => {
          console.log('[Settings] Wake word recognition error', event?.error);
          if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
            Alert.alert('Microphone Permission Needed', 'Please allow microphone access in your browser to use Hey Anuna.');
          }
        };

        recognition.onend = () => {
          if (wakeWordEnabled) {
            try {
              recognition.start();
            } catch (e) {
              console.log('[Settings] Auto-restart failed', e);
            }
          }
        };

        wakeRecognitionRef.current = recognition;
        try {
          recognition.start();
        } catch (e) {
          console.log('[Settings] recognition.start() failed', e);
        }
      } else {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          console.log('[Settings] Web Speech API not available');
        }
      }
    } catch (e) {
      console.log('[Settings] Wake word setup error', e);
    }

    return () => {
      try {
        if (wakeRecognitionRef.current) {
          wakeRecognitionRef.current.stop();
          wakeRecognitionRef.current = null;
          console.log('[Settings] Wake word listener stopped');
        }
      } catch {}
    };
  }, [wakeWordEnabled]);

  const loadVoicePreference = async () => {
    try {
      const stored = await AsyncStorage.getItem('@phoenix_voice_preference');
      if (stored) {
        setSelectedVoice(stored);
      }
    } catch (error) {
      console.error('Error loading voice preference:', error);
    }
  };

  const saveVoicePreference = async (voice: string) => {
    try {
      await AsyncStorage.setItem('@phoenix_voice_preference', voice);
      setSelectedVoice(voice);
      Alert.alert('Success', 'Voice preference saved!');
    } catch (error) {
      console.error('Error saving voice preference:', error);
      Alert.alert('Error', 'Failed to save voice preference');
    }
  };

  const loadApiKey = async () => {
    try {
      setElevenLabsApiKeyLocal(elevenLabsApiKey || '');
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  };

  const openPrompt = (options: { title: string; initial?: string; secure?: boolean; keyboard?: "default" | "numeric" | "email-address" | "phone-pad"; targetId: string; }) => {
    setPromptTitle(options.title);
    setPromptValue(options.initial ?? '');
    setPromptSecure(options.secure ?? false);
    setPromptKeyboard(options.keyboard ?? 'default');
    setPromptTarget(options.targetId);
    setPromptVisible(true);
  };

  const confirmPrompt = () => {
    switch (promptTarget) {
      case nameInputId:
        nameRef.current = promptValue;
        break;
      case ageInputId:
        ageRef.current = promptValue;
        break;
      case motivationInputId:
        motivationRef.current = promptValue;
        break;
      case apiKeyInputId:
        apiKeyRef.current = promptValue;
        setTempApiKey(promptValue);
        break;
      default:
        break;
    }
    setPromptVisible(false);
  };

  const cancelPrompt = () => {
    setPromptVisible(false);
  };

  const readInputValue = (id: string): string => {
    if (Platform.OS === 'web') {
      const el = document.getElementById(id) as HTMLInputElement | null;
      return el?.value ?? '';
    }
    switch (id) {
      case nameInputId:
        return nameRef.current ?? '';
      case ageInputId:
        return ageRef.current ?? '';
      case motivationInputId:
        return motivationRef.current ?? '';
      case apiKeyInputId:
        return apiKeyRef.current ?? '';
      case colorPrimaryId:
        return primaryRef.current ?? '';
      case colorSecondaryId:
        return secondaryRef.current ?? '';
      case colorBackgroundId:
        return backgroundRef.current ?? '';
      case colorCardId:
        return cardRef.current ?? '';
      case colorTextId:
        return textRef.current ?? '';
      default:
        return '';
    }
  };

  const saveApiKey = async () => {
    try {
      const key = (readInputValue(apiKeyInputId) || tempApiKey || '').trim();
      if (key.length === 0) {
        updateElevenLabsApiKey('');
        setElevenLabsApiKeyLocal('');
        Alert.alert('Success', 'API key removed');
        console.log('[Settings] ElevenLabs key removed');
        return;
      }
      updateElevenLabsApiKey(key);
      setElevenLabsApiKeyLocal(key);
      Alert.alert('Success', 'API key saved!');
      console.log('[Settings] ElevenLabs key saved len:', key.length);
    } catch (error) {
      console.error('Error saving API key:', error);
      Alert.alert('Error', 'Failed to save API key');
    }
  };

  const testApiConnection = async () => {
    const liveKey = readInputValue(apiKeyInputId);
    const keyToTest = (liveKey || tempApiKey || elevenLabsApiKeyLocal || elevenLabsApiKey || '').trim();
    if (!keyToTest) {
      Alert.alert('Error', 'Please enter your ElevenLabs API key first');
      return;
    }

    setApiConnectionStatus('testing');
    
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        method: 'GET',
        headers: {
          'xi-api-key': keyToTest,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setApiConnectionStatus('success');
        Alert.alert('Success', 'API connection test successful! Your key is valid.');
      } else if (response.status === 401) {
        setApiConnectionStatus('error');
        Alert.alert('Error', 'Invalid API key. Please check your ElevenLabs API key.');
      } else {
        setApiConnectionStatus('error');
        Alert.alert('Error', `API error: ${response.status}. Please try again.`);
      }
    } catch (error) {
      setApiConnectionStatus('error');
      Alert.alert('Error', 'Failed to test API connection. Please check your internet connection and try again.');
      console.error('API test error:', error);
    }
  };

  const loadRecordedSamples = async () => {
    try {
      const stored = await AsyncStorage.getItem('@phoenix_recorded_samples');
      if (stored) {
        setRecordedSamples(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recorded samples:', error);
    }
  };

  const saveRecordedSample = async (sampleIndex: number, audioData: string) => {
    try {
      const updatedSamples = { ...recordedSamples, [sampleIndex]: audioData };
      await AsyncStorage.setItem('@phoenix_recorded_samples', JSON.stringify(updatedSamples));
      setRecordedSamples(updatedSamples);
      console.log(`Sample ${sampleIndex + 1} saved successfully`);
    } catch (error) {
      console.error('Error saving recorded sample:', error);
      Alert.alert('Error', 'Failed to save recording');
    }
  };

  const startRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);
        
        const recorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];
        
        recorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
        
        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result as string;
            saveRecordedSample(currentSampleIndex, base64Data);
          };
          reader.readAsDataURL(audioBlob);
        };
        
        setMediaRecorder(recorder);
        recorder.start();
        setIsRecording(true);
        setRecordingTime(0);
        
        const timer = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        setRecordingTimer(timer as any);
        
        console.log('Recording started for sample:', currentSampleIndex + 1);
      } else {
        Alert.alert('Info', 'Recording is only available on web platform');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
      
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
      
      console.log('Recording stopped');
      Alert.alert('Success', `Sample ${currentSampleIndex + 1} recorded successfully!`);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const playRecording = (sampleIndex: number) => {
    const audioData = recordedSamples[sampleIndex];
    if (!audioData) {
      Alert.alert('Info', 'No recording found for this sample');
      return;
    }
    
    if (playingAudio) {
      playingAudio.pause();
      setPlayingAudio(null);
      setPlayingSampleIndex(null);
    }
    
    if (Platform.OS === 'web') {
      const audio = new (window as any).Audio(audioData);
      audio.onended = () => {
        setPlayingAudio(null);
        setPlayingSampleIndex(null);
      };
      audio.onerror = () => {
        Alert.alert('Error', 'Failed to play recording');
        setPlayingAudio(null);
        setPlayingSampleIndex(null);
      };
      
      setPlayingAudio(audio);
      setPlayingSampleIndex(sampleIndex);
      audio.play();
      console.log('Playing sample:', sampleIndex + 1);
    }
  };

  const deleteRecording = async (sampleIndex: number) => {
    try {
      const updatedSamples = { ...recordedSamples };
      delete updatedSamples[sampleIndex];
      await AsyncStorage.setItem('@phoenix_recorded_samples', JSON.stringify(updatedSamples));
      setRecordedSamples(updatedSamples);
      Alert.alert('Success', `Sample ${sampleIndex + 1} deleted`);
    } catch (error) {
      console.error('Error deleting recording:', error);
      Alert.alert('Error', 'Failed to delete recording');
    }
  };

  const loadClonedVoiceId = async () => {
    try {
      const stored = await AsyncStorage.getItem('@phoenix_cloned_voice_id');
      if (stored) {
        setClonedVoiceId(stored);
      }
    } catch (error) {
      console.error('Error loading cloned voice ID:', error);
    }
  };

  const saveClonedVoiceId = async (voiceId: string) => {
    try {
      await AsyncStorage.setItem('@phoenix_cloned_voice_id', voiceId);
      setClonedVoiceId(voiceId);
    } catch (error) {
      console.error('Error saving cloned voice ID:', error);
    }
  };

  const createVoiceClone = async () => {
    if (!elevenLabsApiKey.trim()) {
      Alert.alert('Error', 'Please configure your ElevenLabs API key first');
      return;
    }

    const recordedCount = Object.keys(recordedSamples).length;
    if (recordedCount < 3) {
      Alert.alert('Error', `You need at least 3 voice samples to create a clone. You have ${recordedCount} samples.`);
      return;
    }

    setVoiceCloneStatus('creating');
    setCloneError(null);

    try {
      const files: File[] = [];
      const labels: string[] = [];

      for (const [index, audioData] of Object.entries(recordedSamples)) {
        try {
          const response = await fetch(audioData);
          const blob = await response.blob();
          const file = new File([blob], `sample_${parseInt(index) + 1}.wav`, { type: 'audio/wav' });
          files.push(file);
          labels.push(`Sample ${parseInt(index) + 1}: ${SAMPLE_TEXTS[parseInt(index)].substring(0, 50)}...`);
        } catch (error) {
          console.error(`Error processing sample ${index}:`, error);
        }
      }

      if (files.length === 0) {
        throw new Error('No valid audio files could be processed');
      }

      const formData = new FormData();
      formData.append('name', 'Phoenix Coach Voice Clone');
      formData.append('description', 'Custom voice clone for Phoenix Rise wellness coach');
      
      files.forEach((file) => {
        formData.append('files', file);
      });
      
      labels.forEach((label) => {
        formData.append('labels', label);
      });

      console.log('Sending voice clone request with', files.length, 'files');

      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsApiKey,
        },
        body: formData,
      });

      const responseData = await response.json();
      console.log('Voice clone response:', responseData);

      if (response.ok && (responseData as any).voice_id) {
        await saveClonedVoiceId((responseData as any).voice_id as string);
        setVoiceCloneStatus('success');
        Alert.alert(
          'Success! 🎉', 
          'Your voice has been successfully cloned! You can now use it for Phoenix Coach responses.',
          [
            {
              text: 'Use Cloned Voice',
              onPress: () => saveVoicePreference('clone')
            },
            {
              text: 'OK',
              style: 'default'
            }
          ]
        );
      } else {
        throw new Error((responseData as any).detail || (responseData as any).message || 'Voice cloning failed');
      }
    } catch (error: any) {
      console.error('Voice cloning error:', error);
      setVoiceCloneStatus('error');
      setCloneError(error.message || 'Unknown error occurred');
      
      Alert.alert(
        'Voice Cloning Failed',
        `Error: ${error.message || 'Unknown error occurred'}\n\nPlease check your API key and try again. Make sure you have sufficient credits in your ElevenLabs account.`,
        [
          {
            text: 'Retry',
            onPress: () => createVoiceClone()
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    }
  };

  const testClonedVoice = async () => {
    try {
      const key = (elevenLabsApiKeyLocal || elevenLabsApiKey || '').trim();
      if (!key) {
        Alert.alert('Missing API Key', 'Please enter and save your ElevenLabs API key first.');
        return;
      }

      const text = 'This is a test';
      const voiceId = 'ahvd0TWxmVC87GTyJn2P';

      console.log('[Settings] Sending ElevenLabs TTS test request', { voiceId, textLen: text.length });

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'Content-Type': 'application/json',
          'accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.log('[Settings] ElevenLabs TTS error', response.status, errText);
        Alert.alert('TTS Error', `Failed to generate audio (${response.status}).`);
        return;
      }

      if (Platform.OS === 'web') {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new (window as any).Audio(url);
        audio.onended = () => {
          URL.revokeObjectURL(url);
          console.log('[Settings] Web audio ended');
        };
        audio.onerror = (e: unknown) => {
          console.log('[Settings] Web audio error', e);
        };
        console.log('[Settings] Playing web audio');
        await audio.play();
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      const fileUri = FileSystem.cacheDirectory + 'anuna-test.mp3';
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      console.log('[Settings] Saved audio to', fileUri);

      const { sound } = await ExpoAudio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });
      sound.setOnPlaybackStatusUpdate((status) => {
        const s = status as any;
        if (s?.didJustFinish) {
          sound.unloadAsync();
          console.log('[Settings] Mobile audio finished');
        }
      });
    } catch (e) {
      console.log('[Settings] Test cloned voice error', e);
      Alert.alert('Error', 'Failed to play test audio.');
    }
  };

  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // btoa is available in JS runtime
    return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  }

  const deleteVoiceClone = async () => {
    if (!clonedVoiceId || !elevenLabsApiKey.trim()) {
      return;
    }

    Alert.alert(
      'Delete Voice Clone',
      'Are you sure you want to delete your cloned voice? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`https://api.elevenlabs.io/v1/voices/${clonedVoiceId}`, {
                method: 'DELETE',
                headers: {
                  'xi-api-key': elevenLabsApiKey,
                },
              });

              if (response.ok) {
                await AsyncStorage.removeItem('@phoenix_cloned_voice_id');
                setClonedVoiceId(null);
                setVoiceCloneStatus('idle');
                if (selectedVoice === 'clone') {
                  saveVoicePreference('default');
                }
                Alert.alert('Success', 'Voice clone deleted successfully');
              } else {
                throw new Error('Failed to delete voice clone');
              }
            } catch (error: any) {
              console.error('Error deleting voice clone:', error);
              Alert.alert('Error', 'Failed to delete voice clone. It may have already been removed.');
            }
          }
        }
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProfile({
          ...parsed,
          joinDate: new Date(parsed.joinDate),
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const saveProfile = async () => {
    try {
      const name = readInputValue(nameInputId) || tempProfile.name || profile.name;
      const age = readInputValue(ageInputId) || tempProfile.age || profile.age;
      const motivation = readInputValue(motivationInputId) || tempProfile.motivation || profile.motivation;
      const updatedProfile: UserProfile = {
        name,
        age,
        motivation,
        joinDate: profile.joinDate ?? new Date(),
      };
      setProfile(updatedProfile);
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
      setLastSaveTime(new Date());

      Alert.alert("Success", "Profile saved successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile");
    }
  };

  const getLastSaveTime = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (keys.length > 0) {
        const now = new Date();
        setLastSaveTime(now);
      }
    } catch (error) {
      console.error("Error getting last save time:", error);
    }
  };

  const exportData = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const allData: Record<string, any> = {};
      
      for (const key of allKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          allData[key] = JSON.parse(value);
        }
      }

      const exportData = {
        exportDate: new Date().toISOString(),
        appVersion: "1.0.0",
        data: allData,
      };

      if (Platform.OS === 'web') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `phoenix-wellness-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        Alert.alert(
          "Export Data", 
          "Data exported successfully! In a production app, this would save to your device.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      Alert.alert("Error", "Failed to export data");
    }
  };

  const clearAllData = async () => {
    if (!confirmClear) {
      Alert.alert(
        "Clear All Data",
        "Are you sure you want to clear all data? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Clear", style: "destructive", onPress: () => setConfirmClear(true) },
        ]
      );
      return;
    }

    try {
      await AsyncStorage.clear();
      setProfile({ name: "", age: "", motivation: "", joinDate: new Date() });
      setConfirmClear(false);
      Alert.alert("Success", "All data cleared successfully!");
    } catch (error) {
      console.error("Error clearing data:", error);
      Alert.alert("Error", "Failed to clear data");
    }
  };

  const calculateLevel = (points: number) => {
    return Math.floor(points / 100) + 1;
  };

  const calculateDaysUsing = () => {
    const joinDate = profile.joinDate;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - joinDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStorageUsed = () => {
    const totalItems = meals.length + extendedMeals.length + goals.length + journalEntries.length + supplements.length + addictions.length;
    return `~${Math.round(totalItems * 0.5)}KB`;
  };

  const applyPresetTheme = (theme: Theme) => {
    updateTheme(theme);
    setCustomColors(theme.colors);
  };

  const ProfileTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.glassCard}>
        <Text style={styles.cardTitle}>Profile Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Name</Text>
          {Platform.OS === 'android' ? (
            <TouchableOpacity
              testID="name-prompt"
              style={styles.textInput}
              onPress={() => openPrompt({ title: 'Enter your name', initial: nameRef.current || profile.name, targetId: nameInputId })}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#FFFFFF' }}>{(nameRef.current || profile.name) || 'Tap to enter your name'}</Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              nativeID={nameInputId}
              style={styles.textInput}
              defaultValue={profile.name}
              onChangeText={Platform.OS !== 'web' ? (text: string) => { nameRef.current = text; } : undefined}
              placeholder="Enter your name"
              placeholderTextColor="#8B9DC3"
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Age</Text>
          {Platform.OS === 'android' ? (
            <TouchableOpacity
              testID="age-prompt"
              style={styles.textInput}
              onPress={() => openPrompt({ title: 'Enter your age', initial: ageRef.current || profile.age, keyboard: 'numeric', targetId: ageInputId })}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#FFFFFF' }}>{(ageRef.current || profile.age) || 'Tap to enter your age'}</Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              nativeID={ageInputId}
              style={styles.textInput}
              defaultValue={profile.age}
              onChangeText={Platform.OS !== 'web' ? (text: string) => { ageRef.current = text; } : undefined}
              placeholder="Enter your age"
              placeholderTextColor="#8B9DC3"
              keyboardType="numeric"
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Motivation</Text>
          {Platform.OS === 'android' ? (
            <TouchableOpacity
              testID="motivation-prompt"
              style={[styles.textInput, styles.textArea]}
              onPress={() => openPrompt({ title: 'What motivates you on your wellness journey?', initial: motivationRef.current || profile.motivation, targetId: motivationInputId })}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#FFFFFF' }}>{(motivationRef.current || profile.motivation) || 'Tap to enter your motivation'}</Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              nativeID={motivationInputId}
              style={[styles.textInput, styles.textArea]}
              defaultValue={profile.motivation}
              onChangeText={Platform.OS !== 'web' ? (text: string) => { motivationRef.current = text; } : undefined}
              placeholder="What motivates you on your wellness journey?"
              placeholderTextColor="#8B9DC3"
              multiline
              numberOfLines={3}
            />
          )}
        </View>

        <TouchableOpacity
          testID="settings-save-profile"
          style={styles.saveButton}
          activeOpacity={0.8}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPressIn={() => {
            if (Platform.OS === 'android') {
              console.log('[Settings] Save Profile onPressIn');
              saveProfile();
            }
          }}
          onPress={() => {
            if (Platform.OS !== 'android') {
              console.log('[Settings] Save Profile onPress');
              saveProfile();
            }
          }}
        >
          <LinearGradient colors={["#FF4500", "#FF6347"]} style={styles.saveButtonGradient}>
            <Save size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save Profile</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.glassCard}>
        <Text style={styles.cardTitle}>Statistics</Text>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Meals:</Text>
          <Text style={styles.statValue}>{meals.length + extendedMeals.length}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Goals:</Text>
          <Text style={styles.statValue}>{goals.length}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Days Using App:</Text>
          <Text style={styles.statValue}>{calculateDaysUsing()}</Text>
        </View>
      </View>

      <View style={styles.glassCard}>
        <Text style={styles.cardTitle}>Phoenix Status</Text>
        
        <View style={styles.phoenixStatus}>
          <Award size={32} color="#FF4500" />
          <View style={styles.phoenixInfo}>
            <Text style={styles.phoenixPoints}>{phoenixPoints} Points</Text>
            <Text style={styles.phoenixLevel}>Level {calculateLevel(phoenixPoints)}</Text>
          </View>
        </View>
        
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(phoenixPoints % 100)}%` }
            ]} 
          />
        </View>
        <Text style={styles.levelProgressText}>
          {phoenixPoints % 100}/100 to next level
        </Text>
      </View>
    </View>
  );

  const DataTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.glassCard}>
        <Text style={styles.cardTitle}>Data Management</Text>
        
        <TouchableOpacity
          testID="settings-export-data"
          style={styles.dataButton}
          activeOpacity={0.8}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPressIn={() => {
            if (Platform.OS === 'android') {
              console.log('[Settings] Export Data onPressIn');
              exportData();
            }
          }}
          onPress={() => {
            if (Platform.OS !== 'android') {
              console.log('[Settings] Export Data onPress');
              exportData();
            }
          }}
        >
          <LinearGradient colors={["#1A2B3C", "#003366"]} style={styles.dataButtonGradient}>
            <Download size={20} color="#FFFFFF" />
            <Text style={styles.dataButtonText}>Export Data</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.dataDescription}>
          Download all your wellness data as a JSON file
        </Text>
      </View>

      <View style={styles.glassCard}>
        <Text style={styles.cardTitle}>Storage Information</Text>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Last Save:</Text>
          <Text style={styles.statValue}>
            {lastSaveTime ? lastSaveTime.toLocaleString() : "Never"}
          </Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Storage Used:</Text>
          <Text style={styles.statValue}>{getStorageUsed()}</Text>
        </View>
      </View>

      <View style={styles.glassCard}>
        <Text style={styles.cardTitle}>Danger Zone</Text>
        
        <TouchableOpacity 
          testID="settings-clear-all"
          style={[styles.dataButton, styles.dangerButton]} 
          activeOpacity={0.8}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPressIn={() => {
            if (Platform.OS === 'android') {
              console.log('[Settings] Clear All onPressIn');
              clearAllData();
            }
          }}
          onPress={() => {
            if (Platform.OS !== 'android') {
              console.log('[Settings] Clear All onPress');
              clearAllData();
            }
          }}
        >
          <LinearGradient colors={["#DC2626", "#B91C1C"]} style={styles.dataButtonGradient}>
            <Trash2 size={20} color="#FFFFFF" />
            <Text style={styles.dataButtonText}>Clear All Data</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.dangerDescription}>
          This will permanently delete all your wellness data
        </Text>
        
        {confirmClear && (
          <View style={styles.confirmSection}>
            <Text style={styles.confirmText}>Are you absolutely sure?</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity 
                style={styles.confirmButton} 
                onPress={() => setConfirmClear(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.confirmDeleteButton]} 
                onPress={clearAllData}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const VoiceTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.glassCard, { backgroundColor: currentTheme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>Voice Studio</Text>
        <Text style={[styles.voiceDescription, { color: currentTheme.colors.text }]}> 
          Choose how Phoenix Coach speaks to you
        </Text>
        
        <View style={styles.voiceCardsContainer}>
          <TouchableOpacity 
            style={[
              styles.voiceCard,
              selectedVoice === 'default' && styles.selectedVoiceCard
            ]}
            onPress={() => saveVoicePreference('default')}
            activeOpacity={0.8}
          >
            <View style={[styles.voiceCardIcon, { backgroundColor: currentTheme.colors.primary }]}>
              <Mic size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.voiceCardTitle, { color: currentTheme.colors.text }]}>Default Voice</Text>
            <Text style={[styles.voiceCardDescription, { color: currentTheme.colors.text }]}> 
              Uses your browser&apos;s built-in text-to-speech
            </Text>
            {selectedVoice === 'default' && (
              <View style={[styles.selectedIndicator, { backgroundColor: currentTheme.colors.primary }]} />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.voiceCard,
              selectedVoice === 'clone' && styles.selectedVoiceCard
            ]}
            onPress={() => setShowRecordingInterface(!showRecordingInterface)}
            activeOpacity={0.8}
          >
            <View style={[styles.voiceCardIcon, { backgroundColor: currentTheme.colors.primary }]}>
              <Mic size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.voiceCardTitle, { color: currentTheme.colors.text }]}>Clone My Voice</Text>
            <Text style={[styles.voiceCardDescription, { color: currentTheme.colors.text }]}> 
              Record 10 samples to train Phoenix to speak like you
            </Text>
            {showRecordingInterface && (
              <View style={[styles.selectedIndicator, { backgroundColor: currentTheme.colors.primary }]} />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.voiceCard,
              styles.disabledVoiceCard,
              selectedVoice === 'mentor' && styles.selectedVoiceCard
            ]}
            activeOpacity={0.6}
          >
            <View style={[styles.voiceCardIcon, { backgroundColor: '#666' }]}>
              <Mic size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.voiceCardTitle, { color: '#666' }]}>Upload Mentor Voice</Text>
            <Text style={[styles.voiceCardDescription, { color: '#666' }]}> 
              Coming soon - Use your mentor&apos;s voice for coaching
            </Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {showRecordingInterface && (
        <View style={[styles.glassCard, { backgroundColor: currentTheme.colors.card }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>Voice Recording Studio</Text>
          
          <View style={styles.recordingInterface}>
            <View style={styles.sampleCounter}>
              <Text style={[styles.sampleCounterText, { color: currentTheme.colors.text }]}> 
                Sample {currentSampleIndex + 1} of {SAMPLE_TEXTS.length}
              </Text>
            </View>
            
            <View style={styles.sampleTextContainer}>
              <Text style={[styles.sampleText, { color: currentTheme.colors.text }]}> 
                &ldquo;{SAMPLE_TEXTS[currentSampleIndex]}&rdquo;
              </Text>
            </View>
            
            <View style={styles.recordButtonContainer}>
              <TouchableOpacity 
                style={[
                  styles.recordButton, 
                  { 
                    borderColor: isRecording ? '#DC2626' : currentTheme.colors.primary,
                    transform: isRecording ? [{ scale: 1.1 }] : [{ scale: 1 }]
                  }
                ]}
                onPress={toggleRecording}
                activeOpacity={0.8}
              >
                <LinearGradient 
                  colors={isRecording ? ['#DC2626', '#B91C1C'] : [currentTheme.colors.primary, currentTheme.colors.primary + '80']} 
                  style={styles.recordButtonGradient}
                >
                  <View style={styles.recordButtonInner}>
                    {isRecording ? (
                      <View style={styles.recordingIndicator}>
                        <View style={[styles.recordingPulse, { backgroundColor: '#FFFFFF' }]} />
                        <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
                      </View>
                    ) : (
                      <View style={styles.recordDot} />
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              
              {recordedSamples[currentSampleIndex] && (
                <View style={styles.recordingControls}>
                  <TouchableOpacity 
                    style={[styles.controlButton, { backgroundColor: currentTheme.colors.primary + '20' }]}
                    onPress={() => playRecording(currentSampleIndex)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.controlButtonText, { color: currentTheme.colors.primary }]}> 
                      {playingSampleIndex === currentSampleIndex ? '⏸️ Pause' : '▶️ Play'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.controlButton, { backgroundColor: '#DC2626' + '20' }]}
                    onPress={() => {
                      Alert.alert(
                        'Delete Recording',
                        `Are you sure you want to delete sample ${currentSampleIndex + 1}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteRecording(currentSampleIndex) }
                        ]
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.controlButtonText, { color: '#DC2626' }]}>🗑️ Delete</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.controlButton, { backgroundColor: currentTheme.colors.primary + '20' }]}
                    onPress={toggleRecording}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.controlButtonText, { color: currentTheme.colors.primary }]}>🔄 Re-record</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            {isRecording && (
              <View style={styles.waveformContainer}>
                <View style={styles.waveform}>
                  {[...Array(20)].map((_, i) => (
                    <View 
                      key={i}
                      style={[
                        styles.waveformBar,
                        { 
                          height: Math.random() * 30 + 10,
                          backgroundColor: currentTheme.colors.primary,
                          opacity: Math.random() * 0.8 + 0.2
                        }
                      ]} 
                    />
                  ))}
                </View>
                <Text style={[styles.recordingStatus, { color: currentTheme.colors.text }]}> 
                  🎤 Recording... Speak clearly into your microphone
                </Text>
              </View>
            )}
            
            <View style={styles.navigationButtons}>
              <TouchableOpacity 
                style={[
                  styles.navButton,
                  { backgroundColor: currentTheme.colors.primary + '20', borderColor: currentTheme.colors.primary }
                ]}
                onPress={() => setCurrentSampleIndex(Math.max(0, currentSampleIndex - 1))}
                disabled={currentSampleIndex === 0}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.navButtonText, 
                  { color: currentSampleIndex === 0 ? '#666' : currentTheme.colors.primary }
                ]}>
                  Previous
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.navButton,
                  { backgroundColor: currentTheme.colors.primary + '20', borderColor: currentTheme.colors.primary }
                ]}
                onPress={() => setCurrentSampleIndex(Math.min(SAMPLE_TEXTS.length - 1, currentSampleIndex + 1))}
                disabled={currentSampleIndex === SAMPLE_TEXTS.length - 1}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.navButtonText, 
                  { color: currentSampleIndex === SAMPLE_TEXTS.length - 1 ? '#666' : currentTheme.colors.primary }
                ]}>
                  Next
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.recordingProgress}>
              <Text style={[styles.progressLabel, { color: currentTheme.colors.text }]}>Recording Progress</Text>
              <View style={[styles.progressBarContainer, { backgroundColor: currentTheme.colors.primary + '20' }]}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      backgroundColor: currentTheme.colors.primary,
                      width: `${(Object.keys(recordedSamples).length / SAMPLE_TEXTS.length) * 100}%`
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.progressText, { color: currentTheme.colors.text }]}> 
                {Object.keys(recordedSamples).length} of {SAMPLE_TEXTS.length} samples recorded
              </Text>
              
              {Object.keys(recordedSamples).length >= 3 && (
                <TouchableOpacity 
                  style={[
                    styles.cloneButton,
                    { 
                      backgroundColor: voiceCloneStatus === 'creating' ? '#666' : 
                                     voiceCloneStatus === 'success' ? '#4CAF50' : 
                                     voiceCloneStatus === 'error' ? '#DC2626' : 
                                     currentTheme.colors.primary
                    }
                  ]}
                  onPress={createVoiceClone}
                  disabled={voiceCloneStatus === 'creating' || !elevenLabsApiKey.trim()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cloneButtonText}>
                    {voiceCloneStatus === 'creating' ? '🔄 Creating Voice Clone...' : 
                     voiceCloneStatus === 'success' ? '✅ Voice Clone Created!' : 
                     voiceCloneStatus === 'error' ? '❌ Clone Failed - Retry' : 
                     '🎭 Create Voice Clone'}
                  </Text>
                </TouchableOpacity>
              )}
              
              {voiceCloneStatus === 'error' && cloneError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>❌ {cloneError}</Text>
                  <Text style={styles.errorHint}>
                    • Check your API key and internet connection
                    {'\n'}• Ensure you have sufficient ElevenLabs credits
                    {'\n'}• Try recording clearer audio samples
                  </Text>
                </View>
              )}
              
              {voiceCloneStatus === 'success' && clonedVoiceId && (
                <View style={styles.successContainer}>
                  <Text style={styles.successText}>🎉 Voice clone created successfully!</Text>
                  <Text style={styles.successHint}>Voice ID: {clonedVoiceId.substring(0, 8)}...</Text>
                  <TouchableOpacity 
                    style={[styles.deleteCloneButton, { backgroundColor: '#DC2626' + '20' }]}
                    onPress={deleteVoiceClone}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.deleteCloneButtonText, { color: '#DC2626' }]}>🗑️ Delete Voice Clone</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.sampleStatusGrid}>
                {SAMPLE_TEXTS.map((_, index) => (
                  <View 
                    key={index}
                    style={[
                      styles.sampleStatusDot,
                      {
                        backgroundColor: recordedSamples[index] 
                          ? currentTheme.colors.primary 
                          : 'rgba(255, 255, 255, 0.2)',
                        borderColor: currentSampleIndex === index 
                          ? currentTheme.colors.primary 
                          : 'transparent',
                        borderWidth: currentSampleIndex === index ? 2 : 0
                      }
                    ]}
                  >
                    <Text style={[
                      styles.sampleStatusText,
                      { color: recordedSamples[index] ? '#FFFFFF' : '#666' }
                    ]}>
                      {index + 1}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.glassCard, { backgroundColor: currentTheme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>Cloned Voice (MP3) Upload</Text>
        <Text style={[styles.apiDescription, { color: currentTheme.colors.text }]}>Upload a single MP3 file of your cloned voice to use for AI Coach TTS.</Text>
        <TouchableOpacity
          testID="settings-upload-voice"
          style={[styles.dataButton]}
          activeOpacity={0.8}
          onPress={async () => {
            try {
              console.log('[Settings] Picking voice mp3');
              const result = await DocumentPicker.getDocumentAsync({ type: 'audio/mpeg', copyToCacheDirectory: true, multiple: false });
              if (result.canceled) return;
              const file = result.assets?.[0];
              if (!file?.uri) {
                Alert.alert('Upload Failed', 'No file selected');
                return;
              }
              await AsyncStorage.setItem('@phoenix_cloned_voice_path', file.uri);
              setClonedVoicePath(file.uri);
              Alert.alert('Voice Set', 'Cloned voice MP3 saved. Phoenix Coach will use it for TTS.');
            } catch (e) {
              console.error('Voice upload error', e);
              Alert.alert('Error', 'Failed to pick file');
            }
          }}
        >
          <LinearGradient colors={[currentTheme.colors.primary, currentTheme.colors.primary + 'AA']} style={styles.dataButtonGradient}>
            <Upload size={20} color="#FFFFFF" />
            <Text style={styles.dataButtonText}>{clonedVoicePath ? 'Replace Cloned Voice' : 'Upload Cloned Voice (MP3)'}</Text>
          </LinearGradient>
        </TouchableOpacity>
        {!!clonedVoicePath && (
          <Text style={[styles.successHint]}>Current file: {clonedVoicePath.substring(0, 40)}...</Text>
        )}
      </View>

      <View style={[styles.glassCard, { backgroundColor: currentTheme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>ElevenLabs API Configuration</Text>
        <Text style={[styles.apiDescription, { color: currentTheme.colors.text }]}> 
          Connect your ElevenLabs account to enable advanced voice cloning features
        </Text>
        
        <View style={styles.apiKeySection}>
          <Text style={[styles.inputLabel, { color: currentTheme.colors.text }]}>API Key</Text>
          <View style={styles.apiKeyInputContainer}>
            {Platform.OS === 'android' ? (
              <TouchableOpacity
                testID="api-key-prompt"
                style={[styles.apiKeyInput, { justifyContent: 'center' }]}
                onPress={() => openPrompt({ title: 'Enter ElevenLabs API Key', initial: apiKeyRef.current || elevenLabsApiKey, secure: true, targetId: apiKeyInputId })}
                activeOpacity={0.7}
              >
                <Text style={{ color: currentTheme.colors.text }}>
                  {(apiKeyRef.current || elevenLabsApiKey) ? (apiKeyVisible ? (apiKeyRef.current || elevenLabsApiKey) : '••••••••••••••••') : 'Tap to enter API key'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TextInput
                nativeID={apiKeyInputId}
                style={[styles.apiKeyInput, { color: currentTheme.colors.text, borderColor: currentTheme.colors.primary }]}
                defaultValue={elevenLabsApiKey}
                onChangeText={Platform.OS !== 'web' ? (text: string) => { apiKeyRef.current = text; } : undefined}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                placeholderTextColor="#8B9DC3"
                secureTextEntry={!apiKeyVisible}
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
            <TouchableOpacity 
              style={[styles.visibilityButton, { backgroundColor: currentTheme.colors.primary + '20' }]}
              onPress={() => setApiKeyVisible(!apiKeyVisible)}
              activeOpacity={0.8}
            >
              <Text style={[styles.visibilityButtonText, { color: currentTheme.colors.primary }]}> 
                {apiKeyVisible ? '👁️' : '👁️‍🗨️'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.apiButtonsContainer}>
            <Pressable 
              style={({ pressed }) => [styles.apiButton, { backgroundColor: pressed ? currentTheme.colors.primary + '35' : currentTheme.colors.primary + '20' }]}
              onPress={saveApiKey}
              android_ripple={{ color: '#ffffff20' }}
              testID="save-elevenlabs-key"
            >
              <Text style={[styles.apiButtonText, { color: currentTheme.colors.primary }]}>💾 Save Key</Text>
            </Pressable>
            
            <Pressable 
              style={({ pressed }) => [
                styles.apiButton, 
                { 
                  backgroundColor: apiConnectionStatus === 'testing' ? '#666' : 
                                 apiConnectionStatus === 'success' ? '#4CAF50' + '20' : 
                                 apiConnectionStatus === 'error' ? '#DC2626' + '20' : 
                                 (pressed ? currentTheme.colors.primary + '35' : currentTheme.colors.primary + '20')
                }
              ]}
              onPress={testApiConnection}
              disabled={apiConnectionStatus === 'testing'}
              android_ripple={{ color: '#ffffff20' }}
              testID="test-elevenlabs-connection"
            >
              <Text style={[
                styles.apiButtonText, 
                { 
                  color: apiConnectionStatus === 'testing' ? '#999' : 
                        apiConnectionStatus === 'success' ? '#4CAF50' : 
                        apiConnectionStatus === 'error' ? '#DC2626' : 
                        currentTheme.colors.primary
                }
              ]}>
                {apiConnectionStatus === 'testing' ? '⏳ Testing...' : 
                 apiConnectionStatus === 'success' ? '✅ Connected' : 
                 apiConnectionStatus === 'error' ? '❌ Failed' : 
                 '🔗 Test Connection'}
              </Text>
            </Pressable>
          </View>
        </View>
        
        <View style={styles.instructionsSection}>
          <Text style={[styles.instructionsTitle, { color: currentTheme.colors.text }]}>How to get your API key:</Text>
          <Text style={[styles.instructionStep, { color: currentTheme.colors.text }]}>1. Visit elevenlabs.io and create an account</Text>
          <Text style={[styles.instructionStep, { color: currentTheme.colors.text }]}>2. Go to your Profile Settings</Text>
          <Text style={[styles.instructionStep, { color: currentTheme.colors.text }]}>3. Navigate to the API Keys section</Text>
          <Text style={[styles.instructionStep, { color: currentTheme.colors.text }]}>4. Generate a new API key</Text>
          <Text style={[styles.instructionStep, { color: currentTheme.colors.text }]}>5. Copy and paste it above</Text>
        </View>
        
        <View style={styles.ethicsSection}>
          <Text style={[styles.ethicsTitle, { color: '#FFC107' }]}>⚠️ Voice Cloning Ethics</Text>
          <Text style={[styles.ethicsText, { color: currentTheme.colors.text }]}> 
            • Only clone your own voice or voices you have explicit permission to use
          </Text>
          <Text style={[styles.ethicsText, { color: currentTheme.colors.text }]}> 
            • Never use this technology to impersonate others without consent
          </Text>
          <Text style={[styles.ethicsText, { color: currentTheme.colors.text }]}> 
            • Be transparent about AI-generated voice content
          </Text>
          <Text style={[styles.ethicsText, { color: currentTheme.colors.text }]}> 
            • Respect privacy and use voice cloning responsibly
          </Text>
        </View>
      </View>

      <View style={[styles.glassCard, { backgroundColor: currentTheme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>Voice Settings</Text>
        
        <View style={styles.voiceSettingRow}>
          <Text style={[styles.voiceSettingLabel, { color: currentTheme.colors.text }]}>Current Voice:</Text>
          <Text style={[styles.voiceSettingValue, { color: currentTheme.colors.primary }]}> 
            Anuna (ElevenLabs)
          </Text>
        </View>
        
        <View style={styles.voiceSettingRow}>
          <Text style={[styles.voiceSettingLabel, { color: currentTheme.colors.text }]}>API Status:</Text>
          <Text style={[styles.voiceSettingValue, { color: (elevenLabsApiKeyLocal || elevenLabsApiKey) ? '#4CAF50' : '#666' }]}> 
            {(elevenLabsApiKeyLocal || elevenLabsApiKey) ? 'API Key Configured' : 'No API Key'}
          </Text>
        </View>
        
        <View style={styles.voiceSettingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.voiceSettingLabel, { color: currentTheme.colors.text }]}>Enable Hey Anuna Wake Word</Text>
            <Text style={{ color: currentTheme.colors.text, opacity: 0.7, marginTop: 4, fontSize: 12 }}>Activates the AI Coach with "Hey Anuna"</Text>
          </View>
          <Pressable
            testID="wake-word-toggle"
            style={[
              styles.toggleSwitch,
              {
                backgroundColor: wakeWordEnabled ? currentTheme.colors.primary : 'rgba(255, 255, 255, 0.2)',
                borderColor: wakeWordEnabled ? currentTheme.colors.primary : 'rgba(255, 255, 255, 0.3)'
              }
            ]}
            onPress={() => {
              const newValue = !wakeWordEnabled;
              updateWakeWordEnabled(newValue);
              console.log('[Settings] Wake word enabled toggled to:', newValue);
            }}
            android_ripple={{ color: '#ffffff20' }}
          >
            <View
              style={[
                styles.toggleThumb,
                {
                  backgroundColor: '#FFFFFF',
                  transform: [{ translateX: wakeWordEnabled ? 20 : 2 }]
                }
              ]}
            />
          </Pressable>
        </View>

        <View style={styles.voiceSettingRow}>
          <Text style={[styles.voiceSettingLabel, { color: currentTheme.colors.text }]}>Sound Effects</Text>
          <Pressable
            testID="toggle-sfx"
            style={[styles.toggleSwitch, { backgroundColor: soundEffectsEnabled ? currentTheme.colors.primary : 'rgba(255,255,255,0.2)', borderColor: soundEffectsEnabled ? currentTheme.colors.primary : 'rgba(255,255,255,0.3)' }]}
            onPress={() => { const v = !soundEffectsEnabled; updateSoundEffectsEnabled(v); console.log('[Settings] SFX:', v); }}
          >
            <View style={[styles.toggleThumb, { backgroundColor: '#FFFFFF', transform: [{ translateX: soundEffectsEnabled ? 20 : 2 }] }]} />
          </Pressable>
        </View>

        <View style={styles.voiceSettingRow}>
          <Text style={[styles.voiceSettingLabel, { color: currentTheme.colors.text }]}>Background Music</Text>
          <Pressable
            testID="toggle-bgm"
            style={[styles.toggleSwitch, { backgroundColor: backgroundMusicEnabled ? currentTheme.colors.primary : 'rgba(255,255,255,0.2)', borderColor: backgroundMusicEnabled ? currentTheme.colors.primary : 'rgba(255,255,255,0.3)' }]}
            onPress={() => { const v = !backgroundMusicEnabled; updateBackgroundMusicEnabled(v); console.log('[Settings] BGM:', v); }}
          >
            <View style={[styles.toggleThumb, { backgroundColor: '#FFFFFF', transform: [{ translateX: backgroundMusicEnabled ? 20 : 2 }] }]} />
          </Pressable>
        </View>

        <View style={styles.voiceSettingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.voiceSettingLabel, { color: currentTheme.colors.text }]}>Auto-read Responses</Text>
            <Text style={{ color: currentTheme.colors.text, opacity: 0.7, marginTop: 4, fontSize: 12 }}>Speak assistant replies automatically</Text>
          </View>
          <Pressable
            testID="toggle-autoread"
            style={[styles.toggleSwitch, { backgroundColor: autoReadResponsesEnabled ? currentTheme.colors.primary : 'rgba(255,255,255,0.2)', borderColor: autoReadResponsesEnabled ? currentTheme.colors.primary : 'rgba(255,255,255,0.3)' }]}
            onPress={() => { const v = !autoReadResponsesEnabled; updateAutoReadResponsesEnabled(v); console.log('[Settings] Auto-read:', v); }}
          >
            <View style={[styles.toggleThumb, { backgroundColor: '#FFFFFF', transform: [{ translateX: autoReadResponsesEnabled ? 20 : 2 }] }]} />
          </Pressable>
        </View>

        <View style={styles.voiceSettingRow}>
          <Text style={[styles.voiceSettingLabel, { color: currentTheme.colors.text }]}>Voice Mode</Text>
          <Pressable
            testID="toggle-voicemode"
            style={[styles.toggleSwitch, { backgroundColor: voiceModeEnabled ? currentTheme.colors.primary : 'rgba(255,255,255,0.2)', borderColor: voiceModeEnabled ? currentTheme.colors.primary : 'rgba(255,255,255,0.3)' }]}
            onPress={() => { const v = !voiceModeEnabled; updateVoiceModeEnabled(v); console.log('[Settings] Voice Mode:', v); }}
          >
            <View style={[styles.toggleThumb, { backgroundColor: '#FFFFFF', transform: [{ translateX: voiceModeEnabled ? 20 : 2 }] }]} />
          </Pressable>
        </View>

        <View style={styles.voiceSettingRow}>
          <Text style={[styles.voiceSettingLabel, { color: currentTheme.colors.text }]}>Emotional Intelligence</Text>
          <Pressable
            testID="toggle-ei"
            style={[styles.toggleSwitch, { backgroundColor: emotionalIntelligenceEnabled ? currentTheme.colors.primary : 'rgba(255,255,255,0.2)', borderColor: emotionalIntelligenceEnabled ? currentTheme.colors.primary : 'rgba(255,255,255,0.3)' }]}
            onPress={() => { const v = !emotionalIntelligenceEnabled; updateEmotionalIntelligenceEnabled(v); console.log('[Settings] Emotional Intelligence:', v); }}
          >
            <View style={[styles.toggleThumb, { backgroundColor: '#FFFFFF', transform: [{ translateX: emotionalIntelligenceEnabled ? 20 : 2 }] }]} />
          </Pressable>
        </View>

        <View style={[styles.sliderRow]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.voiceSettingLabel, { color: currentTheme.colors.text }]}>Speed</Text>
            <Text style={{ color: currentTheme.colors.text, opacity: 0.7, marginTop: 4, fontSize: 12 }}>{ttsSpeed.toFixed(1)}x</Text>
          </View>
          <View style={styles.speedControls}>
            <TouchableOpacity
              testID="speed-decrease"
              style={[styles.speedButton, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.primary }]}
              onPress={() => { const next = Math.max(0.5, +(ttsSpeed - 0.1).toFixed(1)); updateTtsSpeed(next); console.log('[Settings] Speed:', next); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.speedButtonText, { color: currentTheme.colors.text }]}>-</Text>
            </TouchableOpacity>
            <View style={[styles.sliderTrack, { backgroundColor: currentTheme.colors.primary + '22' }]}>
              <View style={[styles.sliderFill, { backgroundColor: currentTheme.colors.primary, width: `${((ttsSpeed - 0.5) / 1.0) * 100}%` }]} />
            </View>
            <TouchableOpacity
              testID="speed-increase"
              style={[styles.speedButton, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.primary }]}
              onPress={() => { const next = Math.min(1.5, +(ttsSpeed + 0.1).toFixed(1)); updateTtsSpeed(next); console.log('[Settings] Speed:', next); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.speedButtonText, { color: currentTheme.colors.text }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          testID="settings-voice-test"
          style={[styles.testVoiceButton, { backgroundColor: currentTheme.colors.primary + '20' }]}
          activeOpacity={0.8}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPressIn={() => {
            if (Platform.OS === 'android') {
              console.log('[Settings] Test Voice onPressIn');
              testClonedVoice();
            }
          }}
          onPress={() => {
            if (Platform.OS !== 'android') {
              console.log('[Settings] Test Voice onPress');
              testClonedVoice();
            }
          }}
        >
          <Text style={[styles.testVoiceButtonText, { color: currentTheme.colors.primary }]}>🔊 Test Voice</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const setColor = (colorType: keyof ThemeColors, color: string) => {
    const newColors = { ...tempColors, [colorType]: color };
    setTempColors(newColors);
    const customTheme: Theme = {
      name: 'Custom',
      colors: newColors
    };
    updateTheme(customTheme);
  };

  const applyTheme = (themeName: string) => {
    const themes = {
      phoenix: {
        primary: '#FF4500',
        secondary: '#1A2B3C', 
        background: '#121212',
        card: 'rgba(26,43,60,0.3)',
        text: '#FFFFFF'
      },
      ocean: {
        primary: '#00CED1',
        secondary: '#003366',
        background: '#001a33',
        card: 'rgba(0,51,102,0.3)',
        text: '#E0FFFF'
      },
      forest: {
        primary: '#228B22',
        secondary: '#013220',
        background: '#0a1f0a',
        card: 'rgba(1,50,32,0.3)',
        text: '#E0FFE0'
      },
      sunset: {
        primary: '#FF1493',
        secondary: '#4B0082',
        background: '#1a0033',
        card: 'rgba(75,0,130,0.3)',
        text: '#FFE0FF'
      },
      minimal: {
        primary: '#808080',
        secondary: '#404040',
        background: '#1a1a1a',
        card: 'rgba(64,64,64,0.3)',
        text: '#E0E0E0'
      }
    };
    
    const theme = themes[themeName as keyof typeof themes];
    if (theme) {
      setTempColors(theme);
      const customTheme: Theme = {
        name: themeName.charAt(0).toUpperCase() + themeName.slice(1),
        colors: theme
      };
      updateTheme(customTheme);
      Alert.alert('Success', `${themeName.charAt(0).toUpperCase() + themeName.slice(1)} theme applied!`);
    }
  };

  const ColorSwatch = ({ color, onPress, active }: { color: string; onPress: () => void; active?: boolean }) => (
    <TouchableOpacity 
      style={[
        styles.colorSwatch, 
        { backgroundColor: color },
        active && styles.activeColorSwatch
      ]} 
      onPress={onPress}
      activeOpacity={0.8}
    />
  );

  const ColorPicker = ({ 
    label, 
    colorType, 
    currentColor, 
    presetColors 
  }: { 
    label: string; 
    colorType: keyof ThemeColors; 
    currentColor: string;
    presetColors: string[];
  }) => (
    <View style={styles.colorPickerGroup}>
      <Text style={[styles.colorLabel, { color: currentTheme.colors.text }]}>{label}</Text>
      <View style={styles.colorControls}>
        <View style={[styles.colorPreview, { backgroundColor: currentColor }]} />
        
        {Platform.OS === 'web' && (
          // @ts-ignore web-only
          <input
            type="color"
            value={currentColor}
            onChange={(e: any) => setColor(colorType, e.target.value)}
            style={{
              width: 60,
              height: 40,
              border: `2px solid ${currentTheme.colors.primary}`,
              borderRadius: 8,
              cursor: 'pointer',
              backgroundColor: 'transparent'
            }}
          />
        )}
        
        <View style={styles.colorSwatches}>
          {presetColors.map((color, index) => (
            <ColorSwatch
              key={index}
              color={color}
              onPress={() => setColor(colorType, color)}
              active={currentColor === color}
            />
          ))}
        </View>
        
        <Text style={[styles.colorValue, { color: currentTheme.colors.text }]}>{currentColor}</Text>
      </View>
    </View>
  );

  const ThemeTab = () => (
    <View style={styles.tabContent}>
      {/* Quick Theme Presets */}
      <View style={[styles.glassCard, { backgroundColor: currentTheme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>Quick Themes</Text>
        <View style={styles.themeGrid}>
          <TouchableOpacity style={styles.themePreset} onPress={() => applyTheme('phoenix')} activeOpacity={0.8}>
            <View style={styles.themePreview}>
              <View style={[styles.themePreviewDot, { backgroundColor: '#FF4500' }]} />
              <View style={[styles.themePreviewDot, { backgroundColor: '#1A2B3C' }]} />
              <View style={[styles.themePreviewDot, { backgroundColor: '#121212' }]} />
            </View>
            <Text style={[styles.themePresetName, { color: currentTheme.colors.text }]}>Phoenix Fire</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.themePreset} onPress={() => applyTheme('ocean')} activeOpacity={0.8}>
            <View style={styles.themePreview}>
              <View style={[styles.themePreviewDot, { backgroundColor: '#00CED1' }]} />
              <View style={[styles.themePreviewDot, { backgroundColor: '#003366' }]} />
              <View style={[styles.themePreviewDot, { backgroundColor: '#001a33' }]} />
            </View>
            <Text style={[styles.themePresetName, { color: currentTheme.colors.text }]}>Ocean Deep</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.themePreset} onPress={() => applyTheme('forest')} activeOpacity={0.8}>
            <View style={styles.themePreview}>
              <View style={[styles.themePreviewDot, { backgroundColor: '#228B22' }]} />
              <View style={[styles.themePreviewDot, { backgroundColor: '#013220' }]} />
              <View style={[styles.themePreviewDot, { backgroundColor: '#0a1f0a' }]} />
            </View>
            <Text style={[styles.themePresetName, { color: currentTheme.colors.text }]}>Forest Night</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.themePreset} onPress={() => applyTheme('sunset')} activeOpacity={0.8}>
            <View style={styles.themePreview}>
              <View style={[styles.themePreviewDot, { backgroundColor: '#FF1493' }]} />
              <View style={[styles.themePreviewDot, { backgroundColor: '#4B0082' }]} />
              <View style={[styles.themePreviewDot, { backgroundColor: '#1a0033' }]} />
            </View>
            <Text style={[styles.themePresetName, { color: currentTheme.colors.text }]}>Sunset Glow</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.themePreset} onPress={() => applyTheme('minimal')} activeOpacity={0.8}>
            <View style={styles.themePreview}>
              <View style={[styles.themePreviewDot, { backgroundColor: '#808080' }]} />
              <View style={[styles.themePreviewDot, { backgroundColor: '#404040' }]} />
              <View style={[styles.themePreviewDot, { backgroundColor: '#1a1a1a' }]} />
            </View>
            <Text style={[styles.themePresetName, { color: currentTheme.colors.text }]}>Minimal Gray</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Color Customization */}
      <View style={[styles.glassCard, { backgroundColor: currentTheme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>Color Customization</Text>
        
        <ColorPicker
          label="Primary Color"
          colorType="primary"
          currentColor={tempColors.primary}
          presetColors={['#FF4500', '#FF6347', '#DC143C', '#B22222', '#FFD700', '#FFA500']}
        />
        
        <ColorPicker
          label="Secondary Color"
          colorType="secondary"
          currentColor={tempColors.secondary}
          presetColors={['#1A2B3C', '#003366', '#013220', '#4B0082', '#404040', '#2F4F4F']}
        />
        
        <ColorPicker
          label="Background Color"
          colorType="background"
          currentColor={tempColors.background}
          presetColors={['#121212', '#001a33', '#0a1f0a', '#1a0033', '#1a1a1a', '#000000']}
        />
        
        <ColorPicker
          label="Text Color"
          colorType="text"
          currentColor={tempColors.text}
          presetColors={['#FFFFFF', '#E0FFFF', '#E0FFE0', '#FFE0FF', '#E0E0E0', '#F5F5F5']}
        />

        <View style={styles.colorButtonsContainer}>
          <TouchableOpacity style={[styles.colorActionButton, { backgroundColor: '#666' + '20' }]} onPress={resetToPhoenixTheme} activeOpacity={0.8}>
            <RotateCcw size={16} color="#666" />
            <Text style={[styles.colorActionButtonText, { color: '#666' }]}>Reset to Phoenix</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Preview */}
      <View style={[styles.glassCard, { backgroundColor: currentTheme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>Live Preview</Text>
        <View style={[styles.previewDashboard, { backgroundColor: currentTheme.colors.background }]}>
          <Text style={[styles.previewHeader, { color: currentTheme.colors.primary }]}>Phoenix Rise</Text>
          <View style={[styles.previewCard, { backgroundColor: currentTheme.colors.card }]}>
            <Text style={[styles.previewCardText, { color: currentTheme.colors.text }]}>Sample Card Content</Text>
          </View>
          <TouchableOpacity style={[styles.previewButton, { backgroundColor: currentTheme.colors.primary }]} activeOpacity={0.8}>
            <Text style={[styles.previewButtonText, { color: currentTheme.colors.text }]}>Action Button</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Built-in Preset Themes */}
      <View style={[styles.glassCard, { backgroundColor: currentTheme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>Built-in Themes</Text>
        
        <View style={styles.presetGrid}>
          {PRESET_THEMES.map((theme, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.presetThemeCard,
                currentTheme.name === theme.name && styles.activePresetTheme
              ]}
              onPress={() => applyPresetTheme(theme)}
              activeOpacity={0.8}
            >
              <View style={styles.presetColorRow}>
                <View style={[styles.presetColorDot, { backgroundColor: theme.colors.primary }]} />
                <View style={[styles.presetColorDot, { backgroundColor: theme.colors.secondary }]} />
                <View style={[styles.presetColorDot, { backgroundColor: theme.colors.background }]} />
              </View>
              <Text style={[styles.presetThemeName, { color: currentTheme.colors.text }]}>{theme.name}</Text>
              {currentTheme.name === theme.name && (
                <View style={[styles.activeIndicator, { backgroundColor: currentTheme.colors.primary }]} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Current Theme Info */}
      <View style={[styles.glassCard, { backgroundColor: currentTheme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>Current Theme</Text>
        
        <View style={styles.currentThemeInfo}>
          <Text style={[styles.currentThemeName, { color: currentTheme.colors.primary }]}> 
            {currentTheme.name}
          </Text>
          <Text style={[styles.currentThemeDescription, { color: currentTheme.colors.text }]}> 
            Colors update immediately as you change them
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={["#000000", currentTheme.colors.background]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.settingsWrapper}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your Phoenix Rise experience</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "profile" && styles.activeTabButton]}
            onPress={() => setActiveTab("profile")}
            activeOpacity={0.8}
          >
            <User size={20} color={activeTab === "profile" ? currentTheme.colors.primary : "#8B9DC3"} />
            <Text style={[styles.tabButtonText, activeTab === "profile" && styles.activeTabButtonText]}>
              Profile
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "data" && styles.activeTabButton]}
            onPress={() => setActiveTab("data")}
            activeOpacity={0.8}
          >
            <Database size={20} color={activeTab === "data" ? currentTheme.colors.primary : "#8B9DC3"} />
            <Text style={[styles.tabButtonText, activeTab === "data" && styles.activeTabButtonText]}>
              Data
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "theme" && styles.activeTabButton]}
            onPress={() => setActiveTab("theme")}
            activeOpacity={0.8}
          >
            <Palette size={20} color={activeTab === "theme" ? currentTheme.colors.primary : "#8B9DC3"} />
            <Text style={[styles.tabButtonText, activeTab === "theme" && styles.activeTabButtonText]}>
              Theme
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "voice" && styles.activeTabButton]}
            onPress={() => setActiveTab("voice")}
            activeOpacity={0.8}
          >
            <Mic size={20} color={activeTab === "voice" ? currentTheme.colors.primary : "#8B9DC3"} />
            <Text style={[styles.tabButtonText, activeTab === "voice" && styles.activeTabButtonText]}>
              Voice
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {activeTab === "profile" ? <ProfileTab /> : 
           activeTab === "data" ? <DataTab /> : 
           activeTab === "theme" ? <ThemeTab /> : 
           <VoiceTab />}
        </ScrollView>
        </View>
      </SafeAreaView>

      {Platform.OS === 'android' && (
        <Modal
          visible={promptVisible}
          transparent
          animationType="fade"
          onRequestClose={cancelPrompt}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{promptTitle}</Text>
              <TextInput
                testID="android-prompt-input"
                style={styles.modalInput}
                value={promptValue}
                onChangeText={(t: string) => setPromptValue(t)}
                autoFocus
                secureTextEntry={promptSecure}
                keyboardType={promptKeyboard}
                placeholderTextColor="#8B9DC3"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={cancelPrompt} style={[styles.modalButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]} activeOpacity={0.8}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmPrompt} style={[styles.modalButton, { backgroundColor: '#FF4500' }]} activeOpacity={0.8}>
                  <Text style={[styles.modalButtonText, { fontWeight: '700' }]}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </LinearGradient>
  );
}

class SettingsErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown, info: unknown) {
    console.log('[Settings] ErrorBoundary caught', { error, info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>Something went wrong in Settings.</Text>
        </View>
      );
    }
    return this.props.children as any;
  }
}

function SettingsScreenWrapped() {
  return (
    <SettingsErrorBoundary>
      <SettingsScreen />
    </SettingsErrorBoundary>
  );
}

export default React.memo(SettingsScreenWrapped);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#8B9DC3",
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: "rgba(255, 69, 0, 0.2)",
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8B9DC3",
    marginLeft: 8,
  },
  activeTabButtonText: {
    color: "#FF4500",
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  glassCard: {
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  saveButton: {
    marginTop: 10,
  },
  saveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 16,
    color: "#8B9DC3",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  phoenixStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  phoenixInfo: {
    marginLeft: 16,
  },
  phoenixPoints: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF4500",
  },
  phoenixLevel: {
    fontSize: 16,
    color: "#8B9DC3",
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FF4500",
    borderRadius: 4,
  },
  levelProgressText: {
    fontSize: 14,
    color: "#8B9DC3",
    textAlign: "center",
  },
  dataButton: {
    marginBottom: 12,
  },
  dataButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  dataButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  dataDescription: {
    fontSize: 14,
    color: "#8B9DC3",
    textAlign: "center",
    marginTop: 8,
  },
  dangerButton: {
    marginTop: 10,
  },
  dangerDescription: {
    fontSize: 14,
    color: "#DC2626",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "500",
  },
  confirmSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.3)",
  },
  confirmText: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "600",
  },
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  confirmDeleteButton: {
    backgroundColor: "rgba(220, 38, 38, 0.8)",
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  colorPickerGroup: {
    marginBottom: 20,
  },
  colorLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  colorPickerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  colorInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  resetButton: {
    marginTop: 20,
  },
  resetButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  presetThemeCard: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  activePresetTheme: {
    borderColor: "#FF4500",
  },
  presetColorRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  presetColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  presetThemeName: {
    fontSize: 14,
    fontWeight: "600",
  },
  activeIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  currentThemeInfo: {
    alignItems: "center",
  },
  currentThemeName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  currentThemeDescription: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.8,
  },
  voiceDescription: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.8,
  },
  voiceCardsContainer: {
    gap: 16,
  },
  voiceCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  selectedVoiceCard: {
    borderColor: "#FF4500",
    backgroundColor: "rgba(255, 69, 0, 0.1)",
  },
  disabledVoiceCard: {
    opacity: 0.6,
  },
  voiceCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  voiceCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  voiceCardDescription: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  selectedIndicator: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  comingSoonBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(255, 193, 7, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 193, 7, 0.5)",
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFC107",
  },
  voiceSettingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  voiceSettingLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  voiceSettingValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  recordingInterface: {
    alignItems: "center",
    paddingVertical: 20,
  },
  sampleCounter: {
    marginBottom: 20,
  },
  sampleCounterText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  sampleTextContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  sampleText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    fontStyle: "italic",
  },
  recordButtonContainer: {
    marginBottom: 30,
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    padding: 6,
  },
  recordButtonGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  recordButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  recordDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 30,
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 1,
    minWidth: 100,
    alignItems: "center",
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  recordingProgress: {
    width: "100%",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    opacity: 0.8,
  },
  recordingIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingPulse: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginBottom: 4,
  },
  recordingTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recordingControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
    flexWrap: 'wrap',
  },
  controlButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  waveformContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 40,
    gap: 2,
    marginBottom: 12,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 4,
  },
  recordingStatus: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sampleStatusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  sampleStatusDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  apiDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
    lineHeight: 20,
  },
  apiKeySection: {
    marginBottom: 24,
  },
  apiKeyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  apiKeyInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  visibilityButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  visibilityButtonText: {
    fontSize: 16,
  },
  apiButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  apiButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  apiButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  instructionsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionStep: {
    fontSize: 14,
    marginBottom: 6,
    opacity: 0.9,
    lineHeight: 20,
  },
  ethicsSection: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  ethicsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  ethicsText: {
    fontSize: 13,
    marginBottom: 6,
    opacity: 0.9,
    lineHeight: 18,
  },
  cloneButton: {
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 12,
    color: '#DC2626',
    opacity: 0.8,
    lineHeight: 16,
  },
  successContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    alignItems: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  successHint: {
    fontSize: 12,
    color: '#4CAF50',
    opacity: 0.8,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  deleteCloneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  deleteCloneButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  testVoiceButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 0, 0.3)',
  },
  testVoiceButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  speedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  speedButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  speedButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  sliderTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 4,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    position: 'relative',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
  },
  colorButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  colorActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  colorActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingsWrapper: {
    flex: 1,
  },
  // New color picker styles
  colorControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  colorSwatches: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  colorSwatch: {
    width: 35,
    height: 35,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeColorSwatch: {
    borderColor: '#FF4500',
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  colorValue: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    opacity: 0.8,
  },
  // Theme preset styles
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  themePreset: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themePreview: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
  },
  themePreviewDot: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  themePresetName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Live preview styles
  previewDashboard: {
    padding: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  previewHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  previewCard: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewCardText: {
    fontSize: 16,
    textAlign: 'center',
  },
  previewButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: 'rgba(26, 43, 60, 0.95)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});
