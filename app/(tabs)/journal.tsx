import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Share,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  Heart, 
  Trash2, 
  Edit3, 
  Download,
  Search,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Volume2,
  Headphones,
  MessageSquare,
  Zap,
  SkipForward,
  SkipBack,
} from "lucide-react-native";
import { useWellness } from "@/providers/WellnessProvider";

type MoodType = "😊" | "🙂" | "😐" | "😟" | "😔";

interface VoiceRecording {
  id: string;
  uri: string;
  duration: number;
  transcription?: string;
  type: 'mood' | 'gratitude' | 'goal' | 'craving' | 'victory' | 'general';
  prompt?: string;
  date: Date;
  energyLevel?: number;
  tags?: string[];
}

interface VoiceNote {
  id: string;
  title: string;
  recordings: VoiceRecording[];
  date: Date;
  totalDuration: number;
}

export default function JournalScreen() {
  const { journalEntries, addJournalEntry, updateJournalEntry, deleteJournalEntry } = useWellness();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [moodFilter, setMoodFilter] = useState<MoodType | 'all'>('all');
  
  // Form fields
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState<MoodType>("🙂");
  const [gratitude, setGratitude] = useState("");
  const [challenges, setChallenges] = useState("");
  const [wins, setWins] = useState("");
  const [tomorrowFocus, setTomorrowFocus] = useState("");
  const [content, setContent] = useState("");
  
  // Voice recording state
  const [showVoiceSection, setShowVoiceSection] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [currentPlayback, setCurrentPlayback] = useState<Audio.Sound | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<any>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const { width } = Dimensions.get('window');

  const moods = useMemo(() => [
    { value: "😊" as const, label: "Joyful", color: "#4CAF50" },
    { value: "🙂" as const, label: "Good", color: "#2196F3" },
    { value: "😐" as const, label: "Neutral", color: "#9E9E9E" },
    { value: "😟" as const, label: "Worried", color: "#FF9800" },
    { value: "😔" as const, label: "Sad", color: "#F44336" },
  ], []);
  
  const voicePrompts = useMemo(() => [
    { id: 'mood', title: 'Mood Check-in', prompt: 'How are you rising today? Describe your current mood and energy.', duration: 30, icon: '😊' },
    { id: 'gratitude', title: 'Gratitude Burst', prompt: 'Rapid-fire gratitudes! What are you grateful for right now?', duration: 60, icon: '🙏' },
    { id: 'goal', title: 'Goal Commitment', prompt: 'State your goal out loud. What are you committed to achieving?', duration: 45, icon: '🎯' },
    { id: 'craving', title: 'Craving Confession', prompt: 'Talk through any cravings or challenges you\'re facing right now.', duration: 90, icon: '⚡' },
    { id: 'victory', title: 'Victory Celebration', prompt: 'Celebrate your wins! What victories, big or small, happened today?', duration: 60, icon: '🏆' },
    { id: 'general', title: 'Free Voice', prompt: 'Speak freely about anything on your mind.', duration: 300, icon: '🎤' },
  ], []);
  
  const dailyQuestions = useMemo(() => [
    "How are you rising today?",
    "What's one thing you're grateful for?",
    "What would make today amazing?",
    "What challenge are you ready to face?",
    "How do you want to feel at the end of today?",
  ], []);

  const resetForm = () => {
    setTitle("");
    setMood("🙂");
    setGratitude("");
    setChallenges("");
    setWins("");
    setTomorrowFocus("");
    setContent("");
    setEditingEntry(null);
    setTranscriptionText("");
  };
  
  // Voice recording functions
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };
  
  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };
  
  const startWaveAnimation = () => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  };
  
  const stopWaveAnimation = () => {
    waveAnim.stopAnimation();
    waveAnim.setValue(0);
  };
  
  const requestAudioPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record voice notes.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  };
  
  const startRecording = async (promptType?: string) => {
    try {
      const hasPermission = await requestAudioPermissions();
      if (!hasPermission) return;
      
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }
      
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);
      setSelectedPrompt(promptType || null);
      
      startPulseAnimation();
      startWaveAnimation();
      
      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000) as ReturnType<typeof setInterval>;
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };
  
  const pauseRecording = async () => {
    if (!recording) return;
    
    try {
      if (isPaused) {
        await recording.startAsync();
        setIsPaused(false);
        startPulseAnimation();
        recordingTimer.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000) as ReturnType<typeof setInterval>;
      } else {
        await recording.pauseAsync();
        setIsPaused(true);
        stopPulseAnimation();
        if (recordingTimer.current) {
          clearInterval(recordingTimer.current);
        }
      }
    } catch (error) {
      console.error('Failed to pause/resume recording:', error);
    }
  };
  
  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        const newRecording: VoiceRecording = {
          id: Date.now().toString(),
          uri,
          duration: recordingDuration,
          type: (selectedPrompt as any) || 'general',
          prompt: selectedPrompt ? voicePrompts.find(p => p.id === selectedPrompt)?.prompt : undefined,
          date: new Date(),
          energyLevel: Math.floor(Math.random() * 10) + 1, // Simulated
        };
        
        // Add to voice notes
        const existingNote = voiceNotes.find(note => 
          new Date(note.date).toDateString() === new Date().toDateString()
        );
        
        if (existingNote) {
          const updatedNotes = voiceNotes.map(note => 
            note.id === existingNote.id 
              ? {
                  ...note,
                  recordings: [...note.recordings, newRecording],
                  totalDuration: note.totalDuration + recordingDuration,
                }
              : note
          );
          setVoiceNotes(updatedNotes);
        } else {
          const newNote: VoiceNote = {
            id: Date.now().toString(),
            title: `Voice Journal - ${new Date().toLocaleDateString()}`,
            recordings: [newRecording],
            date: new Date(),
            totalDuration: recordingDuration,
          };
          setVoiceNotes([newNote, ...voiceNotes]);
        }
        
        // Simulate transcription
        setTimeout(() => {
          simulateTranscription(newRecording.id);
        }, 1000);
      }
      
      setRecording(null);
      setIsRecording(false);
      setIsPaused(false);
      setRecordingDuration(0);
      setSelectedPrompt(null);
      
      stopPulseAnimation();
      stopWaveAnimation();
      
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      }
      
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };
  
  const simulateTranscription = (recordingId: string) => {
    setIsTranscribing(true);
    
    // Simulate transcription with sample text based on prompt type
    setTimeout(() => {
      const sampleTranscriptions = {
        mood: "I'm feeling pretty good today, maybe a 7 out of 10. I woke up with some energy and I'm ready to tackle my goals. There's a bit of anxiety about the presentation later, but overall I'm optimistic.",
        gratitude: "I'm grateful for my morning coffee, for having a roof over my head, for my family's health, and for this opportunity to reflect and grow. Also grateful for the sunshine today.",
        goal: "My main goal today is to complete the project proposal and send it to the client. I'm committed to finishing it by 3 PM and then reviewing it once more before sending.",
        craving: "I'm having some cravings for sugar right now, probably because I'm stressed about work. I know this is just my brain looking for a quick dopamine hit. I'm going to drink some water and take a few deep breaths instead.",
        victory: "I successfully completed my morning workout, even though I didn't feel like it. I also meal prepped for the week and stuck to my budget when grocery shopping. Small wins but they add up!",
        general: "Just reflecting on the day and thinking about how I can improve tomorrow. There's always room for growth and I'm committed to this journey of becoming the best version of myself."
      };
      
      const updatedNotes = voiceNotes.map(note => ({
        ...note,
        recordings: note.recordings.map(rec => 
          rec.id === recordingId 
            ? { ...rec, transcription: sampleTranscriptions[rec.type as keyof typeof sampleTranscriptions] || sampleTranscriptions.general }
            : rec
        )
      }));
      
      setVoiceNotes(updatedNotes);
      setIsTranscribing(false);
    }, 2000);
  };
  
  const playRecording = async (uri: string, recordingId: string) => {
    try {
      if (currentPlayback) {
        await currentPlayback.unloadAsync();
      }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, rate: playbackSpeed }
      );
      
      setCurrentPlayback(sound);
      setCurrentRecordingId(recordingId);
      
      sound.setOnPlaybackStatusUpdate((status: any) => {
        setPlaybackStatus(status);
        if (status.didJustFinish) {
          setCurrentRecordingId(null);
        }
      });
      
    } catch (error) {
      console.error('Failed to play recording:', error);
      Alert.alert('Error', 'Failed to play recording.');
    }
  };
  
  const pausePlayback = async () => {
    if (currentPlayback) {
      await currentPlayback.pauseAsync();
    }
  };
  
  const resumePlayback = async () => {
    if (currentPlayback) {
      await currentPlayback.playAsync();
    }
  };
  
  const stopPlayback = async () => {
    if (currentPlayback) {
      await currentPlayback.stopAsync();
      await currentPlayback.unloadAsync();
      setCurrentPlayback(null);
      setCurrentRecordingId(null);
      setPlaybackStatus(null);
    }
  };
  
  const skipForward = async () => {
    if (currentPlayback && playbackStatus) {
      const newPosition = Math.min(
        playbackStatus.positionMillis + 10000,
        playbackStatus.durationMillis || 0
      );
      await currentPlayback.setPositionAsync(newPosition);
    }
  };
  
  const skipBackward = async () => {
    if (currentPlayback && playbackStatus) {
      const newPosition = Math.max(playbackStatus.positionMillis - 10000, 0);
      await currentPlayback.setPositionAsync(newPosition);
    }
  };
  
  const changePlaybackSpeed = async (speed: number) => {
    setPlaybackSpeed(speed);
    if (currentPlayback) {
      await currentPlayback.setRateAsync(speed, true);
    }
  };
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const deleteVoiceNote = (noteId: string) => {
    Alert.alert(
      'Delete Voice Note',
      'Are you sure you want to delete this voice note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setVoiceNotes(voiceNotes.filter(note => note.id !== noteId));
          }
        }
      ]
    );
  };
  
  const addTranscriptionToForm = (transcription: string, type: string) => {
    switch (type) {
      case 'gratitude':
        setGratitude(prev => prev + (prev ? '\n\n' : '') + transcription);
        break;
      case 'craving':
        setChallenges(prev => prev + (prev ? '\n\n' : '') + transcription);
        break;
      case 'victory':
        setWins(prev => prev + (prev ? '\n\n' : '') + transcription);
        break;
      case 'goal':
        setTomorrowFocus(prev => prev + (prev ? '\n\n' : '') + transcription);
        break;
      default:
        setContent(prev => prev + (prev ? '\n\n' : '') + transcription);
    }
    setShowForm(true);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentPlayback) {
        currentPlayback.unloadAsync();
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, []);

  const handleSaveEntry = () => {
    if (!gratitude.trim() && !challenges.trim() && !wins.trim() && !content.trim()) {
      Alert.alert("Error", "Please fill in at least one section");
      return;
    }

    const entryData = {
      title: title.trim() || `Entry for ${new Date().toLocaleDateString()}`,
      mood,
      gratitude: gratitude.trim(),
      challenges: challenges.trim(),
      wins: wins.trim(),
      tomorrowFocus: tomorrowFocus.trim(),
      content: content.trim(),
    };

    if (editingEntry) {
      updateJournalEntry(editingEntry, entryData);
    } else {
      addJournalEntry(entryData);
    }

    resetForm();
    setShowForm(false);
  };

  const handleEditEntry = (entry: any) => {
    setTitle(entry.title);
    setMood(entry.mood);
    setGratitude(entry.gratitude || "");
    setChallenges(entry.challenges || "");
    setWins(entry.wins || "");
    setTomorrowFocus(entry.tomorrowFocus || "");
    setContent(entry.content || "");
    setEditingEntry(entry.id);
    setShowForm(true);
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const exportEntries = async () => {
    const exportText = journalEntries.map(entry => {
      const date = formatDate(entry.date);
      const moodData = moods.find(m => m.value === entry.mood);
      
      return `${date} - ${entry.title}\nMood: ${entry.mood} ${moodData?.label}\n\nGratitude:\n${entry.gratitude || 'N/A'}\n\nChallenges:\n${entry.challenges || 'N/A'}\n\nWins:\n${entry.wins || 'N/A'}\n\nTomorrow's Focus:\n${entry.tomorrowFocus || 'N/A'}\n\nFree Write:\n${entry.content || 'N/A'}\n\n${'='.repeat(50)}\n\n`;
    }).join('');

    if (Platform.OS === 'web') {
      const blob = new Blob([exportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phoenix-journal-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      try {
        await Share.share({
          message: exportText,
          title: 'Phoenix Rise Journal Export'
        });
      } catch {
        Alert.alert('Error', 'Failed to export entries');
      }
    }
  };

  const filteredEntries = useMemo(() => {
    return journalEntries.filter(entry => {
      const matchesSearch = searchQuery === '' || 
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.gratitude?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.challenges?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.wins?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesMood = moodFilter === 'all' || entry.mood === moodFilter;
      
      return matchesSearch && matchesMood;
    });
  }, [journalEntries, searchQuery, moodFilter]);

  const journalStreak = useMemo(() => {
    if (journalEntries.length === 0) return 0;
    
    const sortedEntries = [...journalEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let streak = 0;
    let currentDate = new Date();
    
    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.date);
      const daysDiff = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
        currentDate = entryDate;
      } else {
        break;
      }
    }
    
    return streak;
  }, [journalEntries]);

  const moodTrends = useMemo(() => {
    const last30Days = journalEntries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return entryDate >= thirtyDaysAgo;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const moodCounts = moods.reduce((acc, mood) => {
      acc[mood.value] = last30Days.filter(entry => entry.mood === mood.value).length;
      return acc;
    }, {} as Record<MoodType, number>);
    
    return { entries: last30Days, counts: moodCounts };
  }, [journalEntries, moods]);

  const commonGratitudes = useMemo(() => {
    const gratitudeWords = journalEntries
      .flatMap(entry => entry.gratitude?.toLowerCase().split(/\s+/) || [])
      .filter(word => word.length > 3)
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    return Object.entries(gratitudeWords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));
  }, [journalEntries]);

  return (
    <LinearGradient colors={["#000000", "#121212"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <BookOpen size={40} color="#FF4500" />
            <Text style={styles.title}>Journal</Text>
            <Text style={styles.subtitle}>Reflect on your journey</Text>
          </View>

          {/* Phoenix Voice Journal Section */}
          <View style={styles.voiceSection}>
            <View style={styles.voiceSectionHeader}>
              <View style={styles.voiceHeaderLeft}>
                <Headphones size={24} color="#FF4500" />
                <Text style={styles.voiceSectionTitle}>Phoenix Voice Journal</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowVoiceSection(!showVoiceSection)}
                style={styles.voiceToggleButton}
              >
                <Text style={styles.voiceToggleText}>
                  {showVoiceSection ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {showVoiceSection && (
              <View style={styles.voiceContent}>
                {/* Voice Prompts */}
                <Text style={styles.voiceSubtitle}>Quick Voice Notes</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptsContainer}>
                  {voicePrompts.map((prompt) => (
                    <TouchableOpacity
                      key={prompt.id}
                      onPress={() => startRecording(prompt.id)}
                      style={[
                        styles.promptCard,
                        selectedPrompt === prompt.id && styles.promptCardActive
                      ]}
                      disabled={isRecording}
                    >
                      <Text style={styles.promptIcon}>{prompt.icon}</Text>
                      <Text style={styles.promptTitle}>{prompt.title}</Text>
                      <Text style={styles.promptDuration}>{prompt.duration}s</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {/* Recording Controls */}
                <View style={styles.recordingControls}>
                  {!isRecording ? (
                    <TouchableOpacity
                      onPress={() => startRecording()}
                      style={styles.recordButton}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#FF4500', '#FF6347']}
                        style={styles.recordButtonGradient}
                      >
                        <Mic size={32} color="#FFFFFF" />
                        <Text style={styles.recordButtonText}>Start Recording</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.activeRecordingContainer}>
                      <Animated.View
                        style={[
                          styles.recordingIndicator,
                          {
                            transform: [{ scale: pulseAnim }]
                          }
                        ]}
                      >
                        <MicOff size={24} color="#FFFFFF" />
                      </Animated.View>
                      
                      <View style={styles.recordingInfo}>
                        <Text style={styles.recordingDurationText}>
                          {formatDuration(recordingDuration)}
                        </Text>
                        {selectedPrompt && (
                          <Text style={styles.recordingPromptText}>
                            {voicePrompts.find(p => p.id === selectedPrompt)?.title}
                          </Text>
                        )}
                      </View>
                      
                      <View style={styles.recordingActions}>
                        <TouchableOpacity
                          onPress={pauseRecording}
                          style={styles.recordingActionButton}
                        >
                          {isPaused ? (
                            <Play size={20} color="#2196F3" />
                          ) : (
                            <Pause size={20} color="#FF9800" />
                          )}
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          onPress={stopRecording}
                          style={[styles.recordingActionButton, styles.stopButton]}
                        >
                          <Square size={20} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
                
                {/* Voice Waveform Visualization */}
                {isRecording && (
                  <View style={styles.waveformContainer}>
                    {Array.from({ length: 20 }).map((_, index) => (
                      <Animated.View
                        key={index}
                        style={[
                          styles.waveformBar,
                          {
                            height: Animated.multiply(
                              waveAnim,
                              Math.random() * 30 + 10
                            ),
                            opacity: Animated.multiply(waveAnim, 0.8)
                          }
                        ]}
                      />
                    ))}
                  </View>
                )}
                
                {/* Voice Notes List */}
                {voiceNotes.length > 0 && (
                  <View style={styles.voiceNotesSection}>
                    <Text style={styles.voiceNotesTitle}>Recent Voice Notes</Text>
                    {voiceNotes.slice(0, 3).map((note) => (
                      <View key={note.id} style={styles.voiceNoteCard}>
                        <View style={styles.voiceNoteHeader}>
                          <View style={styles.voiceNoteInfo}>
                            <Text style={styles.voiceNoteTitle}>{note.title}</Text>
                            <Text style={styles.voiceNoteMeta}>
                              {note.recordings.length} recordings • {formatDuration(note.totalDuration)}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => deleteVoiceNote(note.id)}
                            style={styles.voiceNoteDeleteButton}
                          >
                            <Trash2 size={16} color="#FF4500" />
                          </TouchableOpacity>
                        </View>
                        
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {note.recordings.map((recording) => (
                            <View key={recording.id} style={styles.recordingItem}>
                              <View style={styles.recordingItemHeader}>
                                <Text style={styles.recordingType}>
                                  {voicePrompts.find(p => p.id === recording.type)?.icon || '🎤'}
                                </Text>
                                <Text style={styles.recordingDuration}>
                                  {formatDuration(recording.duration)}
                                </Text>
                              </View>
                              
                              <View style={styles.recordingControls}>
                                <TouchableOpacity
                                  onPress={() => playRecording(recording.uri, recording.id)}
                                  style={styles.playButton}
                                >
                                  {currentRecordingId === recording.id && playbackStatus?.isPlaying ? (
                                    <Pause size={16} color="#2196F3" />
                                  ) : (
                                    <Play size={16} color="#2196F3" />
                                  )}
                                </TouchableOpacity>
                                
                                {currentRecordingId === recording.id && (
                                  <View style={styles.playbackControls}>
                                    <TouchableOpacity onPress={skipBackward} style={styles.skipButton}>
                                      <SkipBack size={14} color="#8B9DC3" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={skipForward} style={styles.skipButton}>
                                      <SkipForward size={14} color="#8B9DC3" />
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                              
                              {recording.transcription && (
                                <View style={styles.transcriptionContainer}>
                                  <Text style={styles.transcriptionText} numberOfLines={3}>
                                    {recording.transcription}
                                  </Text>
                                  <TouchableOpacity
                                    onPress={() => addTranscriptionToForm(recording.transcription!, recording.type)}
                                    style={styles.addToFormButton}
                                  >
                                    <MessageSquare size={12} color="#FF4500" />
                                    <Text style={styles.addToFormText}>Add to Journal</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                              
                              {isTranscribing && currentRecordingId === recording.id && (
                                <View style={styles.transcribingContainer}>
                                  <Text style={styles.transcribingText}>Transcribing...</Text>
                                  <View style={styles.transcribingDots}>
                                    <Text style={styles.transcribingDot}>•</Text>
                                    <Text style={styles.transcribingDot}>•</Text>
                                    <Text style={styles.transcribingDot}>•</Text>
                                  </View>
                                </View>
                              )}
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Playback Speed Control */}
                {currentPlayback && (
                  <View style={styles.playbackSpeedContainer}>
                    <Text style={styles.playbackSpeedLabel}>Playback Speed:</Text>
                    <View style={styles.speedButtons}>
                      {[0.5, 1.0, 1.5, 2.0].map((speed) => (
                        <TouchableOpacity
                          key={speed}
                          onPress={() => changePlaybackSpeed(speed)}
                          style={[
                            styles.speedButton,
                            playbackSpeed === speed && styles.speedButtonActive
                          ]}
                        >
                          <Text style={[
                            styles.speedButtonText,
                            playbackSpeed === speed && styles.speedButtonTextActive
                          ]}>
                            {speed}x
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
          
          {/* Add Entry Form */}
          {showForm ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {editingEntry ? 'Edit Journal Entry' : 'New Journal Entry'}
              </Text>
              
              <TextInput
                style={styles.input}
                placeholder="Title (optional)"
                placeholderTextColor="#8B9DC3"
                value={title}
                onChangeText={setTitle}
              />
              
              <Text style={styles.inputLabel}>How are you feeling?</Text>
              <View style={styles.moodSelector}>
                {moods.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    onPress={() => setMood(m.value)}
                    style={[
                      styles.moodOption,
                      mood === m.value && styles.moodOptionActive,
                      mood === m.value && { borderColor: m.color },
                    ]}
                  >
                    <Text style={styles.moodEmoji}>{m.value}</Text>
                    <Text
                      style={[
                        styles.moodText,
                        mood === m.value && styles.moodTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.inputLabel}>What are you grateful for?</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="List things you&apos;re grateful for today..."
                placeholderTextColor="#8B9DC3"
                value={gratitude}
                onChangeText={setGratitude}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              
              <Text style={styles.inputLabel}>What challenges did you face?</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe any challenges or difficulties..."
                placeholderTextColor="#8B9DC3"
                value={challenges}
                onChangeText={setChallenges}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              
              <Text style={styles.inputLabel}>What were your wins today?</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Celebrate your achievements and victories..."
                placeholderTextColor="#8B9DC3"
                value={wins}
                onChangeText={setWins}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              
              <Text style={styles.inputLabel}>Tomorrow&apos;s focus</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What do you want to focus on tomorrow?"
                placeholderTextColor="#8B9DC3"
                value={tomorrowFocus}
                onChangeText={setTomorrowFocus}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
              
              <Text style={styles.inputLabel}>Free write</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write anything else on your mind..."
                placeholderTextColor="#8B9DC3"
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              
              <View style={styles.formButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveEntry} activeOpacity={0.8}>
                  <LinearGradient
                    colors={["#FF4500", "#FF6347"]}
                    style={styles.saveButton}
                  >
                    <Text style={styles.saveButtonText}>
                      {editingEntry ? 'Update Entry' : 'Save Entry'} (+3 Points)
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowForm(true)}
              activeOpacity={0.8}
              style={styles.addButtonContainer}
            >
              <LinearGradient
                colors={["#1A2B3C", "#003366"]}
                style={styles.addButton}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Write New Entry</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Stats Cards */}
          {journalEntries.length > 0 && (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{journalEntries.length}</Text>
                <Text style={styles.statLabel}>Total Entries</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{journalStreak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
              <TouchableOpacity onPress={exportEntries} style={styles.statCard}>
                <Download size={24} color="#FF4500" />
                <Text style={styles.statLabel}>Export</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search and Filter */}
          {journalEntries.length > 0 && (
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Search size={20} color="#8B9DC3" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search entries..."
                  placeholderTextColor="#8B9DC3"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodFilters}>
                <TouchableOpacity
                  onPress={() => setMoodFilter('all')}
                  style={[
                    styles.moodFilterButton,
                    moodFilter === 'all' && styles.moodFilterButtonActive
                  ]}
                >
                  <Text style={[
                    styles.moodFilterText,
                    moodFilter === 'all' && styles.moodFilterTextActive
                  ]}>All</Text>
                </TouchableOpacity>
                {moods.map((mood) => (
                  <TouchableOpacity
                    key={mood.value}
                    onPress={() => setMoodFilter(mood.value)}
                    style={[
                      styles.moodFilterButton,
                      moodFilter === mood.value && styles.moodFilterButtonActive
                    ]}
                  >
                    <Text style={styles.moodFilterEmoji}>{mood.value}</Text>
                    <Text style={[
                      styles.moodFilterText,
                      moodFilter === mood.value && styles.moodFilterTextActive
                    ]}>{mood.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Journal Entries */}
          <View style={styles.entriesSection}>
            {filteredEntries.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {journalEntries.length === 0 ? 'Your journal is empty' : 'No entries match your search'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {journalEntries.length === 0 
                    ? 'Start documenting your transformation journey'
                    : 'Try adjusting your search or filters'
                  }
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Your Entries ({filteredEntries.length})</Text>
                {filteredEntries.map((entry) => {
                  const moodData = moods.find((m) => m.value === entry.mood);
                  
                  return (
                    <View key={entry.id} style={styles.entryCard}>
                      <View style={styles.entryHeader}>
                        <View style={styles.entryMeta}>
                          <Calendar size={16} color="#8B9DC3" />
                          <Text style={styles.entryDate}>
                            {formatDate(entry.date)}
                          </Text>
                          <Text style={styles.entryTime}>
                            {formatTime(entry.date)}
                          </Text>
                        </View>
                        <View style={styles.entryActions}>
                          <TouchableOpacity
                            onPress={() => handleEditEntry(entry)}
                            style={styles.editButton}
                          >
                            <Edit3 size={16} color="#2196F3" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              Alert.alert(
                                "Delete Entry",
                                "Are you sure you want to delete this journal entry?",
                                [
                                  { text: "Cancel", style: "cancel" },
                                  {
                                    text: "Delete",
                                    style: "destructive",
                                    onPress: () => deleteJournalEntry(entry.id),
                                  },
                                ]
                              );
                            }}
                            style={styles.deleteButton}
                          >
                            <Trash2 size={16} color="#FF4500" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <View style={styles.entryMoodContainer}>
                        <View
                          style={[
                            styles.moodBadge,
                            { backgroundColor: moodData?.color + "20" },
                          ]}
                        >
                          <Text style={styles.moodBadgeEmoji}>
                            {entry.mood}
                          </Text>
                          <Text
                            style={[
                              styles.moodBadgeText,
                              { color: moodData?.color },
                            ]}
                          >
                            {moodData?.label}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={styles.entryTitle}>{entry.title}</Text>
                      
                      {entry.gratitude && (
                        <View style={styles.entrySection}>
                          <Text style={styles.entrySectionTitle}>🙏 Gratitude</Text>
                          <Text style={styles.entrySectionContent}>{entry.gratitude}</Text>
                          <Text style={styles.wordCount}>{getWordCount(entry.gratitude)} words</Text>
                        </View>
                      )}
                      
                      {entry.challenges && (
                        <View style={styles.entrySection}>
                          <Text style={styles.entrySectionTitle}>⚡ Challenges</Text>
                          <Text style={styles.entrySectionContent}>{entry.challenges}</Text>
                          <Text style={styles.wordCount}>{getWordCount(entry.challenges)} words</Text>
                        </View>
                      )}
                      
                      {entry.wins && (
                        <View style={styles.entrySection}>
                          <Text style={styles.entrySectionTitle}>🏆 Wins</Text>
                          <Text style={styles.entrySectionContent}>{entry.wins}</Text>
                          <Text style={styles.wordCount}>{getWordCount(entry.wins)} words</Text>
                        </View>
                      )}
                      
                      {entry.tomorrowFocus && (
                        <View style={styles.entrySection}>
                          <Text style={styles.entrySectionTitle}>🎯 Tomorrow&apos;s Focus</Text>
                          <Text style={styles.entrySectionContent}>{entry.tomorrowFocus}</Text>
                          <Text style={styles.wordCount}>{getWordCount(entry.tomorrowFocus)} words</Text>
                        </View>
                      )}
                      
                      {entry.content && (
                        <View style={styles.entrySection}>
                          <Text style={styles.entrySectionTitle}>✍️ Free Write</Text>
                          <Text style={styles.entrySectionContent}>{entry.content}</Text>
                          <Text style={styles.wordCount}>{getWordCount(entry.content)} words</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </View>

          {/* Insights Section */}
          {journalEntries.length > 0 && (
            <View style={styles.insightsSection}>
              <Text style={styles.sectionTitle}>📊 Insights</Text>
              
              {/* Mood Trends */}
              <View style={styles.insightCard}>
                <Text style={styles.insightTitle}>Mood Trends (Last 30 Days)</Text>
                <View style={styles.moodTrendContainer}>
                  {moods.map((mood) => {
                    const count = moodTrends.counts[mood.value] || 0;
                    const percentage = moodTrends.entries.length > 0 
                      ? Math.round((count / moodTrends.entries.length) * 100) 
                      : 0;
                    
                    return (
                      <View key={mood.value} style={styles.moodTrendItem}>
                        <Text style={styles.moodTrendEmoji}>{mood.value}</Text>
                        <View style={styles.moodTrendBar}>
                          <View 
                            style={[
                              styles.moodTrendFill,
                              { width: `${percentage}%`, backgroundColor: mood.color }
                            ]} 
                          />
                        </View>
                        <Text style={styles.moodTrendCount}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              
              {/* Common Gratitudes */}
              {commonGratitudes.length > 0 && (
                <View style={styles.insightCard}>
                  <Text style={styles.insightTitle}>Most Common Gratitudes</Text>
                  <View style={styles.gratitudeList}>
                    {commonGratitudes.map(({ word, count }, index) => (
                      <View key={word} style={styles.gratitudeItem}>
                        <Text style={styles.gratitudeRank}>#{index + 1}</Text>
                        <Text style={styles.gratitudeWord}>{word}</Text>
                        <Text style={styles.gratitudeCount}>{count}x</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Inspiration Quote */}
          <View style={styles.inspirationCard}>
            <Heart size={24} color="#FF4500" />
            <Text style={styles.inspirationText}>
              &quot;Journaling is like whispering to one&apos;s self and listening at the same time.&quot;
            </Text>
            <Text style={styles.inspirationAuthor}>- Mina Murray</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

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
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 10,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#8B9DC3",
  },
  formCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 15,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 15,
  },
  input: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    color: "#FFFFFF",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 157, 195, 0.2)",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  inputLabel: {
    fontSize: 14,
    color: "#8B9DC3",
    marginBottom: 10,
  },
  moodSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  moodOption: {
    alignItems: "center",
    padding: 10,
    backgroundColor: "rgba(26, 43, 60, 0.5)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
    flex: 1,
    marginHorizontal: 3,
  },
  moodOptionActive: {
    backgroundColor: "rgba(255, 69, 0, 0.1)",
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  moodText: {
    fontSize: 11,
    color: "#8B9DC3",
  },
  moodTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  formButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#8B9DC3",
  },
  cancelButtonText: {
    color: "#8B9DC3",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    padding: 15,
    borderRadius: 10,
    paddingHorizontal: 25,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  addButtonContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  statsContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF4500",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: "#8B9DC3",
    textAlign: "center",
  },
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    paddingVertical: 12,
    marginLeft: 10,
  },
  moodFilters: {
    flexDirection: "row",
  },
  moodFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  moodFilterButtonActive: {
    backgroundColor: "rgba(255, 69, 0, 0.2)",
    borderWidth: 1,
    borderColor: "#FF4500",
  },
  moodFilterEmoji: {
    fontSize: 16,
    marginRight: 5,
  },
  moodFilterText: {
    fontSize: 12,
    color: "#8B9DC3",
  },
  moodFilterTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  entriesSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 15,
  },
  emptyCard: {
    padding: 30,
    backgroundColor: "rgba(26, 43, 60, 0.2)",
    borderRadius: 15,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#8B9DC3",
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#8B9DC3",
    fontStyle: "italic",
  },
  entryCard: {
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: "#FF4500",
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  entryMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  entryDate: {
    fontSize: 14,
    color: "#8B9DC3",
    marginLeft: 8,
  },
  entryTime: {
    fontSize: 14,
    color: "#8B9DC3",
    marginLeft: 8,
  },
  entryActions: {
    flexDirection: "row",
    gap: 10,
  },
  editButton: {
    padding: 5,
  },
  deleteButton: {
    padding: 5,
  },
  entryMoodContainer: {
    marginBottom: 10,
  },
  moodBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  moodBadgeEmoji: {
    fontSize: 16,
    marginRight: 5,
  },
  moodBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  entrySection: {
    marginBottom: 15,
  },
  entrySectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF4500",
    marginBottom: 5,
  },
  entrySectionContent: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 22,
    opacity: 0.9,
    marginBottom: 5,
  },
  wordCount: {
    fontSize: 11,
    color: "#8B9DC3",
    fontStyle: "italic",
  },
  insightsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  insightCard: {
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 15,
  },
  moodTrendContainer: {
    gap: 10,
  },
  moodTrendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  moodTrendEmoji: {
    fontSize: 20,
    width: 30,
  },
  moodTrendBar: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(139, 157, 195, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  moodTrendFill: {
    height: "100%",
    borderRadius: 4,
  },
  moodTrendCount: {
    fontSize: 12,
    color: "#8B9DC3",
    width: 30,
    textAlign: "right",
  },
  gratitudeList: {
    gap: 8,
  },
  gratitudeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 69, 0, 0.1)",
    borderRadius: 8,
    padding: 10,
  },
  gratitudeRank: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FF4500",
    width: 30,
  },
  gratitudeWord: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    marginLeft: 10,
  },
  gratitudeCount: {
    fontSize: 12,
    color: "#8B9DC3",
  },
  inspirationCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 20,
    backgroundColor: "rgba(255, 69, 0, 0.1)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 69, 0, 0.3)",
    alignItems: "center",
  },
  inspirationText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 15,
    lineHeight: 22,
  },
  inspirationAuthor: {
    fontSize: 14,
    color: "#8B9DC3",
  },
  // Voice recording styles
  voiceSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(26, 43, 60, 0.2)",
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 69, 0, 0.2)",
  },
  voiceSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  voiceHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  voiceSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 10,
  },
  voiceToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 69, 0, 0.2)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#FF4500",
  },
  voiceToggleText: {
    color: "#FF4500",
    fontSize: 12,
    fontWeight: "600",
  },
  voiceContent: {
    gap: 20,
  },
  voiceSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8B9DC3",
    marginBottom: 10,
  },
  promptsContainer: {
    marginBottom: 15,
  },
  promptCard: {
    backgroundColor: "rgba(26, 43, 60, 0.4)",
    borderRadius: 12,
    padding: 15,
    marginRight: 12,
    alignItems: "center",
    minWidth: 100,
    borderWidth: 1,
    borderColor: "rgba(139, 157, 195, 0.2)",
  },
  promptCardActive: {
    backgroundColor: "rgba(255, 69, 0, 0.2)",
    borderColor: "#FF4500",
  },
  promptIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  promptTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 4,
  },
  promptDuration: {
    fontSize: 10,
    color: "#8B9DC3",
  },
  recordingControls: {
    alignItems: "center",
    marginVertical: 10,
  },
  recordButton: {
    borderRadius: 50,
    overflow: "hidden",
  },
  recordButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 15,
    gap: 10,
  },
  recordButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  activeRecordingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26, 43, 60, 0.5)",
    borderRadius: 25,
    padding: 15,
    gap: 15,
  },
  recordingIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FF4500",
    alignItems: "center",
    justifyContent: "center",
  },
  recordingInfo: {
    flex: 1,
    alignItems: "center",
  },
  recordingDurationText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  recordingPromptText: {
    fontSize: 12,
    color: "#8B9DC3",
    marginTop: 2,
  },
  recordingActions: {
    flexDirection: "row",
    gap: 10,
  },
  recordingActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(139, 157, 195, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  stopButton: {
    backgroundColor: "rgba(244, 67, 54, 0.2)",
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    gap: 3,
    marginVertical: 15,
  },
  waveformBar: {
    width: 4,
    backgroundColor: "#FF4500",
    borderRadius: 2,
    minHeight: 10,
  },
  voiceNotesSection: {
    marginTop: 10,
  },
  voiceNotesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 15,
  },
  voiceNoteCard: {
    backgroundColor: "rgba(26, 43, 60, 0.4)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#FF4500",
  },
  voiceNoteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  voiceNoteInfo: {
    flex: 1,
  },
  voiceNoteTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  voiceNoteMeta: {
    fontSize: 12,
    color: "#8B9DC3",
  },
  voiceNoteDeleteButton: {
    padding: 5,
  },
  recordingItem: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    minWidth: 200,
    borderWidth: 1,
    borderColor: "rgba(139, 157, 195, 0.1)",
  },
  recordingItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  recordingType: {
    fontSize: 16,
  },
  recordingDuration: {
    fontSize: 12,
    color: "#8B9DC3",
    fontWeight: "600",
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(33, 150, 243, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  playbackControls: {
    flexDirection: "row",
    gap: 5,
  },
  skipButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(139, 157, 195, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  transcriptionContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
  },
  transcriptionText: {
    fontSize: 12,
    color: "#FFFFFF",
    lineHeight: 16,
    marginBottom: 8,
  },
  addToFormButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 69, 0, 0.2)",
    borderRadius: 12,
    gap: 4,
  },
  addToFormText: {
    fontSize: 10,
    color: "#FF4500",
    fontWeight: "600",
  },
  transcribingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 5,
  },
  transcribingText: {
    fontSize: 12,
    color: "#8B9DC3",
    fontStyle: "italic",
  },
  transcribingDots: {
    flexDirection: "row",
    gap: 2,
  },
  transcribingDot: {
    fontSize: 12,
    color: "#FF4500",
  },
  playbackSpeedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    gap: 10,
  },
  playbackSpeedLabel: {
    fontSize: 14,
    color: "#8B9DC3",
  },
  speedButtons: {
    flexDirection: "row",
    gap: 8,
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(26, 43, 60, 0.5)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(139, 157, 195, 0.2)",
  },
  speedButtonActive: {
    backgroundColor: "rgba(255, 69, 0, 0.2)",
    borderColor: "#FF4500",
  },
  speedButtonText: {
    fontSize: 12,
    color: "#8B9DC3",
    fontWeight: "600",
  },
  speedButtonTextActive: {
    color: "#FF4500",
  },
});