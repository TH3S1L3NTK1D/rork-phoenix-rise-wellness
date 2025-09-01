import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Shield, Plus, Flame, RefreshCw, CheckCircle, Calendar, Heart, Lightbulb, Target } from "lucide-react-native";
import { useWellness } from "@/providers/WellnessProvider";
import { Picker } from '@react-native-picker/picker';

const { width } = Dimensions.get('window');

interface AddictionJournalEntry {
  id: string;
  addictionId: string;
  date: Date;
  reflection: string;
  triggers: string;
  mood: number;
}

const ADDICTION_TYPES = [
  'Smoking',
  'Alcohol', 
  'Sugar',
  'Social Media',
  'Gaming',
  'Shopping',
  'Custom'
];

const TIPS = [
  "5-minute rule: When you feel a craving, wait 5 minutes. Often it will pass.",
  "Replace the habit: Do 10 push-ups or drink water when you feel the urge.",
  "Call a friend: Reach out to someone who supports your journey.",
  "Deep breathing: Take 10 deep breaths to center yourself.",
  "Remember your why: Think about the reasons you started this journey.",
  "Celebrate small wins: Every hour without the addiction is a victory."
];

const AFFIRMATIONS = [
  "I am stronger than my cravings",
  "Each day I choose freedom over addiction",
  "I am healing and growing every moment",
  "My willpower grows stronger each day",
  "I deserve a life free from addiction",
  "I am in control of my choices"
];

export default function AddictionScreen() {
  const { addictions, addAddiction, resetAddictionStreak, deleteAddiction, phoenixPoints } = useWellness();
  const [selectedAddictionType, setSelectedAddictionType] = useState<string>('Smoking');
  const [customAddiction, setCustomAddiction] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'tracker' | 'journal' | 'tips'>('tracker');
  const [journalEntries, setJournalEntries] = useState<AddictionJournalEntry[]>([]);
  const [selectedAddictionForJournal, setSelectedAddictionForJournal] = useState<string>('');
  const [journalReflection, setJournalReflection] = useState<string>('');
  const [journalTriggers, setJournalTriggers] = useState<string>('');
  const [journalMood, setJournalMood] = useState<number>(5);
  const [celebrationAnimation] = useState(new Animated.Value(0));
  const [currentTip, setCurrentTip] = useState<string>(TIPS[0]);
  const [currentAffirmation, setCurrentAffirmation] = useState<string>(AFFIRMATIONS[0]);

  useEffect(() => {
    // Rotate tips and affirmations daily
    const today = new Date().getDate();
    setCurrentTip(TIPS[today % TIPS.length]);
    setCurrentAffirmation(AFFIRMATIONS[today % AFFIRMATIONS.length]);
  }, []);

  const handleAddAddiction = () => {
    const addictionName = selectedAddictionType === 'Custom' ? customAddiction.trim() : selectedAddictionType;
    
    if (!addictionName) {
      Alert.alert("Error", "Please enter an addiction to track");
      return;
    }

    addAddiction(addictionName);
    setCustomAddiction('');
    setShowForm(false);
    setSelectedAddictionType('Smoking');
  };

  const handleDayComplete = (addictionId: string, addictionName: string) => {
    const addiction = addictions.find(a => a.id === addictionId);
    if (!addiction) return;

    const currentStreak = getDaysSince(addiction.lastReset) + 1;
    const isMilestone = currentStreak === 7 || currentStreak === 30 || currentStreak === 100 || currentStreak % 50 === 0;
    
    if (isMilestone) {
      triggerCelebration();
      Alert.alert(
        "🔥 MILESTONE ACHIEVED! 🔥",
        `Congratulations! You've reached ${currentStreak} days free from ${addictionName}!\n\n+10 Phoenix Points earned!`,
        [{ text: "Amazing!", style: "default" }]
      );
    } else {
      Alert.alert(
        "Day Complete! 🎉",
        `Great job staying strong today!\n\n+10 Phoenix Points earned!`,
        [{ text: "Keep Going!", style: "default" }]
      );
    }
  };

  const triggerCelebration = () => {
    celebrationAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(celebrationAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(celebrationAnimation, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  };

  const saveJournalEntry = () => {
    if (!selectedAddictionForJournal || !journalReflection.trim()) {
      Alert.alert("Error", "Please select an addiction and write a reflection");
      return;
    }

    const newEntry: AddictionJournalEntry = {
      id: Date.now().toString(),
      addictionId: selectedAddictionForJournal,
      date: new Date(),
      reflection: journalReflection,
      triggers: journalTriggers,
      mood: journalMood
    };

    setJournalEntries(prev => [newEntry, ...prev]);
    setJournalReflection('');
    setJournalTriggers('');
    setJournalMood(5);
    
    Alert.alert("Success", "Journal entry saved! +5 Phoenix Points");
  };

  const handleReset = (id: string, name: string) => {
    Alert.alert(
      "Reset Streak",
      `Are you sure you want to reset your streak for "${name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => resetAddictionStreak(id),
        },
      ]
    );
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Delete Addiction",
      `Are you sure you want to stop tracking "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteAddiction(id),
        },
      ]
    );
  };

  const getDaysSince = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tracker':
        return renderTrackerTab();
      case 'journal':
        return renderJournalTab();
      case 'tips':
        return renderTipsTab();
      default:
        return renderTrackerTab();
    }
  };

  const renderTrackerTab = () => (
    <>
      {/* Add New Addiction */}
      {showForm ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Track New Addiction</Text>
          
          <Text style={styles.label}>Addiction Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedAddictionType}
              onValueChange={setSelectedAddictionType}
              style={styles.picker}
              dropdownIconColor="#FF4500"
            >
              {ADDICTION_TYPES.map(type => (
                <Picker.Item key={type} label={type} value={type} color="#FFFFFF" />
              ))}
            </Picker>
          </View>
          
          {selectedAddictionType === 'Custom' && (
            <TextInput
              style={styles.input}
              placeholder="Enter custom addiction"
              placeholderTextColor="#8B9DC3"
              value={customAddiction}
              onChangeText={setCustomAddiction}
              autoFocus
            />
          )}
          
          <View style={styles.formButtons}>
            <TouchableOpacity
              onPress={() => {
                setShowForm(false);
                setCustomAddiction('');
                setSelectedAddictionType('Smoking');
              }}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddAddiction} activeOpacity={0.8}>
              <LinearGradient
                colors={["#FF4500", "#FF6347"]}
                style={styles.saveButton}
              >
                <Text style={styles.saveButtonText}>Start Tracking</Text>
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
            <Text style={styles.addButtonText}>Track New Addiction</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Active Streaks */}
      <View style={styles.streaksSection}>
        <Text style={styles.sectionTitle}>Active Battles 🔥</Text>
        
        {addictions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No addictions being tracked yet.
            </Text>
            <Text style={styles.emptySubtext}>
              Start your journey to freedom today!
            </Text>
          </View>
        ) : (
          addictions.map((addiction) => {
            const days = getDaysSince(addiction.lastReset);
            const bestStreak = days; // Could be enhanced to track actual best
            const isStrong = days >= 7;
            const isMilestone = days === 7 || days === 30 || days === 100 || (days > 0 && days % 50 === 0);
            
            return (
              <Animated.View 
                key={addiction.id} 
                style={[
                  styles.streakCard,
                  isMilestone && {
                    transform: [{
                      scale: celebrationAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.05]
                      })
                    }]
                  }
                ]}
              >
                <LinearGradient
                  colors={
                    isMilestone
                      ? ["#FFD700", "#FFA500"]
                      : isStrong
                      ? ["#4CAF50", "#45a049"]
                      : days === 0
                      ? ["#8B0000", "#A52A2A"]
                      : ["#1A2B3C", "#003366"]
                  }
                  style={styles.streakGradient}
                >
                  <View style={styles.streakHeader}>
                    <Text style={styles.addictionName}>{addiction.name}</Text>
                    <View style={styles.streakActions}>
                      <TouchableOpacity
                        onPress={() => handleReset(addiction.id, addiction.name)}
                        style={styles.actionButton}
                      >
                        <RefreshCw size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.streakContent}>
                    <View style={styles.daysContainer}>
                      <Text style={styles.daysNumber}>{days}</Text>
                      <Text style={styles.daysLabel}>
                        {days === 1 ? "Day" : "Days"} Free
                      </Text>
                      <Text style={styles.bestStreak}>
                        Best: {bestStreak} days
                      </Text>
                    </View>
                    
                    {isMilestone && (
                      <View style={styles.milestoneContainer}>
                        <Flame size={32} color="#FFFFFF" />
                        <Text style={styles.milestoneText}>MILESTONE!</Text>
                      </View>
                    )}
                  </View>
                  
                  {/* Day Complete Button */}
                  <TouchableOpacity
                    onPress={() => handleDayComplete(addiction.id, addiction.name)}
                    activeOpacity={0.8}
                    style={styles.dayCompleteButton}
                  >
                    <LinearGradient
                      colors={["#FF4500", "#FF6347"]}
                      style={styles.dayCompleteGradient}
                    >
                      <CheckCircle size={20} color="#FFFFFF" />
                      <Text style={styles.dayCompleteText}>Day Complete</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min((days / 30) * 100, 100)}%`,
                          backgroundColor: isMilestone ? "#FFFFFF" : isStrong ? "#FFFFFF" : "#FF4500"
                        },
                      ]}
                    />
                  </View>
                  
                  <Text style={styles.encouragement}>
                    {days === 0
                      ? "Today is a new beginning! 💪"
                      : days < 7
                      ? "Building momentum! Keep going! 🚀"
                      : days < 30
                      ? "You're crushing it! Amazing progress! ⭐"
                      : "Legendary strength! You're unstoppable! 🏆"}
                  </Text>
                </LinearGradient>
                
                <TouchableOpacity
                  onPress={() => handleDelete(addiction.id, addiction.name)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>Stop Tracking</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </View>
    </>
  );

  const renderJournalTab = () => (
    <View style={styles.journalSection}>
      <Text style={styles.sectionTitle}>Daily Reflection 📝</Text>
      
      {/* Journal Entry Form */}
      <View style={styles.journalForm}>
        <Text style={styles.label}>Select Addiction</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedAddictionForJournal}
            onValueChange={setSelectedAddictionForJournal}
            style={styles.picker}
            dropdownIconColor="#FF4500"
          >
            <Picker.Item label="Choose addiction..." value="" color="#8B9DC3" />
            {addictions.map(addiction => (
              <Picker.Item key={addiction.id} label={addiction.name} value={addiction.id} color="#FFFFFF" />
            ))}
          </Picker>
        </View>
        
        <Text style={styles.label}>How are you feeling today?</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Write about your thoughts, feelings, and experiences..."
          placeholderTextColor="#8B9DC3"
          value={journalReflection}
          onChangeText={setJournalReflection}
          multiline
          numberOfLines={4}
        />
        
        <Text style={styles.label}>What triggered cravings today?</Text>
        <TextInput
          style={styles.input}
          placeholder="Stress, boredom, social situations, etc."
          placeholderTextColor="#8B9DC3"
          value={journalTriggers}
          onChangeText={setJournalTriggers}
        />
        
        <Text style={styles.label}>Mood (1-10): {journalMood}</Text>
        <View style={styles.sliderContainer}>
          {[1,2,3,4,5,6,7,8,9,10].map(num => (
            <TouchableOpacity
              key={num}
              onPress={() => setJournalMood(num)}
              style={[
                styles.moodButton,
                journalMood === num && styles.moodButtonActive
              ]}
            >
              <Text style={[
                styles.moodButtonText,
                journalMood === num && styles.moodButtonTextActive
              ]}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity onPress={saveJournalEntry} activeOpacity={0.8}>
          <LinearGradient
            colors={["#FF4500", "#FF6347"]}
            style={styles.saveJournalButton}
          >
            <Text style={styles.saveJournalButtonText}>Save Entry</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      {/* Journal Entries */}
      <Text style={styles.sectionTitle}>Previous Entries</Text>
      {journalEntries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No journal entries yet.</Text>
          <Text style={styles.emptySubtext}>Start reflecting on your journey!</Text>
        </View>
      ) : (
        journalEntries.map(entry => {
          const addiction = addictions.find(a => a.id === entry.addictionId);
          return (
            <View key={entry.id} style={styles.journalEntry}>
              <View style={styles.journalEntryHeader}>
                <Text style={styles.journalEntryTitle}>{addiction?.name || 'Unknown'}</Text>
                <Text style={styles.journalEntryDate}>
                  {entry.date.toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.journalEntryMood}>Mood: {entry.mood}/10</Text>
              <Text style={styles.journalEntryText}>{entry.reflection}</Text>
              {entry.triggers && (
                <Text style={styles.journalEntryTriggers}>Triggers: {entry.triggers}</Text>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  const renderTipsTab = () => (
    <View style={styles.tipsSection}>
      <Text style={styles.sectionTitle}>Emergency Strategies 🆘</Text>
      
      {/* 5-Minute Rule */}
      <View style={styles.tipCard}>
        <View style={styles.tipHeader}>
          <Target size={24} color="#FF4500" />
          <Text style={styles.tipTitle}>5-Minute Rule</Text>
        </View>
        <Text style={styles.tipDescription}>
          When you feel a craving, commit to waiting just 5 minutes. Set a timer. 
          Often the craving will pass, and you'll feel stronger for resisting.
        </Text>
      </View>
      
      {/* Daily Tip */}
      <View style={styles.tipCard}>
        <View style={styles.tipHeader}>
          <Lightbulb size={24} color="#FF4500" />
          <Text style={styles.tipTitle}>Today's Strategy</Text>
        </View>
        <Text style={styles.tipDescription}>{currentTip}</Text>
      </View>
      
      {/* Emergency Strategies */}
      <View style={styles.tipCard}>
        <View style={styles.tipHeader}>
          <Shield size={24} color="#FF4500" />
          <Text style={styles.tipTitle}>Quick Actions</Text>
        </View>
        <View style={styles.strategiesList}>
          <Text style={styles.strategyItem}>• Call a supportive friend or family member</Text>
          <Text style={styles.strategyItem}>• Do 20 jumping jacks or push-ups</Text>
          <Text style={styles.strategyItem}>• Take a cold shower</Text>
          <Text style={styles.strategyItem}>• Write in your journal</Text>
          <Text style={styles.strategyItem}>• Practice deep breathing (4-7-8 technique)</Text>
          <Text style={styles.strategyItem}>• Go for a walk outside</Text>
          <Text style={styles.strategyItem}>• Listen to motivational music</Text>
        </View>
      </View>
      
      {/* Daily Affirmation */}
      <View style={styles.affirmationCard}>
        <View style={styles.tipHeader}>
          <Heart size={24} color="#FF4500" />
          <Text style={styles.tipTitle}>Daily Affirmation</Text>
        </View>
        <Text style={styles.affirmationText}>"{currentAffirmation}"</Text>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={["#000000", "#121212"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Shield size={40} color="#FF4500" />
            <Text style={styles.title}>Breaking Addictions</Text>
            <Text style={styles.subtitle}>Rise from the ashes stronger</Text>
            <Text style={styles.phoenixPoints}>🔥 {phoenixPoints} Phoenix Points</Text>
          </View>
          
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              onPress={() => setActiveTab('tracker')}
              style={[
                styles.tab,
                activeTab === 'tracker' && styles.activeTab
              ]}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'tracker' && styles.activeTabText
              ]}>Tracker</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('journal')}
              style={[
                styles.tab,
                activeTab === 'journal' && styles.activeTab
              ]}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'journal' && styles.activeTabText
              ]}>Journal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('tips')}
              style={[
                styles.tab,
                activeTab === 'tips' && styles.activeTab
              ]}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'tips' && styles.activeTabText
              ]}>Tips</Text>
            </TouchableOpacity>
          </View>
          
          {renderTabContent()}


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
    marginBottom: 10,
  },
  phoenixPoints: {
    fontSize: 18,
    color: "#FF4500",
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#FF4500",
  },
  tabText: {
    color: "#8B9DC3",
    fontSize: 16,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  label: {
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 8,
    fontWeight: "600",
  },
  pickerContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(139, 157, 195, 0.2)",
  },
  picker: {
    color: "#FFFFFF",
    height: 50,
  },
  textArea: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    color: "#FFFFFF",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 157, 195, 0.2)",
    minHeight: 100,
    textAlignVertical: "top",
  },
  bestStreak: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.8,
    marginTop: 5,
  },
  dayCompleteButton: {
    marginVertical: 10,
  },
  dayCompleteGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  dayCompleteText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  sliderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  moodButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(139, 157, 195, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(139, 157, 195, 0.3)",
  },
  moodButtonActive: {
    backgroundColor: "#FF4500",
    borderColor: "#FF4500",
  },
  moodButtonText: {
    color: "#8B9DC3",
    fontSize: 14,
    fontWeight: "600",
  },
  moodButtonTextActive: {
    color: "#FFFFFF",
  },
  saveJournalButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  saveJournalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  journalSection: {
    paddingHorizontal: 20,
  },
  journalForm: {
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  journalEntry: {
    backgroundColor: "rgba(26, 43, 60, 0.2)",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  journalEntryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  journalEntryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF4500",
  },
  journalEntryDate: {
    fontSize: 14,
    color: "#8B9DC3",
  },
  journalEntryMood: {
    fontSize: 14,
    color: "#8B9DC3",
    marginBottom: 8,
  },
  journalEntryText: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 20,
    marginBottom: 8,
  },
  journalEntryTriggers: {
    fontSize: 14,
    color: "#8B9DC3",
    fontStyle: "italic",
  },
  tipsSection: {
    paddingHorizontal: 20,
  },
  tipCard: {
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 10,
  },
  tipDescription: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  strategiesList: {
    marginTop: 10,
  },
  strategyItem: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 24,
    marginBottom: 5,
  },
  affirmationCard: {
    backgroundColor: "rgba(255, 69, 0, 0.1)",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 69, 0, 0.3)",
  },
  affirmationText: {
    fontSize: 18,
    color: "#FF4500",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
    fontWeight: "600",
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
  streaksSection: {
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
  streakCard: {
    marginBottom: 15,
  },
  streakGradient: {
    padding: 20,
    borderRadius: 15,
  },
  streakHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  addictionName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
  },
  streakActions: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 5,
    marginLeft: 10,
  },
  streakContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  daysContainer: {
    alignItems: "center",
  },
  daysNumber: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  daysLabel: {
    fontSize: 16,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  milestoneContainer: {
    alignItems: "center",
  },
  milestoneText: {
    fontSize: 14,
    color: "#FFFFFF",
    marginTop: 5,
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 4,
    marginBottom: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
  encouragement: {
    fontSize: 14,
    color: "#FFFFFF",
    fontStyle: "italic",
    textAlign: "center",
    opacity: 0.9,
  },
  deleteButton: {
    padding: 10,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#FF4500",
    fontSize: 14,
    fontWeight: "600",
  },
  motivationCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 20,
    backgroundColor: "rgba(255, 69, 0, 0.1)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 69, 0, 0.3)",
  },
  motivationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF4500",
    marginBottom: 10,
  },
  motivationText: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 22,
    marginBottom: 15,
  },
  phoenixQuote: {
    fontSize: 14,
    color: "#8B9DC3",
    fontStyle: "italic",
    textAlign: "center",
  },
});