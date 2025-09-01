import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  Eye,
  Target,
  Heart,
  DollarSign,
  Users,
  TrendingUp,
  MapPin,
  Sparkles,
  Trophy,
  Calendar,
  Play,
  Pause,
  RotateCcw,
  Edit3,
  Check,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { useWellness } from '@/providers/WellnessProvider';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 768;

interface VisionElement {
  id: string;
  type: 'image' | 'quote' | 'mantra' | 'progress' | 'goal';
  title: string;
  content: string;
  category: 'health' | 'wealth' | 'relationships' | 'growth' | 'experiences';
  targetDate?: Date;
  achieved: boolean;
  achievedDate?: Date;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    fontWeight?: string;
  };
  createdAt: Date;
}

interface VisionBoard {
  id: string;
  name: string;
  description: string;
  elements: VisionElement[];
  backgroundImage?: string;
  backgroundColor: string;
  createdAt: Date;
  lastViewed?: Date;
}

const CATEGORY_ICONS = {
  health: Heart,
  wealth: DollarSign,
  relationships: Users,
  growth: TrendingUp,
  experiences: MapPin,
};



const PRESET_AFFIRMATIONS = [
  "I am becoming the person I've always dreamed of being",
  "Every day I am getting closer to my goals",
  "I deserve all the success and happiness coming my way",
  "My dreams are valid and achievable",
  "I am worthy of love, success, and abundance",
  "I trust the process of my transformation",
  "My potential is limitless",
  "I attract opportunities that align with my vision",
];

const VISUALIZATION_PROMPTS = [
  "Imagine waking up in your dream life. What do you see around you?",
  "Picture yourself achieving your biggest goal. How does it feel?",
  "Visualize your ideal day from morning to night in detail",
  "See yourself one year from now, living your best life",
  "Imagine the moment you realize you've made it. What's happening?",
];

export default function VisionScreen() {
  const {
    visionBoards,
    affirmations,
    visualizationSessions,
    dreamLifeScript,
    visualizationStreak,
    currentTheme,
    addVisionBoard,
    addVisionElement,
    markVisionElementAchieved,
    addAffirmation,
    useAffirmation,
    addVisualizationSession,
    updateDreamLifeScript,
  } = useWellness();

  const [activeTab, setActiveTab] = useState<'boards' | 'affirmations' | 'visualization' | 'script'>('boards');
  const [selectedBoard, setSelectedBoard] = useState<VisionBoard | null>(null);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showAddElement, setShowAddElement] = useState(false);
  const [showVisualizationTimer, setShowVisualizationTimer] = useState(false);
  const [showAffirmationModal, setShowAffirmationModal] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  
  // Form states
  const [boardForm, setBoardForm] = useState({ name: '', description: '', backgroundColor: '#1A1A2E' });
  const [elementForm, setElementForm] = useState<{
    type: 'image' | 'quote' | 'mantra' | 'goal';
    title: string;
    content: string;
    category: 'health' | 'wealth' | 'relationships' | 'growth' | 'experiences';
    targetDate: string;
    backgroundColor: string;
    textColor: string;
    fontSize: number;
  }>({
    type: 'goal',
    title: '',
    content: '',
    category: 'health',
    targetDate: '',
    backgroundColor: '#FF4500',
    textColor: '#FFFFFF',
    fontSize: 16,
  });
  const [affirmationForm, setAffirmationForm] = useState({ text: '', category: 'general' });
  const [scriptForm, setScriptForm] = useState({
    morningRoutine: '',
    idealHealth: '',
    relationships: '',
    career: '',
    lifestyle: '',
    achievements: '',
  });
  
  // Visualization timer states
  const [visualizationTime, setVisualizationTime] = useState(5);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [visualizationTimer, setVisualizationTimer] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [visualizationNotes, setVisualizationNotes] = useState('');
  const [visualizationMood, setVisualizationMood] = useState(5);
  
  // Audio states
  const [isPlayingAffirmation, setIsPlayingAffirmation] = useState(false);
  const [currentAffirmation, setCurrentAffirmation] = useState('');
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const completeVisualization = () => {
    setIsVisualizing(false);
    setShowVisualizationTimer(false);
    
    const session = {
      duration: visualizationTime,
      focusGoals: selectedBoard ? selectedBoard.elements.filter(el => !el.achieved).map(el => el.title) : [],
      notes: visualizationNotes,
      mood: visualizationMood,
    };
    
    addVisualizationSession(session);
    
    Alert.alert(
      '🔥 Visualization Complete!',
      `Amazing work! You've completed a ${visualizationTime}-minute visualization session. Your visualization streak is now ${visualizationStreak + 1} days!`,
      [{ text: 'Continue Rising!', style: 'default' }]
    );
    
    fadeAnim.setValue(0);
    scaleAnim.setValue(1);
    setVisualizationNotes('');
    setVisualizationMood(5);
  };

  useEffect(() => {
    if (isVisualizing && visualizationTimer > 0) {
      timerRef.current = setTimeout(() => {
        setVisualizationTimer(prev => prev - 1);
      }, 1000);
    } else if (isVisualizing && visualizationTimer === 0) {
      completeVisualization();
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isVisualizing, visualizationTimer]);

  const startVisualization = () => {
    const randomPrompt = VISUALIZATION_PROMPTS[Math.floor(Math.random() * VISUALIZATION_PROMPTS.length)];
    setCurrentPrompt(randomPrompt);
    setVisualizationTimer(visualizationTime * 60);
    setIsVisualizing(true);
    setShowVisualizationTimer(true);
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  };

  const pauseVisualization = () => {
    setIsVisualizing(!isVisualizing);
  };

  const stopVisualization = () => {
    setIsVisualizing(false);
    setVisualizationTimer(0);
    setShowVisualizationTimer(false);
    fadeAnim.setValue(0);
    scaleAnim.setValue(1);
  };



  const createBoard = () => {
    if (!boardForm.name.trim()) return;
    
    addVisionBoard({
      name: boardForm.name,
      description: boardForm.description,
      elements: [],
      backgroundColor: boardForm.backgroundColor,
    });
    
    setBoardForm({ name: '', description: '', backgroundColor: '#1A1A2E' });
    setShowCreateBoard(false);
  };

  const createElement = () => {
    if (!selectedBoard || !elementForm.title.trim() || !elementForm.content.trim()) return;
    
    const element = {
      type: elementForm.type,
      title: elementForm.title,
      content: elementForm.content,
      category: elementForm.category,
      targetDate: elementForm.targetDate ? new Date(elementForm.targetDate) : undefined,
      achieved: false,
      position: { x: Math.random() * 200, y: Math.random() * 200 },
      size: { width: 150, height: 100 },
      style: {
        backgroundColor: elementForm.backgroundColor,
        textColor: elementForm.textColor,
        fontSize: elementForm.fontSize,
        fontWeight: 'bold' as const,
      },
    };
    
    addVisionElement(selectedBoard.id, element);
    
    setElementForm({
      type: 'goal',
      title: '',
      content: '',
      category: 'health',
      targetDate: '',
      backgroundColor: '#FF4500',
      textColor: '#FFFFFF',
      fontSize: 16,
    });
    setShowAddElement(false);
  };

  const createAffirmation = () => {
    if (!affirmationForm.text.trim()) return;
    
    addAffirmation({
      text: affirmationForm.text,
      category: affirmationForm.category,
      isCustom: true,
    });
    
    setAffirmationForm({ text: '', category: 'general' });
    setShowAffirmationModal(false);
  };

  const saveScript = () => {
    updateDreamLifeScript(scriptForm);
    setShowScriptModal(false);
    Alert.alert('✨ Dream Life Script Saved!', 'Your vision of your ideal life has been captured.');
  };

  const playAffirmation = (text: string) => {
    if (Platform.OS === 'web') {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        utterance.onstart = () => {
          setIsPlayingAffirmation(true);
          setCurrentAffirmation(text);
        };
        utterance.onend = () => {
          setIsPlayingAffirmation(false);
          setCurrentAffirmation('');
        };
        speechSynthesis.speak(utterance);
      }
    }
  };



  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTabButton = (tab: string, icon: React.ComponentType<any>, label: string) => {
    const IconComponent = icon;
    const isActive = activeTab === tab;
    
    return (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tabButton,
          isActive && { backgroundColor: currentTheme.colors.primary },
        ]}
        onPress={() => setActiveTab(tab as any)}
      >
        <IconComponent
          size={isSmallScreen ? 18 : 20}
          color={isActive ? '#FFFFFF' : currentTheme.colors.text}
        />
        {!isSmallScreen && (
          <Text style={[
            styles.tabLabel,
            { color: isActive ? '#FFFFFF' : currentTheme.colors.text }
          ]}>
            {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderVisionElement = (element: VisionElement, boardId: string) => {
    const CategoryIcon = CATEGORY_ICONS[element.category];
    
    return (
      <View
        key={element.id}
        style={[
          styles.visionElement,
          {
            backgroundColor: element.style.backgroundColor,
            left: element.position.x,
            top: element.position.y,
            width: element.size.width,
            height: element.size.height,
            opacity: element.achieved ? 0.7 : 1,
          },
        ]}
      >
        {element.achieved && (
          <View style={styles.achievedBadge}>
            <Trophy size={16} color="#FFD700" />
          </View>
        )}
        
        <View style={styles.elementHeader}>
          <CategoryIcon size={16} color={element.style.textColor} />
          <TouchableOpacity
            style={styles.elementAction}
            onPress={() => markVisionElementAchieved(boardId, element.id)}
          >
            <Check size={14} color={element.style.textColor} />
          </TouchableOpacity>
        </View>
        
        <Text
          style={[
            styles.elementTitle,
            {
              color: element.style.textColor,
              fontSize: element.style.fontSize,
              fontWeight: element.style.fontWeight,
            },
          ]}
          numberOfLines={2}
        >
          {element.title}
        </Text>
        
        <Text
          style={[
            styles.elementContent,
            { color: element.style.textColor },
          ]}
          numberOfLines={3}
        >
          {element.content}
        </Text>
        
        {element.targetDate && (
          <View style={styles.elementDate}>
            <Calendar size={12} color={element.style.textColor} />
            <Text style={[styles.dateText, { color: element.style.textColor }]}>
              {new Date(element.targetDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderBoardsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentTheme.colors.text }]}>Phoenix Vision Boards</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: currentTheme.colors.primary }]}
          onPress={() => setShowCreateBoard(true)}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {visionBoards.length === 0 ? (
        <View style={styles.emptyState}>
          <Eye size={48} color={currentTheme.colors.primary} />
          <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>Create Your First Vision Board</Text>
          <Text style={[styles.emptySubtitle, { color: currentTheme.colors.text }]}>Visualize your dreams and watch them become reality</Text>
        </View>
      ) : (
        <ScrollView style={styles.boardsList}>
          {visionBoards.map((board) => (
            <TouchableOpacity
              key={board.id}
              style={[
                styles.boardCard,
                { backgroundColor: currentTheme.colors.card },
                selectedBoard?.id === board.id && { borderColor: currentTheme.colors.primary, borderWidth: 2 }
              ]}
              onPress={() => setSelectedBoard(board)}
            >
              <LinearGradient
                colors={[board.backgroundColor, board.backgroundColor + '80']}
                style={styles.boardGradient}
              >
                <View style={styles.boardHeader}>
                  <Text style={styles.boardName}>{board.name}</Text>
                  <View style={styles.boardStats}>
                    <Text style={styles.boardStat}>{board.elements.length} items</Text>
                    <Text style={styles.boardStat}>
                      {board.elements.filter(el => el.achieved).length} achieved
                    </Text>
                  </View>
                </View>
                <Text style={styles.boardDescription}>{board.description}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {selectedBoard && (
        <View style={styles.boardViewer}>
          <View style={styles.boardViewerHeader}>
            <Text style={[styles.boardViewerTitle, { color: currentTheme.colors.text }]}>
              {selectedBoard.name}
            </Text>
            <TouchableOpacity
              style={[styles.addElementButton, { backgroundColor: currentTheme.colors.primary }]}
              onPress={() => setShowAddElement(true)}
            >
              <Plus size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <ScrollView
            style={[
              styles.boardCanvas,
              { backgroundColor: selectedBoard.backgroundColor }
            ]}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <View style={styles.canvasContent}>
              {selectedBoard.elements.map((element) =>
                renderVisionElement(element, selectedBoard.id)
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderAffirmationsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentTheme.colors.text }]}>Daily Affirmations</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: currentTheme.colors.primary }]}
          onPress={() => setShowAffirmationModal(true)}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.streakCard}>
        <LinearGradient
          colors={[currentTheme.colors.primary, currentTheme.colors.primary + '80']}
          style={styles.streakGradient}
        >
          <Sparkles size={24} color="#FFFFFF" />
          <Text style={styles.streakText}>Visualization Streak</Text>
          <Text style={styles.streakNumber}>{visualizationStreak} days</Text>
        </LinearGradient>
      </View>

      <ScrollView style={styles.affirmationsList}>
        {[...PRESET_AFFIRMATIONS, ...affirmations.map(a => a.text)].map((text, index) => {
          const isCustom = index >= PRESET_AFFIRMATIONS.length;
          const affirmation = isCustom ? affirmations[index - PRESET_AFFIRMATIONS.length] : null;
          
          return (
            <View
              key={index}
              style={[
                styles.affirmationCard,
                { backgroundColor: currentTheme.colors.card }
              ]}
            >
              <Text style={[styles.affirmationText, { color: currentTheme.colors.text }]}>
                {text}
              </Text>
              
              <View style={styles.affirmationActions}>
                <TouchableOpacity
                  style={styles.affirmationAction}
                  onPress={() => {
                    playAffirmation(text);
                  }}
                >
                  {isPlayingAffirmation && currentAffirmation === text ? (
                    <VolumeX size={20} color={currentTheme.colors.primary} />
                  ) : (
                    <Volume2 size={20} color={currentTheme.colors.primary} />
                  )}
                </TouchableOpacity>
                
                {affirmation && (
                  <View style={styles.usageCount}>
                    <Star size={16} color={currentTheme.colors.primary} />
                    <Text style={[styles.usageText, { color: currentTheme.colors.text }]}>
                      {affirmation.timesUsed}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderVisualizationTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentTheme.colors.text }]}>Visualization Practice</Text>
      </View>

      <View style={styles.visualizationControls}>
        <View style={styles.timerSelector}>
          <Text style={[styles.timerLabel, { color: currentTheme.colors.text }]}>Duration (minutes)</Text>
          <View style={styles.timerButtons}>
            {[1, 5, 10, 15].map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timerButton,
                  { backgroundColor: currentTheme.colors.card },
                  visualizationTime === time && { backgroundColor: currentTheme.colors.primary }
                ]}
                onPress={() => setVisualizationTime(time)}
              >
                <Text style={[
                  styles.timerButtonText,
                  { color: visualizationTime === time ? '#FFFFFF' : currentTheme.colors.text }
                ]}>
                  {time}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: currentTheme.colors.primary }]}
          onPress={startVisualization}
          disabled={isVisualizing}
        >
          <Play size={20} color="#FFFFFF" />
          <Text style={styles.startButtonText}>Start Visualization</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sessionHistory}>
        <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Recent Sessions</Text>
        <ScrollView style={styles.sessionsList}>
          {visualizationSessions.slice(0, 10).map((session) => (
            <View
              key={session.id}
              style={[
                styles.sessionCard,
                { backgroundColor: currentTheme.colors.card }
              ]}
            >
              <View style={styles.sessionHeader}>
                <Text style={[styles.sessionDuration, { color: currentTheme.colors.text }]}>
                  {session.duration} minutes
                </Text>
                <Text style={[styles.sessionDate, { color: currentTheme.colors.text }]}>
                  {new Date(session.date).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.sessionMood}>
                <Text style={[styles.moodLabel, { color: currentTheme.colors.text }]}>Mood:</Text>
                <View style={styles.moodStars}>
                  {[...Array(10)].map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      color={i < session.mood ? '#FFD700' : '#666'}
                      fill={i < session.mood ? '#FFD700' : 'transparent'}
                    />
                  ))}
                </View>
              </View>
              
              {session.notes && (
                <Text style={[styles.sessionNotes, { color: currentTheme.colors.text }]}>
                  {session.notes}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderScriptTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentTheme.colors.text }]}>Dream Life Script</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: currentTheme.colors.primary }]}
          onPress={() => {
            if (dreamLifeScript) {
              setScriptForm({
                morningRoutine: dreamLifeScript.morningRoutine,
                idealHealth: dreamLifeScript.idealHealth,
                relationships: dreamLifeScript.relationships,
                career: dreamLifeScript.career,
                lifestyle: dreamLifeScript.lifestyle,
                achievements: dreamLifeScript.achievements,
              });
            }
            setShowScriptModal(true);
          }}
        >
          <Edit3 size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {dreamLifeScript ? (
        <ScrollView style={styles.scriptContent}>
          {[
            { key: 'morningRoutine', title: '🌅 Morning Routine', value: dreamLifeScript.morningRoutine },
            { key: 'idealHealth', title: '💪 Ideal Health', value: dreamLifeScript.idealHealth },
            { key: 'relationships', title: '❤️ Relationships', value: dreamLifeScript.relationships },
            { key: 'career', title: '🚀 Career & Purpose', value: dreamLifeScript.career },
            { key: 'lifestyle', title: '🏡 Lifestyle', value: dreamLifeScript.lifestyle },
            { key: 'achievements', title: '🏆 Achievements', value: dreamLifeScript.achievements },
          ].map((section) => (
            <View
              key={section.key}
              style={[
                styles.scriptSection,
                { backgroundColor: currentTheme.colors.card }
              ]}
            >
              <Text style={[styles.scriptSectionTitle, { color: currentTheme.colors.text }]}>
                {section.title}
              </Text>
              <Text style={[styles.scriptSectionContent, { color: currentTheme.colors.text }]}>
                {section.value || 'Not yet written...'}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Sparkles size={48} color={currentTheme.colors.primary} />
          <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>Create Your Dream Life Script</Text>
          <Text style={[styles.emptySubtitle, { color: currentTheme.colors.text }]}>Write a detailed vision of your ideal life</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      <View style={styles.tabBar}>
        {renderTabButton('boards', Eye, 'Boards')}
        {renderTabButton('affirmations', Sparkles, 'Affirmations')}
        {renderTabButton('visualization', Target, 'Visualize')}
        {renderTabButton('script', Edit3, 'Script')}
      </View>

      {activeTab === 'boards' && renderBoardsTab()}
      {activeTab === 'affirmations' && renderAffirmationsTab()}
      {activeTab === 'visualization' && renderVisualizationTab()}
      {activeTab === 'script' && renderScriptTab()}

      {/* Create Board Modal */}
      <Modal visible={showCreateBoard} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.colors.text }]}>Create Vision Board</Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }]}
              placeholder="Board name"
              placeholderTextColor={currentTheme.colors.text + '80'}
              value={boardForm.name}
              onChangeText={(text) => setBoardForm(prev => ({ ...prev, name: text }))}
            />
            
            <TextInput
              style={[styles.textArea, { backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }]}
              placeholder="Description"
              placeholderTextColor={currentTheme.colors.text + '80'}
              value={boardForm.description}
              onChangeText={(text) => setBoardForm(prev => ({ ...prev, description: text }))}
              multiline
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: currentTheme.colors.background }]}
                onPress={() => setShowCreateBoard(false)}
              >
                <Text style={[styles.modalButtonText, { color: currentTheme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: currentTheme.colors.primary }]}
                onPress={createBoard}
              >
                <Text style={styles.modalButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Element Modal */}
      <Modal visible={showAddElement} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.colors.text }]}>Add Vision Element</Text>
            
            <View style={styles.typeSelector}>
              {(['goal', 'quote', 'mantra', 'image'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    { backgroundColor: currentTheme.colors.background },
                    elementForm.type === type && { backgroundColor: currentTheme.colors.primary }
                  ]}
                  onPress={() => setElementForm(prev => ({ ...prev, type }))}
                >
                  <Text style={[
                    styles.typeButtonText,
                    { color: elementForm.type === type ? '#FFFFFF' : currentTheme.colors.text }
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={[styles.input, { backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }]}
              placeholder="Title"
              placeholderTextColor={currentTheme.colors.text + '80'}
              value={elementForm.title}
              onChangeText={(text) => setElementForm(prev => ({ ...prev, title: text }))}
            />
            
            <TextInput
              style={[styles.textArea, { backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }]}
              placeholder={elementForm.type === 'image' ? 'Image URL' : 'Content'}
              placeholderTextColor={currentTheme.colors.text + '80'}
              value={elementForm.content}
              onChangeText={(text) => setElementForm(prev => ({ ...prev, content: text }))}
              multiline
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: currentTheme.colors.background }]}
                onPress={() => setShowAddElement(false)}
              >
                <Text style={[styles.modalButtonText, { color: currentTheme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: currentTheme.colors.primary }]}
                onPress={createElement}
              >
                <Text style={styles.modalButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Visualization Timer Modal */}
      <Modal visible={showVisualizationTimer} animationType="fade" transparent>
        <View style={styles.visualizationOverlay}>
          <Animated.View
            style={[
              styles.visualizationModal,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#1A1A2E', '#16213E', '#0F3460']}
              style={styles.visualizationGradient}
            >
              <Text style={styles.visualizationTimer}>{formatTime(visualizationTimer)}</Text>
              
              <Text style={styles.visualizationPrompt}>{currentPrompt}</Text>
              
              <View style={styles.visualizationControls}>
                <TouchableOpacity
                  style={styles.visualizationButton}
                  onPress={pauseVisualization}
                >
                  {isVisualizing ? (
                    <Pause size={24} color="#FFFFFF" />
                  ) : (
                    <Play size={24} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.visualizationButton}
                  onPress={stopVisualization}
                >
                  <RotateCcw size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Affirmation Modal */}
      <Modal visible={showAffirmationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.colors.text }]}>Create Affirmation</Text>
            
            <TextInput
              style={[styles.textArea, { backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }]}
              placeholder="I am..."
              placeholderTextColor={currentTheme.colors.text + '80'}
              value={affirmationForm.text}
              onChangeText={(text) => setAffirmationForm(prev => ({ ...prev, text }))}
              multiline
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: currentTheme.colors.background }]}
                onPress={() => setShowAffirmationModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: currentTheme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: currentTheme.colors.primary }]}
                onPress={createAffirmation}
              >
                <Text style={styles.modalButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Script Modal */}
      <Modal visible={showScriptModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.modalContent, { backgroundColor: currentTheme.colors.card }]}>
              <Text style={[styles.modalTitle, { color: currentTheme.colors.text }]}>Dream Life Script</Text>
              
              {[
                { key: 'morningRoutine', title: '🌅 Morning Routine', placeholder: 'Describe your ideal morning...' },
                { key: 'idealHealth', title: '💪 Ideal Health', placeholder: 'How do you look and feel?' },
                { key: 'relationships', title: '❤️ Relationships', placeholder: 'Describe your relationships...' },
                { key: 'career', title: '🚀 Career & Purpose', placeholder: 'What is your dream career?' },
                { key: 'lifestyle', title: '🏡 Lifestyle', placeholder: 'How do you live?' },
                { key: 'achievements', title: '🏆 Achievements', placeholder: 'What have you accomplished?' },
              ].map((section) => (
                <View key={section.key} style={styles.scriptFormSection}>
                  <Text style={[styles.scriptFormTitle, { color: currentTheme.colors.text }]}>
                    {section.title}
                  </Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }]}
                    placeholder={section.placeholder}
                    placeholderTextColor={currentTheme.colors.text + '80'}
                    value={scriptForm[section.key as keyof typeof scriptForm]}
                    onChangeText={(text) => setScriptForm(prev => ({ ...prev, [section.key]: text }))}
                    multiline
                  />
                </View>
              ))}
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: currentTheme.colors.background }]}
                  onPress={() => setShowScriptModal(false)}
                >
                  <Text style={[styles.modalButtonText, { color: currentTheme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: currentTheme.colors.primary }]}
                  onPress={saveScript}
                >
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  tabLabel: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  boardsList: {
    flex: 1,
  },
  boardCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  boardGradient: {
    padding: 16,
  },
  boardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  boardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  boardStats: {
    alignItems: 'flex-end',
  },
  boardStat: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  boardDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  boardViewer: {
    flex: 1,
    marginTop: 20,
  },
  boardViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  boardViewerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addElementButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  boardCanvas: {
    flex: 1,
    borderRadius: 12,
  },
  canvasContent: {
    width: screenWidth * 2,
    height: 400,
    position: 'relative',
  },
  visionElement: {
    position: 'absolute',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  achievedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  elementAction: {
    padding: 4,
  },
  elementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  elementContent: {
    fontSize: 12,
    opacity: 0.9,
    marginBottom: 8,
  },
  elementDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 10,
    marginLeft: 4,
  },
  streakCard: {
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  streakGradient: {
    padding: 20,
    alignItems: 'center',
  },
  streakText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  affirmationsList: {
    flex: 1,
  },
  affirmationCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  affirmationText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  affirmationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  affirmationAction: {
    padding: 8,
  },
  usageCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usageText: {
    fontSize: 14,
    marginLeft: 4,
  },
  visualizationControls: {
    marginBottom: 20,
  },
  timerSelector: {
    marginBottom: 20,
  },
  timerLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  timerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  timerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  sessionHistory: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sessionsList: {
    flex: 1,
  },
  sessionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionDuration: {
    fontSize: 16,
    fontWeight: '600',
  },
  sessionDate: {
    fontSize: 14,
    opacity: 0.7,
  },
  sessionMood: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  moodStars: {
    flexDirection: 'row',
  },
  sessionNotes: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  scriptContent: {
    flex: 1,
  },
  scriptSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  scriptSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scriptSectionContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scriptFormSection: {
    marginBottom: 20,
  },
  scriptFormTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  visualizationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visualizationModal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  visualizationGradient: {
    padding: 40,
    alignItems: 'center',
  },
  visualizationTimer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  visualizationPrompt: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 30,
    opacity: 0.9,
  },
  visualizationButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
});