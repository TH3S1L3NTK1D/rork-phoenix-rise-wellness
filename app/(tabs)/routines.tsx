import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  Link,
  Clock,
  Star,
  Flame,
  CheckCircle,
  Circle,
  Trash2,
  Award,
  Target,
  Coffee,
  Moon,
  Dumbbell,
  Settings,
  TrendingUp,
  BarChart3,
} from 'lucide-react-native';
import { useWellness } from '@/providers/WellnessProvider';

const { width } = Dimensions.get('window');

interface HabitLink {
  id: string;
  type: 'trigger' | 'habit' | 'reward';
  name: string;
  description?: string;
  points: number;
  completed: boolean;
  timeEstimate?: number;
  isKeystone?: boolean;
}

interface Routine {
  id: string;
  name: string;
  description: string;
  type: 'morning' | 'evening' | 'workout' | 'custom';
  habitLinks: HabitLink[];
  isActive: boolean;
  streak: number;
  bestStreak: number;
  lastCompleted?: Date;
  createdAt: Date;
  completionRate: number;
  totalCompletions: number;
}

const ROUTINE_TEMPLATES = {
  morning: {
    name: 'Morning Phoenix Rise',
    description: 'Start your day with power and intention',
    habitLinks: [
      { type: 'trigger' as const, name: 'Wake up', points: 0, timeEstimate: 0 },
      { type: 'habit' as const, name: 'Drink water (16oz)', points: 2, timeEstimate: 2, isKeystone: true },
      { type: 'habit' as const, name: 'Take supplements', points: 3, timeEstimate: 2 },
      { type: 'habit' as const, name: 'Journal gratitude', points: 5, timeEstimate: 5, isKeystone: true },
      { type: 'habit' as const, name: 'Review daily goals', points: 3, timeEstimate: 3 },
      { type: 'reward' as const, name: 'Enjoy coffee', points: 0, timeEstimate: 10 },
    ],
  },
  evening: {
    name: 'Evening Wind-Down',
    description: 'Reflect and prepare for tomorrow',
    habitLinks: [
      { type: 'trigger' as const, name: 'Finish dinner', points: 0, timeEstimate: 0 },
      { type: 'habit' as const, name: 'No screens for 30 min', points: 5, timeEstimate: 30, isKeystone: true },
      { type: 'habit' as const, name: 'Journal daily wins', points: 4, timeEstimate: 5 },
      { type: 'habit' as const, name: 'Plan tomorrow', points: 3, timeEstimate: 5 },
      { type: 'habit' as const, name: 'Read 10 pages', points: 3, timeEstimate: 15 },
      { type: 'reward' as const, name: 'Relaxing tea', points: 0, timeEstimate: 10 },
    ],
  },
  workout: {
    name: 'Workout Warrior',
    description: 'Build strength and discipline',
    habitLinks: [
      { type: 'trigger' as const, name: 'Put on workout clothes', points: 0, timeEstimate: 2 },
      { type: 'habit' as const, name: 'Warm up (5 min)', points: 3, timeEstimate: 5 },
      { type: 'habit' as const, name: 'Main workout', points: 10, timeEstimate: 30, isKeystone: true },
      { type: 'habit' as const, name: 'Cool down stretch', points: 3, timeEstimate: 5 },
      { type: 'habit' as const, name: 'Log workout', points: 2, timeEstimate: 2 },
      { type: 'reward' as const, name: 'Protein shake', points: 0, timeEstimate: 5 },
    ],
  },
};

const HABIT_SUGGESTIONS: Record<string, string[]> = {
  morning: [
    'Meditate 5 minutes',
    'Make bed',
    'Cold shower',
    'Stretch routine',
    'Affirmations',
    'Check weather',
    'Healthy breakfast',
  ],
  evening: [
    'Tidy living space',
    'Prepare clothes for tomorrow',
    'Skincare routine',
    'Gratitude practice',
    'Deep breathing',
    'Set phone to airplane mode',
  ],
  workout: [
    'Check form in mirror',
    'Take progress photo',
    'Hydrate during workout',
    'Track weights/reps',
    'Listen to pump-up music',
  ],
  custom: [
    'Drink water',
    'Take vitamins',
    'Check posture',
    'Deep breath',
    'Smile',
    'Express gratitude',
  ],
  general: [
    'Drink water',
    'Take vitamins',
    'Check posture',
    'Deep breath',
    'Smile',
    'Express gratitude',
  ],
};

class ScreenErrorBoundary extends React.Component<{ children: React.ReactNode; onRetry: () => void }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode; onRetry: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error) { console.error('[Routines ErrorBoundary]', error); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, padding: 16, backgroundColor: '#0b0f14' }} testID="routines-error">
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Screen crashed</Text>
          <Text style={{ color: '#ff6b6b', marginBottom: 12 }} selectable>{this.state.error?.message}</Text>
          <TouchableOpacity
            testID="routines-retry"
            onPress={() => { this.setState({ hasError: false, error: undefined }); this.props.onRetry(); }}
            style={{ backgroundColor: '#FF4500', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

function RoutinesScreenInner() {
  const {
    routines,
    routineCompletions,
    addRoutine,
    deleteRoutine,
    completeRoutine,
    currentTheme,
  } = useWellness();

  const [activeTab, setActiveTab] = useState<'routines' | 'builder' | 'analytics'>('routines');
  const [showTemplates, setShowTemplates] = useState(false);

  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineDescription, setNewRoutineDescription] = useState('');
  const [newRoutineType, setNewRoutineType] = useState<'morning' | 'evening' | 'workout' | 'custom'>('morning');
  const [buildingHabits, setBuildingHabits] = useState<HabitLink[]>([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState<'trigger' | 'habit' | 'reward'>('habit');
  const [newHabitPoints, setNewHabitPoints] = useState('3');
  const [newHabitTime, setNewHabitTime] = useState('5');

  const [completingRoutine, setCompletingRoutine] = useState<string | null>(null);
  const [completedLinks, setCompletedLinks] = useState<string[]>([]);

  const todaysCompletions = useMemo(() => {
    const today = new Date().toDateString();
    return routineCompletions.filter(
      (rc) => new Date(rc.date).toDateString() === today
    );
  }, [routineCompletions]);

  const getRoutineIcon = (type: string) => {
    switch (type) {
      case 'morning': return <Coffee size={20} color={currentTheme.colors.primary} />;
      case 'evening': return <Moon size={20} color={currentTheme.colors.primary} />;
      case 'workout': return <Dumbbell size={20} color={currentTheme.colors.primary} />;
      default: return <Settings size={20} color={currentTheme.colors.primary} />;
    }
  };

  const getHabitTypeColor = (type: string) => {
    switch (type) {
      case 'trigger': return '#8B9DC3';
      case 'habit': return currentTheme.colors.primary;
      case 'reward': return '#32CD32';
      default: return currentTheme.colors.text;
    }
  };

  const getHabitTypeIcon = (type: string) => {
    switch (type) {
      case 'trigger': return '⚡';
      case 'habit': return '🎯';
      case 'reward': return '🎁';
      default: return '•';
    }
  };

  const createRoutineFromTemplate = (templateKey: keyof typeof ROUTINE_TEMPLATES) => {
    const template = ROUTINE_TEMPLATES[templateKey];
    const habitLinks = template.habitLinks.map((link, index) => ({
      id: `${Date.now()}_${index}`,
      ...link,
      completed: false,
    }));

    const newRoutine = {
      name: template.name,
      description: template.description,
      type: templateKey,
      habitLinks,
      isActive: true,
    };

    addRoutine(newRoutine);
    setShowTemplates(false);
  };

  const startCustomRoutine = () => {
    setNewRoutineName('');
    setNewRoutineDescription('');
    setNewRoutineType('morning');
    setBuildingHabits([]);
    setActiveTab('builder');
    setShowTemplates(false);
  };

  const addHabitToBuilder = () => {
    if (!newHabitName.trim()) return;

    const newHabit: HabitLink = {
      id: Date.now().toString(),
      type: newHabitType,
      name: newHabitName.trim(),
      points: parseInt(newHabitPoints) || 0,
      timeEstimate: parseInt(newHabitTime) || 0,
      completed: false,
      isKeystone: newHabitType === 'habit' && parseInt(newHabitPoints) >= 5,
    };

    setBuildingHabits([...buildingHabits, newHabit]);
    setNewHabitName('');
    setNewHabitPoints('3');
    setNewHabitTime('5');
  };

  const removeHabitFromBuilder = (habitId: string) => {
    setBuildingHabits(buildingHabits.filter(h => h.id !== habitId));
  };

  const saveCustomRoutine = () => {
    if (!newRoutineName.trim() || buildingHabits.length === 0) {
      Alert.alert('Error', 'Please add a name and at least one habit to your routine.');
      return;
    }

    const newRoutine = {
      name: newRoutineName.trim(),
      description: newRoutineDescription.trim() || 'Custom routine',
      type: newRoutineType,
      habitLinks: buildingHabits,
      isActive: true,
    };

    addRoutine(newRoutine);
    setActiveTab('routines');
    setBuildingHabits([]);
    setNewRoutineName('');
    setNewRoutineDescription('');
  };

  const startRoutineCompletion = (routineId: string) => {
    setCompletingRoutine(routineId);
    setCompletedLinks([]);
  };

  const toggleLinkCompletion = (linkId: string) => {
    if (completedLinks.includes(linkId)) {
      setCompletedLinks(completedLinks.filter(id => id !== linkId));
    } else {
      setCompletedLinks([...completedLinks, linkId]);
    }
  };

  const finishRoutineCompletion = () => {
    if (completingRoutine) {
      completeRoutine(completingRoutine, completedLinks);
      setCompletingRoutine(null);
      setCompletedLinks([]);
    }
  };

  const cancelRoutineCompletion = () => {
    setCompletingRoutine(null);
    setCompletedLinks([]);
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 100) return '🔥🔥🔥';
    if (streak >= 30) return '🔥🔥';
    if (streak >= 7) return '🔥';
    return '';
  };

  const calculateTotalTime = (habitLinks: HabitLink[]) => {
    return habitLinks.reduce((total, link) => total + (link.timeEstimate || 0), 0);
  };

  const calculateTotalPoints = (habitLinks: HabitLink[]) => {
    return habitLinks.reduce((total, link) => total + link.points, 0);
  };

  const renderRoutineCard = (routine: Routine) => {
    const todayCompletion = todaysCompletions.find(tc => tc.routineId === routine.id);
    const isCompletedToday = !!todayCompletion;
    const completionPercentage = todayCompletion?.completionPercentage || 0;
    const totalTime = calculateTotalTime(routine.habitLinks);
    const totalPoints = calculateTotalPoints(routine.habitLinks);

    return (
      <View key={routine.id} style={[styles.routineCard, { backgroundColor: currentTheme.colors.card }]}>
        <View style={styles.routineHeader}>
          <View style={styles.routineInfo}>
            {getRoutineIcon(routine.type)}
            <View style={styles.routineTitle}>
              <Text style={[styles.routineName, { color: currentTheme.colors.text }]}>
                {routine.name}
              </Text>
              <Text style={[styles.routineDescription, { color: currentTheme.colors.text + '80' }]}>
                {routine.description}
              </Text>
            </View>
          </View>
          <View style={styles.routineActions}>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Delete Routine',
                  `Are you sure you want to delete "${routine.name}"?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteRoutine(routine.id) },
                  ]
                );
              }}
              style={styles.actionButton}
            >
              <Trash2 size={16} color='#FF6B6B' />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.routineStats}>
          <View style={styles.statItem}>
            <Flame size={16} color={currentTheme.colors.primary} />
            <Text style={[styles.statText, { color: currentTheme.colors.text }]}>
              {routine.streak} {getStreakEmoji(routine.streak)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Award size={16} color='#FFD700' />
            <Text style={[styles.statText, { color: currentTheme.colors.text }]}>
              Best: {routine.bestStreak}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Clock size={16} color={currentTheme.colors.text + '80'} />
            <Text style={[styles.statText, { color: currentTheme.colors.text }]}>
              {totalTime}m
            </Text>
          </View>
          <View style={styles.statItem}>
            <Star size={16} color={currentTheme.colors.primary} />
            <Text style={[styles.statText, { color: currentTheme.colors.text }]}>
              {totalPoints}pts
            </Text>
          </View>
        </View>

        {isCompletedToday && (
          <View style={[styles.completionBadge, { backgroundColor: currentTheme.colors.primary + '20' }]}>
            <CheckCircle size={16} color={currentTheme.colors.primary} />
            <Text style={[styles.completionText, { color: currentTheme.colors.primary }]}>
              Completed today ({completionPercentage.toFixed(0)}%)
            </Text>
          </View>
        )}

        <View style={styles.habitChain}>
          {routine.habitLinks.map((link, index) => (
            <View key={link.id} style={styles.chainLink}>
              <View style={[styles.linkNode, { borderColor: getHabitTypeColor(link.type) }]}>
                <Text style={styles.linkEmoji}>{getHabitTypeIcon(link.type)}</Text>
              </View>
              {index < routine.habitLinks.length - 1 && (
                <View style={[styles.linkConnector, { backgroundColor: currentTheme.colors.text + '30' }]} />
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => startRoutineCompletion(routine.id)}
          disabled={isCompletedToday}
          style={[
            styles.startButton,
            { backgroundColor: isCompletedToday ? currentTheme.colors.text + '30' : currentTheme.colors.primary },
          ]}
        >
          <Text style={[styles.startButtonText, { color: isCompletedToday ? currentTheme.colors.text + '60' : '#FFFFFF' }]}>
            {isCompletedToday ? 'Completed Today' : 'Start Routine'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRoutineCompletion = () => {
    const routine = routines.find(r => r.id === completingRoutine);
    if (!routine) return null;

    const completionPercentage = (completedLinks.length / routine.habitLinks.length) * 100;

    return (
      <View style={[styles.completionOverlay, { backgroundColor: currentTheme.colors.background + 'F0' }]}>
        <View style={[styles.completionModal, { backgroundColor: currentTheme.colors.card }]}>
          <Text style={[styles.completionTitle, { color: currentTheme.colors.text }]}>
            {routine.name}
          </Text>
          <Text style={[styles.completionSubtitle, { color: currentTheme.colors.text + '80' }]}>
            Complete each step in order
          </Text>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${completionPercentage}%`,
                  backgroundColor: currentTheme.colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: currentTheme.colors.text }]}>
            {completedLinks.length} of {routine.habitLinks.length} completed ({completionPercentage.toFixed(0)}%)
          </Text>

          <ScrollView style={styles.habitList}>
            {routine.habitLinks.map((link, index) => {
              const isCompleted = completedLinks.includes(link.id);
              const canComplete = index === 0 || completedLinks.includes(routine.habitLinks[index - 1].id);

              return (
                <TouchableOpacity
                  key={link.id}
                  onPress={() => canComplete && toggleLinkCompletion(link.id)}
                  disabled={!canComplete}
                  style={[
                    styles.habitItem,
                    {
                      backgroundColor: isCompleted
                        ? currentTheme.colors.primary + '20'
                        : canComplete
                        ? currentTheme.colors.card
                        : currentTheme.colors.text + '10',
                      borderColor: getHabitTypeColor(link.type),
                    },
                  ]}
                >
                  <View style={styles.habitItemLeft}>
                    {isCompleted ? (
                      <CheckCircle size={24} color={currentTheme.colors.primary} />
                    ) : (
                      <Circle size={24} color={canComplete ? currentTheme.colors.text + '60' : currentTheme.colors.text + '30'} />
                    )}
                    <View style={styles.habitItemInfo}>
                      <Text style={[styles.habitItemName, { color: canComplete ? currentTheme.colors.text : currentTheme.colors.text + '50' }]}>
                        {getHabitTypeIcon(link.type)} {link.name}
                      </Text>
                      {link.timeEstimate && (
                        <Text style={[styles.habitItemTime, { color: currentTheme.colors.text + '60' }]}>
                          ~{link.timeEstimate} min
                        </Text>
                      )}
                    </View>
                  </View>
                  {link.points > 0 && (
                    <View style={[styles.pointsBadge, { backgroundColor: currentTheme.colors.primary }]}>
                      <Text style={styles.pointsText}>+{link.points}</Text>
                    </View>
                  )}
                  {link.isKeystone && (
                    <Star size={16} color='#FFD700' style={styles.keystoneIcon} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.completionActions}>
            <TouchableOpacity
              onPress={cancelRoutineCompletion}
              style={[styles.cancelButton, { borderColor: currentTheme.colors.text + '30' }]}
            >
              <Text style={[styles.cancelButtonText, { color: currentTheme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={finishRoutineCompletion}
              style={[styles.finishButton, { backgroundColor: currentTheme.colors.primary }]}
            >
              <Text style={styles.finishButtonText}>Finish ({completedLinks.length}/{routine.habitLinks.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderTemplateSelector = () => (
    <View style={[styles.templateOverlay, { backgroundColor: currentTheme.colors.background + 'F0' }]}>
      <View style={[styles.templateModal, { backgroundColor: currentTheme.colors.card }]}>
        <Text style={[styles.templateTitle, { color: currentTheme.colors.text }]}>Choose a Template</Text>
        
        {Object.entries(ROUTINE_TEMPLATES).map(([key, template]) => (
          <TouchableOpacity
            key={key}
            onPress={() => createRoutineFromTemplate(key as keyof typeof ROUTINE_TEMPLATES)}
            style={[styles.templateOption, { borderColor: currentTheme.colors.text + '20' }]}
          >
            <View style={styles.templateHeader}>
              {getRoutineIcon(key)}
              <View style={styles.templateInfo}>
                <Text style={[styles.templateName, { color: currentTheme.colors.text }]}>
                  {template.name}
                </Text>
                <Text style={[styles.templateDescription, { color: currentTheme.colors.text + '80' }]}>
                  {template.description}
                </Text>
              </View>
            </View>
            <Text style={[styles.templateStats, { color: currentTheme.colors.text + '60' }]}>
              {template.habitLinks.length} habits • {template.habitLinks.reduce((sum, h) => sum + (h.timeEstimate || 0), 0)} min
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={startCustomRoutine}
          style={[styles.customOption, { backgroundColor: currentTheme.colors.primary + '20', borderColor: currentTheme.colors.primary }]}
        >
          <Plus size={20} color={currentTheme.colors.primary} />
          <Text style={[styles.customOptionText, { color: currentTheme.colors.primary }]}>Create Custom Routine</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowTemplates(false)}
          style={[styles.cancelTemplateButton, { borderColor: currentTheme.colors.text + '30' }]}
        >
          <Text style={[styles.cancelTemplateText, { color: currentTheme.colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRoutineBuilder = () => (
    <ScrollView style={styles.builderContainer}>
      <View style={[styles.builderSection, { backgroundColor: currentTheme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Routine Details</Text>
        
        <TextInput
          style={[styles.input, { color: currentTheme.colors.text, borderColor: currentTheme.colors.text + '30' }]}
          placeholder="Routine name (e.g., Morning Power Hour)"
          placeholderTextColor={currentTheme.colors.text + '60'}
          value={newRoutineName}
          onChangeText={setNewRoutineName}
        />
        
        <TextInput
          style={[styles.textArea, { color: currentTheme.colors.text, borderColor: currentTheme.colors.text + '30' }]}
          placeholder="Description (optional)"
          placeholderTextColor={currentTheme.colors.text + '60'}
          value={newRoutineDescription}
          onChangeText={setNewRoutineDescription}
          multiline
          numberOfLines={3}
        />

        <View style={styles.typeSelector}>
          {(['morning', 'evening', 'workout', 'custom'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setNewRoutineType(type)}
              style={[
                styles.typeOption,
                {
                  backgroundColor: newRoutineType === type ? currentTheme.colors.primary : 'transparent',
                  borderColor: currentTheme.colors.primary,
                },
              ]}
            >
              {getRoutineIcon(type)}
              <Text style={[styles.typeText, { color: newRoutineType === type ? '#FFFFFF' : currentTheme.colors.text }]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.builderSection, { backgroundColor: currentTheme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Add Habits</Text>
        
        <View style={styles.habitBuilder}>
          <View style={styles.habitTypeSelector}>
            {(['trigger', 'habit', 'reward'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setNewHabitType(type)}
                style={[
                  styles.habitTypeOption,
                  {
                    backgroundColor: newHabitType === type ? getHabitTypeColor(type) : 'transparent',
                    borderColor: getHabitTypeColor(type),
                  },
                ]}
              >
                <Text style={styles.habitTypeEmoji}>{getHabitTypeIcon(type)}</Text>
                <Text style={[styles.habitTypeText, { color: newHabitType === type ? '#FFFFFF' : currentTheme.colors.text }]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[styles.input, { color: currentTheme.colors.text, borderColor: currentTheme.colors.text + '30' }]}
            placeholder="Habit name (e.g., Drink 16oz water)"
            placeholderTextColor={currentTheme.colors.text + '60'}
            value={newHabitName}
            onChangeText={setNewHabitName}
          />

          <View style={styles.habitDetails}>
            <View style={styles.detailInput}>
              <Text style={[styles.detailLabel, { color: currentTheme.colors.text }]}>Points</Text>
              <TextInput
                style={[styles.smallInput, { color: currentTheme.colors.text, borderColor: currentTheme.colors.text + '30' }]}
                placeholder="3"
                placeholderTextColor={currentTheme.colors.text + '60'}
                value={newHabitPoints}
                onChangeText={setNewHabitPoints}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.detailInput}>
              <Text style={[styles.detailLabel, { color: currentTheme.colors.text }]}>Time (min)</Text>
              <TextInput
                style={[styles.smallInput, { color: currentTheme.colors.text, borderColor: currentTheme.colors.text + '30' }]}
                placeholder="5"
                placeholderTextColor={currentTheme.colors.text + '60'}
                value={newHabitTime}
                onChangeText={setNewHabitTime}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={addHabitToBuilder}
            style={[styles.addHabitButton, { backgroundColor: currentTheme.colors.primary }]}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addHabitText}>Add Habit</Text>
          </TouchableOpacity>
        </View>

        {HABIT_SUGGESTIONS[newRoutineType] && (
          <View style={styles.suggestions}>
            <Text style={[styles.suggestionsTitle, { color: currentTheme.colors.text + '80' }]}>Suggestions:</Text>
            <View style={styles.suggestionTags}>
              {HABIT_SUGGESTIONS[newRoutineType].map((suggestion: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setNewHabitName(suggestion)}
                  style={[styles.suggestionTag, { backgroundColor: currentTheme.colors.primary + '20', borderColor: currentTheme.colors.primary }]}
                >
                  <Text style={[styles.suggestionText, { color: currentTheme.colors.primary }]}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {buildingHabits.length > 0 && (
        <View style={[styles.builderSection, { backgroundColor: currentTheme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Your Habit Chain</Text>
          
          <View style={styles.habitChainBuilder}>
            {buildingHabits.map((habit, index) => (
              <View key={habit.id} style={styles.builderChainLink}>
                <View style={[styles.builderHabitCard, { borderColor: getHabitTypeColor(habit.type) }]}>
                  <View style={styles.builderHabitHeader}>
                    <Text style={styles.builderHabitEmoji}>{getHabitTypeIcon(habit.type)}</Text>
                    <Text style={[styles.builderHabitName, { color: currentTheme.colors.text }]}>{habit.name}</Text>
                    <TouchableOpacity
                      onPress={() => removeHabitFromBuilder(habit.id)}
                      style={styles.removeHabitButton}
                    >
                      <Trash2 size={16} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.builderHabitDetails}>
                    <Text style={[styles.builderHabitDetail, { color: currentTheme.colors.text + '80' }]}>
                      {habit.points} pts • {habit.timeEstimate} min
                    </Text>
                    {habit.isKeystone && (
                      <View style={styles.keystoneBadge}>
                        <Star size={12} color="#FFD700" />
                        <Text style={[styles.keystoneText, { color: '#FFD700' }]}>Keystone</Text>
                      </View>
                    )}
                  </View>
                </View>
                {index < buildingHabits.length - 1 && (
                  <View style={[styles.builderConnector, { backgroundColor: currentTheme.colors.text + '30' }]} />
                )}
              </View>
            ))}
          </View>

          <View style={styles.chainSummary}>
            <Text style={[styles.summaryText, { color: currentTheme.colors.text }]}>
              Total: {buildingHabits.length} habits • {calculateTotalTime(buildingHabits)} min • {calculateTotalPoints(buildingHabits)} pts
            </Text>
          </View>

          <TouchableOpacity
            onPress={saveCustomRoutine}
            style={[styles.saveRoutineButton, { backgroundColor: currentTheme.colors.primary }]}
          >
            <Text style={styles.saveRoutineText}>Create Routine</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderAnalytics = () => {
    const totalRoutines = routines.length;
    const totalCompletions = routineCompletions.length;
    const thisWeekCompletions = routineCompletions.filter(rc => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(rc.date) >= weekAgo;
    }).length;

    const averageCompletionRate = routines.length > 0 
      ? routines.reduce((sum, r) => sum + r.completionRate, 0) / routines.length 
      : 0;

    const longestStreak = routines.length > 0 
      ? Math.max(...routines.map(r => r.bestStreak)) 
      : 0;

    return (
      <ScrollView style={styles.analyticsContainer}>
        <View style={[styles.statsGrid, { backgroundColor: currentTheme.colors.card }]}>
          <View style={styles.statCard}>
            <Target size={24} color={currentTheme.colors.primary} />
            <Text style={[styles.statNumber, { color: currentTheme.colors.text }]}>{totalRoutines}</Text>
            <Text style={[styles.statLabel, { color: currentTheme.colors.text + '80' }]}>Total Routines</Text>
          </View>
          <View style={styles.statCard}>
            <CheckCircle size={24} color="#32CD32" />
            <Text style={[styles.statNumber, { color: currentTheme.colors.text }]}>{totalCompletions}</Text>
            <Text style={[styles.statLabel, { color: currentTheme.colors.text + '80' }]}>Completions</Text>
          </View>
          <View style={styles.statCard}>
            <Flame size={24} color={currentTheme.colors.primary} />
            <Text style={[styles.statNumber, { color: currentTheme.colors.text }]}>{longestStreak}</Text>
            <Text style={[styles.statLabel, { color: currentTheme.colors.text + '80' }]}>Best Streak</Text>
          </View>
          <View style={styles.statCard}>
            <BarChart3 size={24} color="#FFD700" />
            <Text style={[styles.statNumber, { color: currentTheme.colors.text }]}>{averageCompletionRate.toFixed(0)}%</Text>
            <Text style={[styles.statLabel, { color: currentTheme.colors.text + '80' }]}>Avg Success</Text>
          </View>
        </View>

        <View style={[styles.analyticsSection, { backgroundColor: currentTheme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>This Week</Text>
          <Text style={[styles.weeklyStats, { color: currentTheme.colors.text + '80' }]}>
            {thisWeekCompletions} routine completions this week
          </Text>
        </View>

        <View style={[styles.analyticsSection, { backgroundColor: currentTheme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Routine Performance</Text>
          {routines.map(routine => (
            <View key={routine.id} style={styles.performanceItem}>
              <View style={styles.performanceHeader}>
                <Text style={[styles.performanceName, { color: currentTheme.colors.text }]}>{routine.name}</Text>
                <Text style={[styles.performanceRate, { color: currentTheme.colors.primary }]}>
                  {routine.completionRate.toFixed(0)}%
                </Text>
              </View>
              <View style={styles.performanceBar}>
                <View
                  style={[
                    styles.performanceFill,
                    {
                      width: `${routine.completionRate}%`,
                      backgroundColor: currentTheme.colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.performanceStats, { color: currentTheme.colors.text + '60' }]}>
                {routine.totalCompletions} completions • {routine.streak} day streak
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentTheme.colors.text }]}>Phoenix Routines</Text>
        <Text style={[styles.subtitle, { color: currentTheme.colors.text + '80' }]}>Build powerful habit chains</Text>
      </View>

      <View style={styles.tabBar}>
        {[
          { key: 'routines', label: 'Routines', icon: Link },
          { key: 'builder', label: 'Builder', icon: Plus },
          { key: 'analytics', label: 'Analytics', icon: TrendingUp },
        ].map(({ key, label, icon: Icon }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setActiveTab(key as any)}
            style={[
              styles.tabButton,
              {
                backgroundColor: activeTab === key ? currentTheme.colors.primary : 'transparent',
                borderColor: currentTheme.colors.primary,
              },
            ]}
          >
            <Icon size={20} color={activeTab === key ? '#FFFFFF' : currentTheme.colors.text} />
            <Text style={[styles.tabText, { color: activeTab === key ? '#FFFFFF' : currentTheme.colors.text }]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'routines' && (
        <ScrollView style={styles.content}>
          {routines.length === 0 ? (
            <View style={styles.emptyState}>
              <Link size={48} color={currentTheme.colors.text + '40'} />
              <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>No Routines Yet</Text>
              <Text style={[styles.emptySubtitle, { color: currentTheme.colors.text + '80' }]}>
                Create your first habit chain to start building powerful routines
              </Text>
              <TouchableOpacity
                onPress={() => setShowTemplates(true)}
                style={[styles.createFirstButton, { backgroundColor: currentTheme.colors.primary }]}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.createFirstText}>Create Your First Routine</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {routines.map(renderRoutineCard)}
              <TouchableOpacity
                onPress={() => setShowTemplates(true)}
                style={[styles.addRoutineButton, { backgroundColor: currentTheme.colors.primary + '20', borderColor: currentTheme.colors.primary }]}
              >
                <Plus size={24} color={currentTheme.colors.primary} />
                <Text style={[styles.addRoutineText, { color: currentTheme.colors.primary }]}>Add New Routine</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {activeTab === 'builder' && renderRoutineBuilder()}
      {activeTab === 'analytics' && renderAnalytics()}

      {showTemplates && renderTemplateSelector()}
      {completingRoutine && renderRoutineCompletion()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  createFirstText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  routineCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  routineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  routineTitle: {
    flex: 1,
  },
  routineName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  routineDescription: {
    fontSize: 14,
  },
  routineActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  routineStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 6,
  },
  completionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  habitChain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  chainLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkEmoji: {
    fontSize: 14,
  },
  linkConnector: {
    width: 20,
    height: 2,
    marginHorizontal: 4,
  },
  startButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addRoutineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 20,
    gap: 8,
  },
  addRoutineText: {
    fontSize: 16,
    fontWeight: '600',
  },
  templateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  templateModal: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  templateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  templateOption: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
  },
  templateStats: {
    fontSize: 12,
  },
  customOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  customOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelTemplateButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelTemplateText: {
    fontSize: 16,
  },
  builderContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  builderSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  habitBuilder: {
    marginBottom: 16,
  },
  habitTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  habitTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  habitTypeEmoji: {
    fontSize: 16,
  },
  habitTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  habitDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detailInput: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  smallInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  addHabitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  addHabitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestions: {
    marginTop: 16,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  habitChainBuilder: {
    marginBottom: 16,
  },
  builderChainLink: {
    alignItems: 'center',
  },
  builderHabitCard: {
    width: '100%',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  builderHabitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  builderHabitEmoji: {
    fontSize: 18,
  },
  builderHabitName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  removeHabitButton: {
    padding: 4,
  },
  builderHabitDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  builderHabitDetail: {
    fontSize: 14,
  },
  keystoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  keystoneText: {
    fontSize: 12,
    fontWeight: '600',
  },
  builderConnector: {
    width: 3,
    height: 20,
    marginBottom: 8,
  },
  chainSummary: {
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveRoutineButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveRoutineText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  completionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  completionModal: {
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 20,
    padding: 24,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  completionSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  habitList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  habitItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  habitItemInfo: {
    flex: 1,
  },
  habitItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  habitItemTime: {
    fontSize: 12,
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  pointsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  keystoneIcon: {
    marginLeft: 4,
  },
  completionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
  },
  finishButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  analyticsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  analyticsSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  weeklyStats: {
    fontSize: 16,
  },
  performanceItem: {
    marginBottom: 16,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  performanceRate: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  performanceBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  performanceFill: {
    height: '100%',
    borderRadius: 3,
  },
  performanceStats: {
    fontSize: 12,
  },
});