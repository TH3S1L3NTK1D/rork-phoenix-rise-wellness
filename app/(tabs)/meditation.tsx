import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useWellness } from '@/providers/WellnessProvider';
import { LinearGradient } from 'expo-linear-gradient';

type BreathingType = '4-4-4' | '5-5' | null;

const BREATHING_PATTERNS = {
  '4-4-4': [
    { text: 'Breathe In', duration: 4000 },
    { text: 'Hold', duration: 4000 },
    { text: 'Breathe Out', duration: 4000 },
    { text: 'Hold', duration: 4000 },
  ],
  '5-5': [
    { text: 'Breathe In', duration: 5000 },
    { text: 'Breathe Out', duration: 5000 },
  ],
};

export default function MeditationScreen() {
  const { meditation, addMeditationSession, markMeditationDayComplete } = useWellness();
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentType, setCurrentType] = useState<BreathingType>(null);
  const [currentPhase, setCurrentPhase] = useState<number>(0);
  const [breathCount, setBreathCount] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const currentPattern = currentType ? BREATHING_PATTERNS[currentType] : [];
  const currentPhaseData = currentPattern[currentPhase] || { text: 'Breathe', duration: 0 };
  
  const startBreathing = (type: BreathingType) => {
    if (!type) return;
    
    console.log('Starting breathing session:', type);
    setCurrentType(type);
    setIsActive(true);
    setCurrentPhase(0);
    setBreathCount(0);
    setSessionStartTime(Date.now());
    
    runBreathingCycle(type, 0);
  };
  
  const runBreathingCycle = (type: BreathingType, phase: number) => {
    if (!type) return;
    
    const pattern = BREATHING_PATTERNS[type];
    const currentPhaseData = pattern[phase];
    
    console.log('Running phase:', phase, currentPhaseData.text);
    
    // Animate circle based on phase
    const targetScale = currentPhaseData.text.includes('In') || currentPhaseData.text === 'Hold' && phase === 1 ? 1.3 : 1;
    
    Animated.timing(scaleAnim, {
      toValue: targetScale,
      duration: currentPhaseData.duration,
      useNativeDriver: true,
    }).start();
    
    // Set timeout for next phase
    phaseTimeoutRef.current = setTimeout(() => {
      const nextPhase = (phase + 1) % pattern.length;
      
      // If we completed a full cycle, increment breath count
      if (nextPhase === 0) {
        setBreathCount(prev => prev + 1);
      }
      
      setCurrentPhase(nextPhase);
      
      if (isActive) {
        runBreathingCycle(type, nextPhase);
      }
    }, currentPhaseData.duration);
  };
  
  const stopBreathing = () => {
    console.log('Stopping breathing session');
    setIsActive(false);
    setCurrentType(null);
    setCurrentPhase(0);
    
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current);
      phaseTimeoutRef.current = null;
    }
    
    // Reset animation
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    // Save session if there were breaths completed
    if (breathCount > 0 && currentType) {
      const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
      addMeditationSession({
        type: currentType,
        breathsCompleted: breathCount,
        duration,
      });
      console.log('Saved meditation session:', { type: currentType, breaths: breathCount, duration });
    }
    
    setBreathCount(0);
  };
  
  const markDayComplete = () => {
    markMeditationDayComplete();
    console.log('Marked meditation day as complete');
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current);
      }
    };
  }, []);
  
  // Check if today is already completed
  const today = new Date().toDateString();
  const lastCompletedDate = meditation.lastMeditationDate ? new Date(meditation.lastMeditationDate).toDateString() : null;
  const isTodayCompleted = meditation.todayCompleted && lastCompletedDate === today;
  
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#121212', '#1A2B3C', '#121212']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Phoenix Calm</Text>
          <Text style={styles.subtitle}>Breathing & Meditation</Text>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{meditation.totalBreaths}</Text>
            <Text style={styles.statLabel}>Total Breaths</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{meditation.daysStreak}</Text>
            <Text style={styles.statLabel}>Days Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{breathCount}</Text>
            <Text style={styles.statLabel}>Session Breaths</Text>
          </View>
        </View>
        
        <View style={styles.circleContainer}>
          <Animated.View
            style={[
              styles.breathingCircle,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Text style={styles.breathingText}>{currentPhaseData.text}</Text>
          </Animated.View>
        </View>
        
        <View style={styles.controlsContainer}>
          {!isActive ? (
            <>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => startBreathing('4-4-4')}
                testID="start-4-4-4-breathing"
              >
                <Text style={styles.buttonText}>Start 4-4-4 Breathing</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => startBreathing('5-5')}
                testID="start-5-5-breathing"
              >
                <Text style={styles.buttonText}>Start 5-5 Breathing</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopBreathing}
              testID="stop-breathing"
            >
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.dailyContainer}>
          <Text style={styles.dailyText}>Days meditated: {meditation.daysStreak}</Text>
          <TouchableOpacity
            style={[
              styles.completeButton,
              isTodayCompleted && styles.completedButton,
            ]}
            onPress={markDayComplete}
            disabled={isTodayCompleted}
            testID="mark-day-complete"
          >
            <Text style={[
              styles.completeButtonText,
              isTodayCompleted && styles.completedButtonText,
            ]}>
              {isTodayCompleted ? 'Today Complete ✓' : 'Mark Today Complete'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF4500',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B9DC3',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#8B9DC3',
    textAlign: 'center',
  },
  circleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 40,
  },
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#FF4500',
    backgroundColor: 'rgba(255, 69, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF4500',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  breathingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  controlsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  startButton: {
    backgroundColor: '#FF4500',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 15,
    shadowColor: '#FF4500',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stopButton: {
    backgroundColor: '#DC3545',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    shadowColor: '#DC3545',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  dailyContainer: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  dailyText: {
    fontSize: 16,
    color: '#8B9DC3',
    marginBottom: 15,
    fontWeight: '500',
  },
  completeButton: {
    backgroundColor: 'rgba(26, 43, 60, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF4500',
  },
  completedButton: {
    backgroundColor: 'rgba(40, 167, 69, 0.2)',
    borderColor: '#28A745',
  },
  completeButtonText: {
    color: '#FF4500',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  completedButtonText: {
    color: '#28A745',
  },
});