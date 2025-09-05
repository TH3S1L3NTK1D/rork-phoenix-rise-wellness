import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { Platform, InteractionManager, Alert, AppState, AppStateStatus } from "react-native";
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

interface Meal {
  id: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  calories: number;
  completed: boolean;
  date: Date;
}

interface ExtendedMeal {
  id: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string;
  completed: boolean;
  date: Date;
}

interface Addiction {
  id: string;
  name: string;
  lastReset: Date;
  createdAt: Date;
}

interface Supplement {
  id: string;
  name: string;
  dosage: string;
  time: "morning" | "afternoon" | "evening";
  brand?: string;
  notes?: string;
  reminderTime?: string;
  takenToday: boolean;
  lastTaken?: Date;
  weeklyHistory: boolean[];
}

interface Goal {
  id: string;
  title: string;
  description: string;
  category: "health" | "fitness" | "nutrition" | "mental" | "career" | "personal";
  targetDate: Date;
  measurementMethod: string;
  priority: "low" | "medium" | "high";
  milestones: string[];
  progress: number;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
}

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: "😊" | "🙂" | "😐" | "😟" | "😔";
  gratitude: string;
  challenges: string;
  wins: string;
  tomorrowFocus: string;
  date: Date;
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  quickActions?: string[];
  emotion?: 'celebration' | 'comfort' | 'motivation' | 'default';
  visualEmoji?: string;
  messageColor?: string;
}

interface HabitLink {
  id: string;
  type: 'trigger' | 'habit' | 'reward';
  name: string;
  description?: string;
  points: number;
  completed: boolean;
  timeEstimate?: number; // in minutes
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

interface RoutineCompletion {
  id: string;
  routineId: string;
  date: Date;
  completedLinks: string[];
  partialCompletion: boolean;
  completionPercentage: number;
}

interface VisionElement {
  id: string;
  type: 'image' | 'quote' | 'mantra' | 'progress' | 'goal';
  title: string;
  content: string; // URL for images, text for quotes/mantras
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

interface Affirmation {
  id: string;
  text: string;
  category: string;
  isCustom: boolean;
  timesUsed: number;
  createdAt: Date;
}

interface VisualizationSession {
  id: string;
  duration: number; // in minutes
  focusGoals: string[];
  notes?: string;
  mood: number; // 1-10
  date: Date;
}

interface DreamLifeScript {
  id: string;
  morningRoutine: string;
  idealHealth: string;
  relationships: string;
  career: string;
  lifestyle: string;
  achievements: string;
  lastUpdated: Date;
}

interface MeditationSession {
  id: string;
  type: '4-4-4' | '5-5';
  breathsCompleted: number;
  duration: number; // in seconds
  date: Date;
}

interface MeditationData {
  totalBreaths: number;
  daysStreak: number;
  lastMeditationDate?: Date;
  sessions: MeditationSession[];
  todayCompleted: boolean;
}

interface UserProfile {
  name: string;
  age: string;
  motivation: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  text: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
}

interface WellnessData {
  phoenixPoints: number;
  meals: Meal[];
  extendedMeals: ExtendedMeal[];
  addictions: Addiction[];
  supplements: Supplement[];
  goals: Goal[];
  journalEntries: JournalEntry[];
  chatMessages: ChatMessage[];
  routines: Routine[];
  routineCompletions: RoutineCompletion[];
  userProfile: UserProfile;
  lastUpdated: Date;
  theme?: Theme;
  visionBoards: VisionBoard[];
  affirmations: Affirmation[];
  visualizationSessions: VisualizationSession[];
  dreamLifeScript?: DreamLifeScript;
  visualizationStreak: number;
  lastVisualizationDate?: Date;
  meditation: MeditationData;
  elevenLabsApiKey?: string;
  assemblyAiApiKey?: string;
  openWeatherApiKey?: string;
  wakeWordEnabled?: boolean;
  soundEffectsEnabled?: boolean;
  backgroundMusicEnabled?: boolean;
  autoReadResponsesEnabled?: boolean;
  voiceModeEnabled?: boolean;
  emotionalIntelligenceEnabled?: boolean;
  ttsSpeed?: number;
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

function isArrayOf<T>(val: unknown, predicate: (v: unknown) => v is T): val is T[] {
  return Array.isArray(val) && val.every(predicate);
}

function isDateLike(val: unknown): val is string | number | Date {
  if (val instanceof Date) return true;
  if (typeof val === 'string' || typeof val === 'number') return !Number.isNaN(new Date(val as any).getTime());
  return false;
}

function isMeal(val: unknown): val is Meal {
  if (!isObject(val)) return false;
  return (
    typeof val.id === 'string' &&
    typeof val.type === 'string' &&
    typeof val.name === 'string' &&
    typeof val.calories === 'number' &&
    typeof val.completed === 'boolean' &&
    isDateLike(val.date)
  );
}

function isExtendedMeal(val: unknown): val is ExtendedMeal {
  if (!isObject(val)) return false;
  return (
    typeof val.id === 'string' &&
    typeof val.type === 'string' &&
    typeof val.name === 'string' &&
    typeof val.calories === 'number' &&
    typeof (val as any).protein === 'number' &&
    typeof (val as any).carbs === 'number' &&
    typeof (val as any).fats === 'number' &&
    typeof (val as any).ingredients === 'string' &&
    typeof val.completed === 'boolean' &&
    isDateLike(val.date)
  );
}

function isAddiction(val: unknown): val is Addiction {
  if (!isObject(val)) return false;
  return (
    typeof val.id === 'string' &&
    typeof val.name === 'string' &&
    isDateLike(val.lastReset) &&
    isDateLike(val.createdAt)
  );
}

function isSupplement(val: unknown): val is Supplement {
  if (!isObject(val)) return false;
  return (
    typeof val.id === 'string' &&
    typeof val.name === 'string' &&
    typeof val.dosage === 'string' &&
    typeof val.time === 'string' &&
    typeof val.takenToday === 'boolean' &&
    Array.isArray((val as any).weeklyHistory)
  );
}

function isGoal(val: unknown): val is Goal {
  if (!isObject(val)) return false;
  return (
    typeof val.id === 'string' &&
    typeof val.title === 'string' &&
    typeof val.description === 'string' &&
    typeof val.category === 'string' &&
    isDateLike(val.targetDate)
  );
}

function isJournalEntry(val: unknown): val is JournalEntry {
  if (!isObject(val)) return false;
  return (
    typeof val.id === 'string' && typeof val.title === 'string' && typeof val.content === 'string' && isDateLike(val.date)
  );
}

function isChatMessage(val: unknown): val is ChatMessage {
  if (!isObject(val)) return false;
  return typeof val.id === 'string' && typeof val.text === 'string' && typeof val.isUser === 'boolean' && isDateLike(val.timestamp);
}

function isHabitLink(val: unknown): val is HabitLink {
  if (!isObject(val)) return false;
  return typeof val.id === 'string' && typeof val.name === 'string' && typeof val.points === 'number' && typeof val.completed === 'boolean';
}

function isRoutine(val: unknown): val is Routine {
  if (!isObject(val)) return false;
  return (
    typeof val.id === 'string' && typeof val.name === 'string' && typeof val.type === 'string' &&
    Array.isArray((val as any).habitLinks) && (val as any).habitLinks.every(isHabitLink)
  );
}

function isRoutineCompletion(val: unknown): val is RoutineCompletion {
  if (!isObject(val)) return false;
  return typeof val.id === 'string' && typeof val.routineId === 'string' && isDateLike(val.date);
}

function isVisionElement(val: unknown): val is VisionElement {
  if (!isObject(val)) return false;
  return typeof val.id === 'string' && typeof val.type === 'string' && typeof val.title === 'string' && typeof val.content === 'string';
}

function isVisionBoard(val: unknown): val is VisionBoard {
  if (!isObject(val)) return false;
  return typeof val.id === 'string' && Array.isArray((val as any).elements) && (val as any).elements.every(isVisionElement);
}

function isAffirmation(val: unknown): val is Affirmation {
  if (!isObject(val)) return false;
  return typeof val.id === 'string' && typeof val.text === 'string' && typeof val.isCustom === 'boolean' && typeof val.timesUsed === 'number';
}

function isVisualizationSession(val: unknown): val is VisualizationSession {
  if (!isObject(val)) return false;
  return typeof val.id === 'string' && typeof val.duration === 'number' && isArrayOf<string>((val as any).focusGoals, (x): x is string => typeof x === 'string');
}

function isMeditationSession(val: unknown): val is MeditationSession {
  if (!isObject(val)) return false;
  return typeof val.id === 'string' && typeof val.duration === 'number' && typeof (val as any).breathsCompleted === 'number' && isDateLike(val.date);
}

function isMeditationData(val: unknown): val is MeditationData {
  if (!isObject(val)) return false;
  return (
    typeof (val as any).totalBreaths === 'number' &&
    typeof (val as any).daysStreak === 'number' &&
    Array.isArray((val as any).sessions) && (val as any).sessions.every(isMeditationSession) &&
    typeof (val as any).todayCompleted === 'boolean'
  );
}

function isUserProfile(val: unknown): val is UserProfile {
  if (!isObject(val)) return false;
  return typeof val.name === 'string' && typeof val.age === 'string' && typeof val.motivation === 'string';
}

function isWellnessData(val: unknown): val is WellnessData {
  if (!isObject(val)) return false;
  const v = val as any;
  return (
    typeof v.phoenixPoints === 'number' &&
    isArrayOf(v.meals, isMeal) &&
    isArrayOf(v.extendedMeals, isExtendedMeal) &&
    isArrayOf(v.addictions, isAddiction) &&
    isArrayOf(v.supplements, isSupplement) &&
    isArrayOf(v.goals, isGoal) &&
    isArrayOf(v.journalEntries, isJournalEntry) &&
    isArrayOf(v.chatMessages, isChatMessage) &&
    isArrayOf(v.routines, isRoutine) &&
    isArrayOf(v.routineCompletions, isRoutineCompletion) &&
    isUserProfile(v.userProfile) &&
    isDateLike(v.lastUpdated) &&
    isArrayOf(v.visionBoards, isVisionBoard) &&
    isArrayOf(v.affirmations, isAffirmation) &&
    isArrayOf(v.visualizationSessions, isVisualizationSession) &&
    typeof v.visualizationStreak === 'number' &&
    isMeditationData(v.meditation)
  );
}

const STORAGE_KEY = "@phoenix_wellness_data";
const VOICE_PATH_KEY = "@phoenix_cloned_voice_path";
const ELEVEN_KEY = "@phoenix_elevenlabs_api_key";
const ASSEMBLY_KEY = "@phoenix_assemblyai_api_key";
const WEATHER_KEY = "@phoenix_openweather_api_key";
const WAKE_WORD_KEY = "@phoenix_wake_word_enabled";
const SFX_KEY = "@phoenix_voice_sfx_enabled";
const BGM_KEY = "@phoenix_voice_bgm_enabled";
const AUTOREAD_KEY = "@phoenix_voice_autoread_enabled";
const VOICEMODE_KEY = "@phoenix_voice_mode_enabled";
const EQ_KEY = "@phoenix_voice_emotional_intelligence_enabled";
const TTS_SPEED_KEY = "@phoenix_voice_tts_speed";

export const PRESET_THEMES: Theme[] = [
  {
    name: 'Phoenix',
    colors: {
      primary: '#FF4500',
      secondary: '#1A2B3C',
      background: '#121212',
      card: 'rgba(26,43,60,0.3)',
      text: '#FFFFFF'
    }
  },
  {
    name: 'Ocean',
    colors: {
      primary: '#20B2AA',
      secondary: '#191970',
      background: '#001F3F',
      card: 'rgba(25,25,112,0.3)',
      text: '#FFFFFF'
    }
  },
  {
    name: 'Forest',
    colors: {
      primary: '#228B22',
      secondary: '#8B4513',
      background: '#013220',
      card: 'rgba(139,69,19,0.3)',
      text: '#FFFFFF'
    }
  },
  {
    name: 'Sunset',
    colors: {
      primary: '#FF69B4',
      secondary: '#9932CC',
      background: '#2F0A2F',
      card: 'rgba(153,50,204,0.3)',
      text: '#FFFFFF'
    }
  },
  {
    name: 'Minimal',
    colors: {
      primary: '#808080',
      secondary: '#FFFFFF',
      background: '#000000',
      card: 'rgba(255,255,255,0.1)',
      text: '#FFFFFF'
    }
  }
];

export const [WellnessProvider, useWellness] = createContextHook(() => {
  const [data, setData] = useState<WellnessData>({
    phoenixPoints: 0,
    meals: [],
    extendedMeals: [],
    addictions: [],
    supplements: [],
    goals: [],
    journalEntries: [],
    chatMessages: [],
    routines: [],
    routineCompletions: [],
    userProfile: { name: '', age: '', motivation: '' },
    lastUpdated: new Date(),
    theme: PRESET_THEMES[0],
    visionBoards: [],
    affirmations: [],
    visualizationSessions: [],
    dreamLifeScript: undefined,
    visualizationStreak: 0,
    lastVisualizationDate: undefined,
    meditation: {
      totalBreaths: 0,
      daysStreak: 0,
      lastMeditationDate: undefined,
      sessions: [],
      todayCompleted: false,
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [elevenLabsApiKey, setElevenKeyState] = useState<string>("");
  const [assemblyAiApiKey, setAssemblyKeyState] = useState<string>("");
  const [wakeWordEnabled, setWakeWordEnabledState] = useState<boolean>(true);
  const [soundEffectsEnabled, setSfxEnabled] = useState<boolean>(true);
  const [backgroundMusicEnabled, setBgmEnabled] = useState<boolean>(true);
  const [autoReadResponsesEnabled, setAutoReadEnabled] = useState<boolean>(true);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState<boolean>(true);
  const [emotionalIntelligenceEnabled, setEqEnabled] = useState<boolean>(true);
  const [ttsSpeed, setTtsSpeed] = useState<number>(0.8);
  const [openWeatherApiKey, setOpenWeatherKeyState] = useState<string>("");
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(false);
  const [isWakeListening, setIsWakeListening] = useState<boolean>(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const webRecognitionRef = useRef<any>(null);
  const webStreamRef = useRef<MediaStream | null>(null);
  const wakeLoopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStoppingRef = useRef<boolean>(false);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      console.log('[WellnessProvider] loadData() fetched bytes:', stored ? stored.length : 0);

      // Load API keys with web fallback
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const webKey = window.localStorage.getItem(ELEVEN_KEY);
          if (webKey) {
            setElevenKeyState(webKey);
          }
        }
        const key = await AsyncStorage.getItem(ELEVEN_KEY);
        if (key && key.trim().length > 0) {
          setElevenKeyState(key);
        }
        const aaiWeb = Platform.OS === 'web' && typeof window !== 'undefined' ? window.localStorage.getItem(ASSEMBLY_KEY) : null;
        if (aaiWeb) setAssemblyKeyState(aaiWeb);
        const aaiKey = await AsyncStorage.getItem(ASSEMBLY_KEY);
        if (aaiKey && aaiKey.trim().length > 0) setAssemblyKeyState(aaiKey);
        const owWeb = Platform.OS === 'web' && typeof window !== 'undefined' ? window.localStorage.getItem(WEATHER_KEY) : null;
        if (owWeb) setOpenWeatherKeyState(owWeb);
        const owKey = await AsyncStorage.getItem(WEATHER_KEY);
        if (owKey && owKey.trim().length > 0) setOpenWeatherKeyState(owKey);
      } catch (e) {
        console.warn('[WellnessProvider] Failed to load API keys', e);
      }

      // Load wake word and voice settings with web fallback
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const webWakeWord = window.localStorage.getItem(WAKE_WORD_KEY);
          if (webWakeWord !== null) setWakeWordEnabledState(webWakeWord === 'true');
          const webSfx = window.localStorage.getItem(SFX_KEY);
          if (webSfx !== null) setSfxEnabled(webSfx === 'true');
          const webBgm = window.localStorage.getItem(BGM_KEY);
          if (webBgm !== null) setBgmEnabled(webBgm === 'true');
          const webAuto = window.localStorage.getItem(AUTOREAD_KEY);
          if (webAuto !== null) setAutoReadEnabled(webAuto === 'true');
          const webVm = window.localStorage.getItem(VOICEMODE_KEY);
          if (webVm !== null) setVoiceModeEnabled(webVm === 'true');
          const webEq = window.localStorage.getItem(EQ_KEY);
          if (webEq !== null) setEqEnabled(webEq === 'true');
          const webSpeed = window.localStorage.getItem(TTS_SPEED_KEY);
          if (webSpeed !== null) setTtsSpeed(Number(webSpeed) || 0.8);
        }
        const wakeWordSetting = await AsyncStorage.getItem(WAKE_WORD_KEY);
        if (wakeWordSetting !== null) setWakeWordEnabledState(wakeWordSetting === 'true');
        const sfxSetting = await AsyncStorage.getItem(SFX_KEY);
        if (sfxSetting !== null) setSfxEnabled(sfxSetting === 'true');
        const bgmSetting = await AsyncStorage.getItem(BGM_KEY);
        if (bgmSetting !== null) setBgmEnabled(bgmSetting === 'true');
        const autoSetting = await AsyncStorage.getItem(AUTOREAD_KEY);
        if (autoSetting !== null) setAutoReadEnabled(autoSetting === 'true');
        const vmSetting = await AsyncStorage.getItem(VOICEMODE_KEY);
        if (vmSetting !== null) setVoiceModeEnabled(vmSetting === 'true');
        const eqSetting = await AsyncStorage.getItem(EQ_KEY);
        if (eqSetting !== null) setEqEnabled(eqSetting === 'true');
        const speedSetting = await AsyncStorage.getItem(TTS_SPEED_KEY);
        if (speedSetting !== null) setTtsSpeed(Number(speedSetting) || 0.8);
        console.log('[WellnessProvider] Voice settings loaded', { wake: wakeWordSetting, sfx: sfxSetting, bgm: bgmSetting, auto: autoSetting, vm: vmSetting, eq: eqSetting, speed: speedSetting });
      } catch (e) {
        console.warn('[WellnessProvider] Failed to load voice settings', e);
      }

      if (stored) {
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(stored);
        } catch (e) {
          console.warn('[WellnessProvider] Corrupted storage. Clearing...', e);
          await AsyncStorage.removeItem(STORAGE_KEY);
          parsed = null;
        }
        if (!parsed || !isObject(parsed)) {
          setIsLoading(false);
          return;
        }
        const base = parsed as Record<string, unknown>;
        if (!isWellnessData(base)) {
          console.warn('[WellnessProvider] Stored data failed type checks. Resetting to defaults.');
          await AsyncStorage.removeItem(STORAGE_KEY);
          setIsLoading(false);
          return;
        }
        setData({
          ...base,
          lastUpdated: new Date(base.lastUpdated as any),
          elevenLabsApiKey: (base as any).elevenLabsApiKey ?? undefined,
          wakeWordEnabled: (base as any).wakeWordEnabled ?? true,
          soundEffectsEnabled: (base as any).soundEffectsEnabled ?? true,
          backgroundMusicEnabled: (base as any).backgroundMusicEnabled ?? true,
          autoReadResponsesEnabled: (base as any).autoReadResponsesEnabled ?? true,
          voiceModeEnabled: (base as any).voiceModeEnabled ?? true,
          emotionalIntelligenceEnabled: (base as any).emotionalIntelligenceEnabled ?? true,
          ttsSpeed: (base as any).ttsSpeed ?? 0.8,
          meals: (base.meals as any[])?.map((m: any) => ({ ...m, date: new Date(m.date) })) || [],
          extendedMeals: (base.extendedMeals as any[])?.map((m: any) => ({ ...m, date: new Date(m.date) })) || [],
          addictions: (base.addictions as any[])?.map((a: any) => ({
            ...a,
            lastReset: new Date(a.lastReset),
            createdAt: new Date(a.createdAt),
          })) || [],
          supplements: (base.supplements as any[])?.map((s: any) => ({
            ...s,
            lastTaken: s.lastTaken ? new Date(s.lastTaken) : undefined,
            weeklyHistory: s.weeklyHistory || [false, false, false, false, false, false, false],
          })) || [],
          goals: (base.goals as any[])?.map((g: any) => ({
            ...g,
            createdAt: new Date(g.createdAt),
            targetDate: new Date(g.targetDate),
            completedAt: g.completedAt ? new Date(g.completedAt) : undefined,
            milestones: g.milestones || [],
            progress: g.progress || 0,
            measurementMethod: g.measurementMethod || '',
            priority: g.priority || 'medium',
          })) || [],
          journalEntries: (base.journalEntries as any[])?.map((j: any) => ({
            ...j,
            date: new Date(j.date),
          })) || [],
          chatMessages: (base.chatMessages as any[])?.map((c: any) => ({
            ...c,
            timestamp: new Date(c.timestamp),
          })) || [],
          routines: (base.routines as any[])?.map((r: any) => ({
            ...r,
            createdAt: new Date(r.createdAt),
            lastCompleted: r.lastCompleted ? new Date(r.lastCompleted) : undefined,
          })) || [],
          routineCompletions: (base.routineCompletions as any[])?.map((rc: any) => ({
            ...rc,
            date: new Date(rc.date),
          })) || [],
          userProfile: (base.userProfile as any) || { name: '', age: '', motivation: '' },
          theme: (base.theme as any) || PRESET_THEMES[0],
          visionBoards: (base.visionBoards as any[])?.map((vb: any) => ({
            ...vb,
            createdAt: new Date(vb.createdAt),
            lastViewed: vb.lastViewed ? new Date(vb.lastViewed) : undefined,
            elements: vb.elements?.map((el: any) => ({
              ...el,
              createdAt: new Date(el.createdAt),
              targetDate: el.targetDate ? new Date(el.targetDate) : undefined,
              achievedDate: el.achievedDate ? new Date(el.achievedDate) : undefined,
            })) || [],
          })) || [],
          affirmations: (base.affirmations as any[])?.map((a: any) => ({
            ...a,
            createdAt: new Date(a.createdAt),
          })) || [],
          visualizationSessions: (base.visualizationSessions as any[])?.map((vs: any) => ({
            ...vs,
            date: new Date(vs.date),
          })) || [],
          dreamLifeScript: (base as any).dreamLifeScript ? {
            ...(base as any).dreamLifeScript,
            lastUpdated: new Date((base as any).dreamLifeScript.lastUpdated),
          } : undefined,
          visualizationStreak: (base as any).visualizationStreak || 0,
          lastVisualizationDate: (base as any).lastVisualizationDate ? new Date((base as any).lastVisualizationDate) : undefined,
          meditation: {
            totalBreaths: (base as any).meditation?.totalBreaths || 0,
            daysStreak: (base as any).meditation?.daysStreak || 0,
            lastMeditationDate: (base as any).meditation?.lastMeditationDate ? new Date((base as any).meditation.lastMeditationDate) : undefined,
            sessions: (base as any).meditation?.sessions?.map((s: any) => ({
              ...s,
              date: new Date(s.date),
            })) || [],
            todayCompleted: (base as any).meditation?.todayCompleted || false,
          },
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveInFlight = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDataImmediate = useCallback(async (payload: WellnessData) => {
    try {
      saveInFlight.current = true;
      const serialized = JSON.stringify(payload);
      await AsyncStorage.setItem(STORAGE_KEY, serialized);
      console.log('[WellnessProvider] saveDataImmediate() bytes:', serialized.length);
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      saveInFlight.current = false;
    }
  }, []);

  const scheduleSave = useCallback((payload: WellnessData) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      if (Platform.OS === 'android') {
        InteractionManager.runAfterInteractions(() => {
          void saveDataImmediate(payload);
        });
      } else {
        void saveDataImmediate(payload);
      }
    }, 300);
  }, [saveDataImmediate]);

  // Load data from AsyncStorage
  useEffect(() => {
    loadData();
  }, []);

  // Ensure wake word default and request mic early + hard stop of any dangling audio session
  useEffect(() => {
    (async () => {
      try {
        let stored = await AsyncStorage.getItem(WAKE_WORD_KEY);
        if (stored === null) {
          setWakeWordEnabledState(true);
          await AsyncStorage.setItem(WAKE_WORD_KEY, 'true');
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.localStorage.setItem(WAKE_WORD_KEY, 'true');
          }
        }
        if (Platform.OS !== 'web') {
          const perm = await Audio.requestPermissionsAsync();
          console.log('[WellnessProvider] Mic permission', perm);
          if (!perm.granted) {
            Alert.alert('Mic access needed');
          }
          try {
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false, staysActiveInBackground: false });
          } catch (e) {
            console.log('[WellnessProvider] Audio mode reset on mount failed', e);
          }
        }
      } catch (e) {
        console.warn('[WellnessProvider] wake init failed', e);
      }
    })();

    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'background' || s === 'inactive') {
        void stopWakeWordInternal('appstate-background');
      }
      if (s === 'active') {
        try {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('phoenix:wake-check'));
          }
        } catch (e) {
          console.log('[WellnessProvider] AppState wake-check error', e);
        }
      }
    });
    return () => { try { sub.remove(); } catch {} };
  }, []);

  // Apply theme to web
  useEffect(() => {
    if (Platform.OS === 'web' && data.theme && typeof document !== 'undefined') {
      try {
        const root = document.documentElement;
        root.style.setProperty('--primary-color', data.theme.colors.primary);
        root.style.setProperty('--secondary-color', data.theme.colors.secondary);
        root.style.setProperty('--background-color', data.theme.colors.background);
        root.style.setProperty('--card-color', data.theme.colors.card);
        root.style.setProperty('--text-color', data.theme.colors.text);
      } catch (error) {
        console.error('Error applying theme to web:', error);
      }
    }
  }, [data.theme]);

  // Save data to AsyncStorage with debounce to avoid blocking UI on Android
  useEffect(() => {
    if (!isLoading) {
      scheduleSave(data);
    }
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [data, isLoading, scheduleSave]);

  // Keep API keys persisted separately too
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(ELEVEN_KEY, elevenLabsApiKey ?? "");
        await AsyncStorage.setItem(ASSEMBLY_KEY, assemblyAiApiKey ?? "");
        await AsyncStorage.setItem(WEATHER_KEY, openWeatherApiKey ?? "");
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          if (elevenLabsApiKey && elevenLabsApiKey.trim().length > 0) {
            window.localStorage.setItem(ELEVEN_KEY, elevenLabsApiKey);
          } else {
            window.localStorage.removeItem(ELEVEN_KEY);
          }
          if (assemblyAiApiKey && assemblyAiApiKey.trim().length > 0) {
            window.localStorage.setItem(ASSEMBLY_KEY, assemblyAiApiKey);
          } else {
            window.localStorage.removeItem(ASSEMBLY_KEY);
          }
          if (openWeatherApiKey && openWeatherApiKey.trim().length > 0) {
            window.localStorage.setItem(WEATHER_KEY, openWeatherApiKey);
          } else {
            window.localStorage.removeItem(WEATHER_KEY);
          }
        }
        console.log('[WellnessProvider] Keys persisted', { elevenLen: (elevenLabsApiKey ?? '').length, assemblyLen: (assemblyAiApiKey ?? '').length, weatherLen: (openWeatherApiKey ?? '').length });
      } catch (e) {
        console.warn('[WellnessProvider] Persist key failed', e);
      }
    })();
  }, [elevenLabsApiKey, assemblyAiApiKey, openWeatherApiKey]);

  // Persist voice settings separately (with web fallback)
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(WAKE_WORD_KEY, wakeWordEnabled.toString());
        await AsyncStorage.setItem(SFX_KEY, soundEffectsEnabled.toString());
        await AsyncStorage.setItem(BGM_KEY, backgroundMusicEnabled.toString());
        await AsyncStorage.setItem(AUTOREAD_KEY, autoReadResponsesEnabled.toString());
        await AsyncStorage.setItem(VOICEMODE_KEY, voiceModeEnabled.toString());
        await AsyncStorage.setItem(EQ_KEY, emotionalIntelligenceEnabled.toString());
        await AsyncStorage.setItem(TTS_SPEED_KEY, String(ttsSpeed));
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.localStorage.setItem(WAKE_WORD_KEY, wakeWordEnabled.toString());
          window.localStorage.setItem(SFX_KEY, soundEffectsEnabled.toString());
          window.localStorage.setItem(BGM_KEY, backgroundMusicEnabled.toString());
          window.localStorage.setItem(AUTOREAD_KEY, autoReadResponsesEnabled.toString());
          window.localStorage.setItem(VOICEMODE_KEY, voiceModeEnabled.toString());
          window.localStorage.setItem(EQ_KEY, emotionalIntelligenceEnabled.toString());
          window.localStorage.setItem(TTS_SPEED_KEY, String(ttsSpeed));
        }
        console.log('[WellnessProvider] Voice settings persisted', { wakeWordEnabled, soundEffectsEnabled, backgroundMusicEnabled, autoReadResponsesEnabled, voiceModeEnabled, emotionalIntelligenceEnabled, ttsSpeed });
      } catch (e) {
        console.warn('[WellnessProvider] Persist voice settings failed', e);
      }
    })();
  }, [wakeWordEnabled, soundEffectsEnabled, backgroundMusicEnabled, autoReadResponsesEnabled, voiceModeEnabled, emotionalIntelligenceEnabled, ttsSpeed]);

  // Reset supplements daily
  useEffect(() => {
    try {
      const now = new Date();
      const lastUpdate = new Date(data.lastUpdated);
      if (now.toDateString() !== lastUpdate.toDateString()) {
        setData((prev) => ({
          ...prev,
          supplements: (prev.supplements ?? []).map((s) => ({ ...s, takenToday: false })),
          meals: (prev.meals ?? []).filter(
            (m) => new Date(m.date).toDateString() === now.toDateString()
          ),
          lastUpdated: now,
        }));
      }
    } catch (e) {
      console.error('[WellnessProvider] daily reset error', e);
    }
  }, [data.lastUpdated]);

  // Phoenix Points calculation
  const calculatePhoenixPoints = useCallback(() => {
    try {
      let points = 0;
      points += (data.meals ?? []).filter((m) => m.completed).length * 10;
      (data.addictions ?? []).forEach((addiction) => {
        const days = Math.floor(
          (Date.now() - new Date(addiction.lastReset).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        points += days * 5;
      });
      points += (data.supplements ?? []).filter((s) => s.takenToday).length * 2;
      points += (data.goals ?? []).filter((g) => g.completed).length * 50;
      points += (data.journalEntries ?? []).length * 15;
      const today = new Date().toDateString();
      const todaysCompletions = (data.routineCompletions ?? []).filter(
        (rc) => new Date(rc.date).toDateString() === today
      );
      todaysCompletions.forEach((completion) => {
        const routine = (data.routines ?? []).find((r) => r.id === completion.routineId);
        if (routine) {
          const basePoints = (routine.habitLinks ?? []).reduce((sum, link) => sum + link.points, 0);
          points += Math.floor(basePoints * (completion.completionPercentage / 100));
        }
      });
      points += (data.visualizationSessions ?? []).length * 5;
      (data.visionBoards ?? []).forEach((board) => {
        points += (board.elements ?? []).filter((el) => el.achieved).length * 25;
      });
      points += (data.visualizationStreak ?? 0) * 3;
      points += (data.meditation.sessions ?? []).length * 5;
      points += (data.meditation.daysStreak ?? 0) * 2;
      if (data.meditation.todayCompleted) {
        points += 10;
      }
      return points;
    } catch (e) {
      console.error('[WellnessProvider] calculatePhoenixPoints error', e);
      return 0;
    }
  }, [data]);

  const phoenixPoints = useMemo(() => calculatePhoenixPoints(), [calculatePhoenixPoints]);

  // Robust Wake Word system ("hey anuna") with proper cleanup
  const stopWakeWordInternal = useCallback(async (reason: string) => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    console.log('[WellnessProvider][Wake] stop internal', reason);
    setIsWakeListening(false);
    try { if (wakeLoopTimerRef.current) { clearTimeout(wakeLoopTimerRef.current); wakeLoopTimerRef.current = null; } } catch {}

    if (Platform.OS === 'web') {
      try { webRecognitionRef.current?.stop?.(); } catch {}
      try {
        const stream = webStreamRef.current as MediaStream | null;
        stream?.getTracks?.().forEach((t) => { try { t.stop(); } catch {} });
      } catch {}
      webRecognitionRef.current = null;
      webStreamRef.current = null;
    } else {
      try {
        const rec = recordingRef.current as Audio.Recording | null;
        if (rec) {
          try { await rec.stopAndUnloadAsync(); } catch {}
        }
      } catch {}
      recordingRef.current = null;
      try { await Audio.setAudioModeAsync({ allowsRecordingIOS: false, staysActiveInBackground: false }); } catch {}
    }
    isStoppingRef.current = false;
  }, []);

  const detectWake = useCallback((text: string) => {
    try {
      const matched = /\bhey\s+anuna\b/i.test(text ?? '');
      console.log('[WellnessProvider][Wake] detected:', matched, text);
      if (matched) {
        setIsMicEnabled(true);
        void stopWakeWordInternal('wake-detected');
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          try { window.dispatchEvent(new Event('phoenix:wake-detected')); } catch {}
        }
      }
    } catch (e) { console.log('[WellnessProvider][Wake] detect error', e); }
  }, [stopWakeWordInternal]);

  const startWakeWord = useCallback(async () => {
    if (!wakeWordEnabled || isMicEnabled || isWakeListening) {
      console.log('[WellnessProvider][Wake] start blocked', { wakeWordEnabled, isMicEnabled, isWakeListening });
      return;
    }
    console.log('[WellnessProvider][Wake] starting...');
    setIsWakeListening(true);

    if (Platform.OS === 'web') {
      try {
        const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!SR) {
          console.log('[WellnessProvider][Wake][Web] SpeechRecognition not supported');
          setIsWakeListening(false);
          return;
        }
        const recognition = new SR();
        webRecognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onstart = () => console.log('[WellnessProvider][Wake][Web] started');
        recognition.onresult = (event: any) => {
          try {
            const last = event.results[event.results.length - 1];
            const transcript = last && last[0] && typeof last[0].transcript === 'string' ? last[0].transcript : '';
            detectWake(transcript);
          } catch (e) { console.log('[WellnessProvider][Wake][Web] parse error', e); }
        };
        recognition.onerror = (ev: any) => console.log('[WellnessProvider][Wake][Web] error', ev?.error);
        recognition.onend = () => {
          if (isWakeListening && !isMicEnabled) {
            try { recognition.start(); } catch {}
          }
        };
        recognition.start();
      } catch (e) {
        console.log('[WellnessProvider][Wake][Web] start error', e);
        setIsWakeListening(false);
      }
      return;
    }

    try {
      const perm = await Audio.requestPermissionsAsync();
      console.log('[WellnessProvider][Wake][Mobile] Mic permission:', perm);
      if (!perm.granted) { console.log('Mic access denied, stopping listener'); setIsWakeListening(false); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, shouldDuckAndroid: true, staysActiveInBackground: false });

      const loop = async () => {
        if (!isWakeListening || isMicEnabled) return;
        try {
          const rec = new Audio.Recording();
          recordingRef.current = rec;
          await rec.prepareToRecordAsync({
            android: {
              extension: '.m4a',
              outputFormat: (Audio as any).RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
              audioEncoder: (Audio as any).RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
              sampleRate: 44100,
              numberOfChannels: 1,
              bitRate: 128000,
            },
            ios: {
              extension: '.wav',
              outputFormat: (Audio as any).RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
              audioQuality: (Audio as any).RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
              sampleRate: 44100,
              numberOfChannels: 1,
              bitRate: 128000,
              linearPCMBitDepth: 16,
              linearPCMIsBigEndian: false,
              linearPCMIsFloat: false,
            },
            web: {},
          } as any);
          await rec.startAsync();
          await new Promise((r) => setTimeout(r, 15000));
          try { await rec.stopAndUnloadAsync(); } catch {}
          const uri = rec.getURI();
          recordingRef.current = null;
          if (!uri) { if (isWakeListening && !isMicEnabled) wakeLoopTimerRef.current = setTimeout(loop, 3000); return; }
          const key = (assemblyAiApiKey ?? '').trim();
          if (!key) { console.log('[WellnessProvider][Wake][Mobile] Missing AssemblyAI key'); if (isWakeListening && !isMicEnabled) wakeLoopTimerRef.current = setTimeout(loop, 8000); return; }
          try {
            const upload = await FileSystem.uploadAsync('https://api.assemblyai.com/v2/upload', uri, { httpMethod: 'POST', headers: { Authorization: key }, uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT });
            if (upload.status >= 200 && upload.status < 300) {
              const uj = JSON.parse(upload.body || '{}');
              const audioUrl: string = uj?.upload_url ?? uj?.url ?? '';
              if (audioUrl) {
                const create = await fetch('https://api.assemblyai.com/v2/transcript', { method: 'POST', headers: { Authorization: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ audio_url: audioUrl }) });
                if (create.ok) {
                  const cj = await create.json();
                  const id: string = cj?.id ?? '';
                  if (id) {
                    const started = Date.now();
                    while (Date.now() - started < 30000 && !isMicEnabled) {
                      await new Promise(r => setTimeout(r, 1500));
                      const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, { headers: { Authorization: key } });
                      const pj = await poll.json();
                      const status: string = pj?.status ?? '';
                      console.log('[WellnessProvider][Wake][Mobile] poll', status);
                      if (status === 'completed') { detectWake((pj?.text as string) || ''); break; }
                      if (status === 'error') { console.log('[WellnessProvider][Wake][Mobile] error', pj?.error); break; }
                    }
                  }
                }
              }
            }
          } catch (e) { console.log('[WellnessProvider][Wake][Mobile] transcribe error', e); }
        } catch (e) {
          console.log('[WellnessProvider][Wake][Mobile] loop error', e);
        } finally {
          if (isWakeListening && !isMicEnabled) {
            wakeLoopTimerRef.current = setTimeout(loop, 5000);
          }
        }
      };

      void loop();
    } catch (e) {
      console.log('[WellnessProvider][Wake][Mobile] start error', e);
      setIsWakeListening(false);
      try { await Audio.setAudioModeAsync({ allowsRecordingIOS: false }); } catch {}
    }
  }, [assemblyAiApiKey, isMicEnabled, isWakeListening, wakeWordEnabled, detectWake]);

  useEffect(() => {
    if (wakeWordEnabled && !isMicEnabled) {
      void startWakeWord();
    } else {
      void stopWakeWordInternal('state-change');
    }
    return () => { void stopWakeWordInternal('effect-cleanup'); };
  }, [wakeWordEnabled, isMicEnabled, startWakeWord, stopWakeWordInternal]);

  // Meal functions
  const addMeal = useCallback((meal: Omit<Meal, "id" | "date">) => {
    const newMeal: Meal = {
      ...meal,
      id: Date.now().toString(),
      date: new Date(),
    };
    setData((prev) => ({ ...prev, meals: [...prev.meals, newMeal] }));
  }, []);

  const toggleMealComplete = useCallback((mealId: string) => {
    setData((prev) => ({
      ...prev,
      meals: prev.meals.map((m) =>
        m.id === mealId ? { ...m, completed: !m.completed } : m
      ),
    }));
  }, []);

  const deleteMeal = useCallback((mealId: string) => {
    setData((prev) => ({
      ...prev,
      meals: prev.meals.filter((m) => m.id !== mealId),
    }));
  }, []);

  // Extended meal functions
  const addExtendedMeal = useCallback((meal: Omit<ExtendedMeal, "id">) => {
    const newMeal: ExtendedMeal = {
      ...meal,
      id: Date.now().toString(),
    };
    setData((prev) => ({ ...prev, extendedMeals: [...prev.extendedMeals, newMeal] }));
  }, []);

  const deleteExtendedMeal = useCallback((mealId: string) => {
    setData((prev) => ({
      ...prev,
      extendedMeals: prev.extendedMeals.filter((m) => m.id !== mealId),
    }));
  }, []);

  // Addiction functions
  const addAddiction = useCallback((name: string) => {
    const newAddiction: Addiction = {
      id: Date.now().toString(),
      name,
      lastReset: new Date(),
      createdAt: new Date(),
    };
    setData((prev) => ({
      ...prev,
      addictions: [...prev.addictions, newAddiction],
    }));
  }, []);

  const resetAddictionStreak = useCallback((addictionId: string) => {
    setData((prev) => ({
      ...prev,
      addictions: prev.addictions.map((a) =>
        a.id === addictionId ? { ...a, lastReset: new Date() } : a
      ),
    }));
  }, []);

  const deleteAddiction = useCallback((addictionId: string) => {
    setData((prev) => ({
      ...prev,
      addictions: prev.addictions.filter((a) => a.id !== addictionId),
    }));
  }, []);

  // Supplement functions
  const addSupplement = useCallback((supplement: Omit<Supplement, "id" | "weeklyHistory">) => {
    const newSupplement: Supplement = {
      ...supplement,
      id: Date.now().toString(),
      weeklyHistory: [false, false, false, false, false, false, false],
    };
    setData((prev) => ({
      ...prev,
      supplements: [...prev.supplements, newSupplement],
    }));
  }, []);

  const toggleSupplementTaken = useCallback((supplementId: string) => {
    setData((prev) => ({
      ...prev,
      supplements: prev.supplements.map((s) => {
        if (s.id === supplementId) {
          const newTakenToday = !s.takenToday;
          const newHistory = [...s.weeklyHistory];
          const today = new Date().getDay();
          newHistory[today] = newTakenToday;
          
          return {
            ...s,
            takenToday: newTakenToday,
            lastTaken: newTakenToday ? new Date() : s.lastTaken,
            weeklyHistory: newHistory,
          };
        }
        return s;
      }),
    }));
  }, []);

  const deleteSupplement = useCallback((supplementId: string) => {
    setData((prev) => ({
      ...prev,
      supplements: prev.supplements.filter((s) => s.id !== supplementId),
    }));
  }, []);

  // Goal functions
  const addGoal = useCallback((goal: Omit<Goal, "id" | "createdAt">) => {
    const newGoal: Goal = {
      ...goal,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setData((prev) => ({ ...prev, goals: [...prev.goals, newGoal] }));
  }, []);

  const updateGoal = useCallback((goalId: string, updates: Partial<Goal>) => {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId ? { ...g, ...updates } : g
      ),
    }));
  }, []);

  const completeGoal = useCallback((goalId: string) => {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              completed: true,
              completedAt: new Date(),
              progress: 100,
            }
          : g
      ),
    }));
  }, []);

  const updateGoalProgress = useCallback((goalId: string, progress: number) => {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              progress: Math.min(Math.max(progress, 0), 100),
              completed: progress >= 100,
              completedAt: progress >= 100 ? new Date() : g.completedAt,
            }
          : g
      ),
    }));
  }, []);

  const deleteGoal = useCallback((goalId: string) => {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== goalId),
    }));
  }, []);

  // Journal functions
  const addJournalEntry = useCallback((entry: Omit<JournalEntry, "id" | "date">) => {
    const newEntry: JournalEntry = {
      ...entry,
      id: Date.now().toString(),
      date: new Date(),
    };
    setData((prev) => ({
      ...prev,
      journalEntries: [newEntry, ...prev.journalEntries],
    }));
  }, []);

  const updateJournalEntry = useCallback((entryId: string, updates: Partial<JournalEntry>) => {
    setData((prev) => ({
      ...prev,
      journalEntries: prev.journalEntries.map((j) =>
        j.id === entryId ? { ...j, ...updates } : j
      ),
    }));
  }, []);

  const deleteJournalEntry = useCallback((entryId: string) => {
    setData((prev) => ({
      ...prev,
      journalEntries: prev.journalEntries.filter((j) => j.id !== entryId),
    }));
  }, []);

  // Theme functions
  const updateTheme = useCallback((theme: Theme) => {
    setData((prev) => ({ ...prev, theme }));
  }, []);

  const resetToPhoenixTheme = useCallback(() => {
    setData((prev) => ({ ...prev, theme: PRESET_THEMES[0] }));
  }, []);

  // Chat functions
  const addChatMessage = useCallback((message: Omit<ChatMessage, "id" | "timestamp">) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setData((prev) => ({
      ...prev,
      chatMessages: [...prev.chatMessages, newMessage],
    }));
  }, []);

  const clearChatHistory = useCallback(() => {
    setData((prev) => ({ ...prev, chatMessages: [] }));
  }, []);

  // User profile functions
  const updateUserProfile = useCallback((profile: UserProfile) => {
    setData((prev) => ({ ...prev, userProfile: profile }));
  }, []);

  // Routine functions
  const addRoutine = useCallback((routine: Omit<Routine, "id" | "createdAt" | "streak" | "bestStreak" | "completionRate" | "totalCompletions">) => {
    const newRoutine: Routine = {
      ...routine,
      id: Date.now().toString(),
      createdAt: new Date(),
      streak: 0,
      bestStreak: 0,
      completionRate: 0,
      totalCompletions: 0,
    };
    setData((prev) => ({ ...prev, routines: [...prev.routines, newRoutine] }));
  }, []);

  const updateRoutine = useCallback((routineId: string, updates: Partial<Routine>) => {
    setData((prev) => ({
      ...prev,
      routines: prev.routines.map((r) =>
        r.id === routineId ? { ...r, ...updates } : r
      ),
    }));
  }, []);

  const deleteRoutine = useCallback((routineId: string) => {
    setData((prev) => ({
      ...prev,
      routines: prev.routines.filter((r) => r.id !== routineId),
      routineCompletions: prev.routineCompletions.filter((rc) => rc.routineId !== routineId),
    }));
  }, []);

  const completeRoutine = useCallback((routineId: string, completedLinkIds: string[]) => {
    setData((prev) => {
      const routine = prev.routines.find((r) => r.id === routineId);
      if (!routine) return prev;

      const completionPercentage = (completedLinkIds.length / routine.habitLinks.length) * 100;
      const isFullCompletion = completionPercentage === 100;
      
      const completion: RoutineCompletion = {
        id: Date.now().toString(),
        routineId,
        date: new Date(),
        completedLinks: completedLinkIds,
        partialCompletion: !isFullCompletion,
        completionPercentage,
      };

      const updatedRoutines = prev.routines.map((r) => {
        if (r.id === routineId) {
          const newTotalCompletions = r.totalCompletions + 1;
          const newStreak = isFullCompletion ? r.streak + 1 : 0;
          const newBestStreak = Math.max(r.bestStreak, newStreak);
          const newCompletionRate = (newTotalCompletions > 0) 
            ? ((r.completionRate * r.totalCompletions + completionPercentage) / newTotalCompletions)
            : completionPercentage;

          return {
            ...r,
            streak: newStreak,
            bestStreak: newBestStreak,
            lastCompleted: new Date(),
            completionRate: newCompletionRate,
            totalCompletions: newTotalCompletions,
          };
        }
        return r;
      });

      return {
        ...prev,
        routines: updatedRoutines,
        routineCompletions: [...prev.routineCompletions, completion],
      };
    });
  }, []);

  const reorderHabitLinks = useCallback((routineId: string, newOrder: HabitLink[]) => {
    setData((prev) => ({
      ...prev,
      routines: prev.routines.map((r) =>
        r.id === routineId ? { ...r, habitLinks: newOrder } : r
      ),
    }));
  }, []);

  // Vision Board functions
  const addVisionBoard = useCallback((board: Omit<VisionBoard, "id" | "createdAt">) => {
    const newBoard: VisionBoard = {
      ...board,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setData((prev) => ({ ...prev, visionBoards: [...prev.visionBoards, newBoard] }));
  }, []);

  const updateVisionBoard = useCallback((boardId: string, updates: Partial<VisionBoard>) => {
    setData((prev) => ({
      ...prev,
      visionBoards: prev.visionBoards.map((vb) =>
        vb.id === boardId ? { ...vb, ...updates } : vb
      ),
    }));
  }, []);

  const deleteVisionBoard = useCallback((boardId: string) => {
    setData((prev) => ({
      ...prev,
      visionBoards: prev.visionBoards.filter((vb) => vb.id !== boardId),
    }));
  }, []);

  const addVisionElement = useCallback((boardId: string, element: Omit<VisionElement, "id" | "createdAt">) => {
    const newElement: VisionElement = {
      ...element,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setData((prev) => ({
      ...prev,
      visionBoards: prev.visionBoards.map((vb) =>
        vb.id === boardId
          ? { ...vb, elements: [...vb.elements, newElement] }
          : vb
      ),
    }));
  }, []);

  const updateVisionElement = useCallback((boardId: string, elementId: string, updates: Partial<VisionElement>) => {
    setData((prev) => ({
      ...prev,
      visionBoards: prev.visionBoards.map((vb) =>
        vb.id === boardId
          ? {
              ...vb,
              elements: vb.elements.map((el) =>
                el.id === elementId ? { ...el, ...updates } : el
              ),
            }
          : vb
      ),
    }));
  }, []);

  const deleteVisionElement = useCallback((boardId: string, elementId: string) => {
    setData((prev) => ({
      ...prev,
      visionBoards: prev.visionBoards.map((vb) =>
        vb.id === boardId
          ? { ...vb, elements: vb.elements.filter((el) => el.id !== elementId) }
          : vb
      ),
    }));
  }, []);

  const markVisionElementAchieved = useCallback((boardId: string, elementId: string) => {
    setData((prev) => ({
      ...prev,
      visionBoards: prev.visionBoards.map((vb) =>
        vb.id === boardId
          ? {
              ...vb,
              elements: vb.elements.map((el) =>
                el.id === elementId
                  ? { ...el, achieved: true, achievedDate: new Date() }
                  : el
              ),
            }
          : vb
      ),
    }));
  }, []);

  // Affirmation functions
  const addAffirmation = useCallback((affirmation: Omit<Affirmation, "id" | "createdAt" | "timesUsed">) => {
    const newAffirmation: Affirmation = {
      ...affirmation,
      id: Date.now().toString(),
      createdAt: new Date(),
      timesUsed: 0,
    };
    setData((prev) => ({ ...prev, affirmations: [...prev.affirmations, newAffirmation] }));
  }, []);

  const updateAffirmation = useCallback((affirmationId: string, updates: Partial<Affirmation>) => {
    setData((prev) => ({
      ...prev,
      affirmations: prev.affirmations.map((a) =>
        a.id === affirmationId ? { ...a, ...updates } : a
      ),
    }));
  }, []);

  const deleteAffirmation = useCallback((affirmationId: string) => {
    setData((prev) => ({
      ...prev,
      affirmations: prev.affirmations.filter((a) => a.id !== affirmationId),
    }));
  }, []);

  const useAffirmation = useCallback((affirmationId: string) => {
    setData((prev) => ({
      ...prev,
      affirmations: prev.affirmations.map((a) =>
        a.id === affirmationId ? { ...a, timesUsed: a.timesUsed + 1 } : a
      ),
    }));
  }, []);

  // Visualization functions
  const addVisualizationSession = useCallback((session: Omit<VisualizationSession, "id" | "date">) => {
    const newSession: VisualizationSession = {
      ...session,
      id: Date.now().toString(),
      date: new Date(),
    };
    
    // Update visualization streak
    const today = new Date().toDateString();
    const lastDate = data.lastVisualizationDate ? new Date(data.lastVisualizationDate).toDateString() : null;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    let newStreak = data.visualizationStreak;
    if (lastDate === yesterday || lastDate === today) {
      newStreak = lastDate === today ? newStreak : newStreak + 1;
    } else {
      newStreak = 1;
    }
    
    setData((prev) => ({
      ...prev,
      visualizationSessions: [...prev.visualizationSessions, newSession],
      visualizationStreak: newStreak,
      lastVisualizationDate: new Date(),
    }));
  }, [data.visualizationStreak, data.lastVisualizationDate]);

  // Dream Life Script functions
  const updateDreamLifeScript = useCallback((script: Omit<DreamLifeScript, "id" | "lastUpdated">) => {
    const updatedScript: DreamLifeScript = {
      ...script,
      id: data.dreamLifeScript?.id || Date.now().toString(),
      lastUpdated: new Date(),
    };
    setData((prev) => ({ ...prev, dreamLifeScript: updatedScript }));
  }, [data.dreamLifeScript]);

  // Meditation functions
  const addMeditationSession = useCallback((session: Omit<MeditationSession, "id" | "date">) => {
    const newSession: MeditationSession = {
      ...session,
      id: Date.now().toString(),
      date: new Date(),
    };
    
    setData((prev) => ({
      ...prev,
      meditation: {
        ...prev.meditation,
        totalBreaths: prev.meditation.totalBreaths + session.breathsCompleted,
        sessions: [...prev.meditation.sessions, newSession],
      },
    }));
  }, []);

  const markMeditationDayComplete = useCallback(() => {
    const today = new Date().toDateString();
    const lastDate = data.meditation.lastMeditationDate ? new Date(data.meditation.lastMeditationDate).toDateString() : null;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    let newStreak = data.meditation.daysStreak;
    if (lastDate === yesterday) {
      newStreak = newStreak + 1;
    } else if (lastDate !== today) {
      newStreak = 1;
    }
    
    setData((prev) => ({
      ...prev,
      meditation: {
        ...prev.meditation,
        daysStreak: newStreak,
        lastMeditationDate: new Date(),
        todayCompleted: true,
      },
    }));
  }, [data.meditation.daysStreak, data.meditation.lastMeditationDate]);

  // Calculate streaks
  const streaks = useMemo(() => {
    const result: Record<string, number> = {};
    data.addictions.forEach((addiction) => {
      const days = Math.floor(
        (new Date().getTime() - new Date(addiction.lastReset).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      result[addiction.id] = days;
    });
    return result;
  }, [data.addictions]);

  // Calculate today's stats
  const todaysMeals = useMemo(() => {
    try {
      const today = new Date().toDateString();
      return (data.meals ?? []).filter(
        (m) => new Date(m.date).toDateString() === today && m.completed
      ).length;
    } catch (e) {
      console.error('[WellnessProvider] todaysMeals error', e);
      return 0;
    }
  }, [data.meals]);

  const todaysSupplements = useMemo(() => {
    try {
      return (data.supplements ?? []).filter((s) => s.takenToday).length;
    } catch (e) {
      console.error('[WellnessProvider] todaysSupplements error', e);
      return 0;
    }
  }, [data.supplements]);

  const updateElevenLabsApiKey = useCallback((key: string) => {
    try {
      const sanitized = (key ?? '').trim();
      setElevenKeyState(sanitized);
      setData((prev) => ({ ...prev, elevenLabsApiKey: sanitized }));
      console.log('[WellnessProvider] updateElevenLabsApiKey set length:', sanitized.length);
    } catch (e) {
      console.error('[WellnessProvider] updateElevenLabsApiKey error', e);
    }
  }, []);

  const updateAssemblyAiApiKey = useCallback((key: string) => {
    try {
      const sanitized = (key ?? '').trim();
      setAssemblyKeyState(sanitized);
      setData((prev) => ({ ...prev, assemblyAiApiKey: sanitized }));
      console.log('[WellnessProvider] updateAssemblyAiApiKey set length:', sanitized.length);
    } catch (e) {
      console.error('[WellnessProvider] updateAssemblyAiApiKey error', e);
    }
  }, []);

  const updateOpenWeatherApiKey = useCallback((key: string) => {
    try {
      const sanitized = (key ?? '').trim();
      setOpenWeatherKeyState(sanitized);
      setData((prev) => ({ ...prev, openWeatherApiKey: sanitized }));
      console.log('[WellnessProvider] updateOpenWeatherApiKey set length:', sanitized.length);
    } catch (e) {
      console.error('[WellnessProvider] updateOpenWeatherApiKey error', e);
    }
  }, []);

  const updateWakeWordEnabled = useCallback((enabled: boolean) => {
    try {
      setWakeWordEnabledState(enabled);
      setData((prev) => ({ ...prev, wakeWordEnabled: enabled }));
      console.log('[WellnessProvider] updateWakeWordEnabled set:', enabled);
    } catch (e) {
      console.error('[WellnessProvider] updateWakeWordEnabled error', e);
    }
  }, []);

  const updateSoundEffectsEnabled = useCallback((enabled: boolean) => {
    try {
      setSfxEnabled(enabled);
      setData((prev) => ({ ...prev, soundEffectsEnabled: enabled }));
      console.log('[WellnessProvider] updateSoundEffectsEnabled set:', enabled);
    } catch (e) {
      console.error('[WellnessProvider] updateSoundEffectsEnabled error', e);
    }
  }, []);

  const updateBackgroundMusicEnabled = useCallback((enabled: boolean) => {
    try {
      setBgmEnabled(enabled);
      setData((prev) => ({ ...prev, backgroundMusicEnabled: enabled }));
      console.log('[WellnessProvider] updateBackgroundMusicEnabled set:', enabled);
    } catch (e) {
      console.error('[WellnessProvider] updateBackgroundMusicEnabled error', e);
    }
  }, []);

  const updateAutoReadResponsesEnabled = useCallback((enabled: boolean) => {
    try {
      setAutoReadEnabled(enabled);
      setData((prev) => ({ ...prev, autoReadResponsesEnabled: enabled }));
      console.log('[WellnessProvider] updateAutoReadResponsesEnabled set:', enabled);
    } catch (e) {
      console.error('[WellnessProvider] updateAutoReadResponsesEnabled error', e);
    }
  }, []);

  const updateVoiceModeEnabled = useCallback((enabled: boolean) => {
    try {
      setVoiceModeEnabled(enabled);
      setData((prev) => ({ ...prev, voiceModeEnabled: enabled }));
      console.log('[WellnessProvider] updateVoiceModeEnabled set:', enabled);
    } catch (e) {
      console.error('[WellnessProvider] updateVoiceModeEnabled error', e);
    }
  }, []);

  const updateEmotionalIntelligenceEnabled = useCallback((enabled: boolean) => {
    try {
      setEqEnabled(enabled);
      setData((prev) => ({ ...prev, emotionalIntelligenceEnabled: enabled }));
      console.log('[WellnessProvider] updateEmotionalIntelligenceEnabled set:', enabled);
    } catch (e) {
      console.error('[WellnessProvider] updateEmotionalIntelligenceEnabled error', e);
    }
  }, []);

  const updateTtsSpeed = useCallback((speed: number) => {
    try {
      const clamped = Math.max(0.5, Math.min(1.5, speed));
      setTtsSpeed(clamped);
      setData((prev) => ({ ...prev, ttsSpeed: clamped }));
      console.log('[WellnessProvider] updateTtsSpeed set:', clamped);
    } catch (e) {
      console.error('[WellnessProvider] updateTtsSpeed error', e);
    }
  }, []);

  const stopWakeWord = useCallback(async () => {
    await stopWakeWordInternal('manual');
  }, [stopWakeWordInternal]);

  return useMemo(() => ({
    // Data
    phoenixPoints,
    meals: data.meals,
    extendedMeals: data.extendedMeals,
    addictions: data.addictions,
    supplements: data.supplements,
    goals: data.goals,
    journalEntries: data.journalEntries,
    streaks,
    todaysMeals,
    todaysSupplements,
    isLoading,
    currentTheme: data.theme || PRESET_THEMES[0],
    chatMessages: data.chatMessages,
    userProfile: data.userProfile,
    routines: data.routines,
    routineCompletions: data.routineCompletions,
    visionBoards: data.visionBoards,
    affirmations: data.affirmations,
    visualizationSessions: data.visualizationSessions,
    dreamLifeScript: data.dreamLifeScript,
    visualizationStreak: data.visualizationStreak,
    elevenLabsApiKey: data.elevenLabsApiKey ?? elevenLabsApiKey,
    assemblyAiApiKey: data.assemblyAiApiKey ?? assemblyAiApiKey,
    openWeatherApiKey: data.openWeatherApiKey ?? openWeatherApiKey,
    wakeWordEnabled: data.wakeWordEnabled ?? wakeWordEnabled,
    soundEffectsEnabled: data.soundEffectsEnabled ?? soundEffectsEnabled,
    backgroundMusicEnabled: data.backgroundMusicEnabled ?? backgroundMusicEnabled,
    autoReadResponsesEnabled: data.autoReadResponsesEnabled ?? autoReadResponsesEnabled,
    voiceModeEnabled: data.voiceModeEnabled ?? voiceModeEnabled,
    emotionalIntelligenceEnabled: data.emotionalIntelligenceEnabled ?? emotionalIntelligenceEnabled,
    ttsSpeed: data.ttsSpeed ?? ttsSpeed,
    
    // Voice / Wake word state
    isWakeListening,
    isMicEnabled,
    startWakeWord,
    stopWakeWord,

    // Updaters
    updateElevenLabsApiKey,
    updateAssemblyAiApiKey,
    updateOpenWeatherApiKey,
    updateWakeWordEnabled,
    updateSoundEffectsEnabled,
    updateBackgroundMusicEnabled,
    updateAutoReadResponsesEnabled,
    updateVoiceModeEnabled,
    updateEmotionalIntelligenceEnabled,
    updateTtsSpeed,
    
    // Meal functions
    addMeal,
    toggleMealComplete,
    deleteMeal,
    addExtendedMeal,
    deleteExtendedMeal,
    
    // Addiction functions
    addAddiction,
    resetAddictionStreak,
    deleteAddiction,
    
    // Supplement functions
    addSupplement,
    toggleSupplementTaken,
    deleteSupplement,
    
    // Goal functions
    addGoal,
    updateGoal,
    updateGoalProgress,
    completeGoal,
    deleteGoal,
    
    // Journal functions
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    
    // Theme functions
    updateTheme,
    resetToPhoenixTheme,
    
    // Chat functions
    addChatMessage,
    clearChatHistory,
    
    // User profile functions
    updateUserProfile,
    
    // Routine functions
    addRoutine,
    updateRoutine,
    deleteRoutine,
    completeRoutine,
    reorderHabitLinks,
    
    // Vision Board functions
    addVisionBoard,
    updateVisionBoard,
    deleteVisionBoard,
    addVisionElement,
    updateVisionElement,
    deleteVisionElement,
    markVisionElementAchieved,
    
    // Affirmation functions
    addAffirmation,
    updateAffirmation,
    deleteAffirmation,
    useAffirmation,
    
    // Visualization functions
    addVisualizationSession,
    updateDreamLifeScript,
    
    // Meditation functions
    meditation: data.meditation,
    addMeditationSession,
    markMeditationDayComplete,
  }), [
    isWakeListening,
    isMicEnabled,
    startWakeWord,
    stopWakeWord,
    phoenixPoints,
    data.meals,
    data.extendedMeals,
    data.addictions,
    data.supplements,
    data.goals,
    data.journalEntries,
    streaks,
    todaysMeals,
    todaysSupplements,
    isLoading,
    addMeal,
    toggleMealComplete,
    deleteMeal,
    addExtendedMeal,
    deleteExtendedMeal,
    addAddiction,
    resetAddictionStreak,
    deleteAddiction,
    addSupplement,
    toggleSupplementTaken,
    deleteSupplement,
    addGoal,
    updateGoal,
    updateGoalProgress,
    completeGoal,
    deleteGoal,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    updateTheme,
    resetToPhoenixTheme,
    addChatMessage,
    clearChatHistory,
    updateUserProfile,
    data.theme,
    data.chatMessages,
    data.userProfile,
    data.routines,
    data.routineCompletions,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    completeRoutine,
    reorderHabitLinks,
    data.visionBoards,
    data.affirmations,
    data.visualizationSessions,
    data.dreamLifeScript,
    data.visualizationStreak,
    data.elevenLabsApiKey,
    elevenLabsApiKey,
    assemblyAiApiKey,
    updateElevenLabsApiKey,
    updateAssemblyAiApiKey,
    openWeatherApiKey,
    updateOpenWeatherApiKey,
    data.wakeWordEnabled,
    wakeWordEnabled,
    updateWakeWordEnabled,
    soundEffectsEnabled,
    backgroundMusicEnabled,
    autoReadResponsesEnabled,
    voiceModeEnabled,
    emotionalIntelligenceEnabled,
    ttsSpeed,
    updateSoundEffectsEnabled,
    updateBackgroundMusicEnabled,
    updateAutoReadResponsesEnabled,
    updateVoiceModeEnabled,
    updateEmotionalIntelligenceEnabled,
    updateTtsSpeed,
    addVisionBoard,
    updateVisionBoard,
    deleteVisionBoard,
    addVisionElement,
    updateVisionElement,
    deleteVisionElement,
    markVisionElementAchieved,
    addAffirmation,
    updateAffirmation,
    deleteAffirmation,
    useAffirmation,
    addVisualizationSession,
    updateDreamLifeScript,
    data.meditation,
    addMeditationSession,
    markMeditationDayComplete,
  ]);
});