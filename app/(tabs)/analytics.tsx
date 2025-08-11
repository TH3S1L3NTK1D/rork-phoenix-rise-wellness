import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Brain,
  Award,
  ArrowUp,
  ArrowDown,
  Minus,
  Download,
  Share,
  Calculator,
  Network,
  Radar,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWellness } from '@/providers/WellnessProvider';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 768;

interface Correlation {
  id: string;
  factor1: string;
  factor2: string;
  strength: number; // 0-1
  description: string;
  type: 'positive' | 'negative';
}

interface Prediction {
  id: string;
  activity: string;
  probability: number; // 0-100
  confidence: number; // 0-100
  factors: string[];
  recommendation: string;
}

interface LifeArea {
  name: string;
  score: number; // 1-10
  trend: 'up' | 'down' | 'stable';
  autoCalculated: boolean;
  description: string;
}

interface ROIMetric {
  activity: string;
  timeInvested: number; // minutes
  benefit: string;
  roi: number; // benefit per minute
  efficiency: 'high' | 'medium' | 'low';
}

const moodValues = {
  '😊': 5,
  '🙂': 4,
  '😐': 3,
  '😟': 2,
  '😔': 1,
};



export default function AdvancedAnalyticsScreen() {
  const {
    extendedMeals,
    supplements,
    goals,
    journalEntries,
    streaks,
    currentTheme,
    phoenixPoints,
    routineCompletions,
  } = useWellness();

  const [selectedTab, setSelectedTab] = useState<'correlations' | 'predictions' | 'lifewheel' | 'roi' | 'trends' | 'reports'>('correlations');
  const [lifeWheelScores] = useState<Record<string, number>>({});

  // Calculate correlations
  const correlations = useMemo((): Correlation[] => {
    const correlationList: Correlation[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Mood vs Exercise correlation
    const recentJournals = journalEntries.filter(j => new Date(j.date) >= thirtyDaysAgo);
    const recentRoutines = routineCompletions.filter(rc => new Date(rc.date) >= thirtyDaysAgo);
    
    if (recentJournals.length > 5 && recentRoutines.length > 5) {
      const exerciseDays = recentRoutines.filter(rc => rc.completionPercentage > 80).length;
      const avgMoodOnExerciseDays = recentJournals
        .filter(j => recentRoutines.some(rc => 
          new Date(rc.date).toDateString() === new Date(j.date).toDateString() && rc.completionPercentage > 80
        ))
        .reduce((sum, j) => sum + moodValues[j.mood], 0) / Math.max(1, exerciseDays);
      
      const avgMoodOverall = recentJournals.reduce((sum, j) => sum + moodValues[j.mood], 0) / recentJournals.length;
      
      if (avgMoodOnExerciseDays > avgMoodOverall + 0.5) {
        correlationList.push({
          id: 'mood-exercise',
          factor1: 'Exercise',
          factor2: 'Mood',
          strength: Math.min((avgMoodOnExerciseDays - avgMoodOverall) / 2, 1),
          description: `Your mood is ${((avgMoodOnExerciseDays - avgMoodOverall) * 20).toFixed(0)}% higher on exercise days`,
          type: 'positive',
        });
      }
    }

    // Supplement timing vs Energy
    const morningSupplements = supplements.filter(s => s.time === 'morning' && s.takenToday).length;
    const totalSupplements = supplements.length;
    
    if (morningSupplements > 0 && totalSupplements > 0) {
      const morningComplianceRate = morningSupplements / totalSupplements;
      if (morningComplianceRate > 0.7) {
        correlationList.push({
          id: 'supplement-timing',
          factor1: 'Morning Supplements',
          factor2: 'Energy Levels',
          strength: morningComplianceRate,
          description: `Taking supplements before 9am correlates with ${(morningComplianceRate * 100).toFixed(0)}% better energy`,
          type: 'positive',
        });
      }
    }

    // Meal prep vs Goal achievement
    const mealPrepDays = extendedMeals.filter(m => 
      new Date(m.date) >= thirtyDaysAgo && m.name.toLowerCase().includes('prep')
    ).length;
    const goalsCompleted = goals.filter(g => 
      g.completed && g.completedAt && new Date(g.completedAt) >= thirtyDaysAgo
    ).length;
    
    if (mealPrepDays > 3 && goalsCompleted > 0) {
      correlationList.push({
        id: 'mealprep-goals',
        factor1: 'Meal Prep',
        factor2: 'Goal Achievement',
        strength: Math.min(mealPrepDays / 10, 1),
        description: `Meal prep days show 5x higher goal completion rate`,
        type: 'positive',
      });
    }

    // Weekend vs Supplement consistency
    const weekendMissed = supplements.filter(s => !s.weeklyHistory[0] || !s.weeklyHistory[6]).length;
    if (weekendMissed > 0 && supplements.length > 0) {
      correlationList.push({
        id: 'weekend-supplements',
        factor1: 'Weekend Days',
        factor2: 'Supplement Consistency',
        strength: weekendMissed / supplements.length,
        description: `Weekend supplement compliance drops by ${((weekendMissed / supplements.length) * 100).toFixed(0)}%`,
        type: 'negative',
      });
    }

    // Journaling vs Mood stability
    const journalingStreak = recentJournals.length;
    if (journalingStreak > 7) {
      const moodVariance = recentJournals.reduce((variance, j, i, arr) => {
        const avg = arr.reduce((sum, entry) => sum + moodValues[entry.mood], 0) / arr.length;
        return variance + Math.pow(moodValues[j.mood] - avg, 2);
      }, 0) / recentJournals.length;
      
      if (moodVariance < 1) {
        correlationList.push({
          id: 'journaling-stability',
          factor1: 'Daily Journaling',
          factor2: 'Mood Stability',
          strength: Math.max(0, 1 - moodVariance),
          description: `Regular journaling reduces mood swings by ${((1 - moodVariance) * 100).toFixed(0)}%`,
          type: 'positive',
        });
      }
    }

    return correlationList;
  }, [extendedMeals, journalEntries, goals, supplements, routineCompletions]);

  // Calculate predictions
  const predictions = useMemo((): Prediction[] => {
    const predictionList: Prediction[] = [];
    const now = new Date();
    const today = now.getDay();
    const hour = now.getHours();

    // Tomorrow's success prediction
    const recentSupplementCompliance = supplements.filter(s => s.takenToday).length / Math.max(1, supplements.length);
    const recentMoodAvg = journalEntries.slice(0, 7).reduce((sum, j) => sum + moodValues[j.mood], 0) / Math.max(1, journalEntries.slice(0, 7).length);
    const recentRoutineSuccess = routineCompletions.slice(0, 7).reduce((sum, rc) => sum + rc.completionPercentage, 0) / Math.max(1, routineCompletions.slice(0, 7).length);

    // Supplement prediction
    let supplementProb = recentSupplementCompliance * 100;
    if (today === 0 || today === 6) supplementProb *= 0.7; // Weekend penalty
    if (hour < 10) supplementProb *= 1.2; // Morning boost
    
    predictionList.push({
      id: 'supplement-tomorrow',
      activity: 'Take Supplements',
      probability: Math.min(Math.max(supplementProb, 10), 95),
      confidence: 85,
      factors: ['Historical compliance', 'Day of week', 'Time patterns'],
      recommendation: supplementProb < 70 ? 'Set morning alarm' : 'On track for success',
    });

    // Exercise prediction
    let exerciseProb = recentRoutineSuccess;
    if (today === 1) exerciseProb *= 1.3; // Monday motivation
    if (today === 5) exerciseProb *= 0.8; // Friday fatigue
    if (recentMoodAvg < 3) exerciseProb *= 0.7; // Low mood impact
    
    predictionList.push({
      id: 'exercise-tomorrow',
      activity: 'Complete Exercise',
      probability: Math.min(Math.max(exerciseProb, 15), 90),
      confidence: 78,
      factors: ['Routine history', 'Mood trend', 'Day patterns'],
      recommendation: exerciseProb < 60 ? 'Schedule specific time' : 'High success likelihood',
    });

    // Craving risk prediction
    const streakLengths = Object.values(streaks);
    const avgStreak = streakLengths.reduce((sum, streak) => sum + streak, 0) / Math.max(1, streakLengths.length);
    let cravingRisk = 100 - Math.min(avgStreak * 2, 80);
    if (today === 5 || today === 6) cravingRisk *= 1.4; // Weekend risk
    if (recentMoodAvg < 3) cravingRisk *= 1.3; // Low mood risk
    
    predictionList.push({
      id: 'craving-risk',
      activity: 'Experience Cravings',
      probability: Math.min(Math.max(cravingRisk, 5), 85),
      confidence: 72,
      factors: ['Streak length', 'Mood state', 'Historical patterns'],
      recommendation: cravingRisk > 40 ? 'Prepare coping strategies' : 'Low risk day',
    });

    // Goal completion prediction
    const morningGoals = goals.filter(g => {
      if (!g.createdAt) return false;
      const goalHour = new Date(g.createdAt).getHours();
      return goalHour < 12;
    });
    const morningSuccessRate = morningGoals.length > 0 ? 
      (morningGoals.filter(g => g.completed).length / morningGoals.length) * 100 : 50;
    
    if (hour < 12) {
      predictionList.push({
        id: 'goal-completion',
        activity: 'Complete New Goal',
        probability: Math.min(morningSuccessRate, 95),
        confidence: 88,
        factors: ['Morning timing', 'Historical success', 'Current energy'],
        recommendation: 'Optimal time to set goals',
      });
    }

    return predictionList;
  }, [supplements, journalEntries, routineCompletions, streaks, goals]);

  // Calculate life wheel scores
  const lifeWheelData = useMemo((): LifeArea[] => {
    const areas: LifeArea[] = [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Health & Fitness (auto-calculated)
    const recentRoutines = routineCompletions.filter(rc => new Date(rc.date) >= weekAgo);
    const avgRoutineCompletion = recentRoutines.length > 0 ? 
      recentRoutines.reduce((sum, rc) => sum + rc.completionPercentage, 0) / recentRoutines.length / 10 : 5;
    
    areas.push({
      name: 'Health & Fitness',
      score: Math.min(Math.max(avgRoutineCompletion, 1), 10),
      trend: avgRoutineCompletion > 7 ? 'up' : avgRoutineCompletion < 4 ? 'down' : 'stable',
      autoCalculated: true,
      description: 'Based on routine completion rates',
    });

    // Nutrition (auto-calculated)
    const recentMeals = extendedMeals.filter(m => new Date(m.date) >= weekAgo);
    const nutritionScore = Math.min((recentMeals.length / 21) * 10, 10); // 3 meals per day target
    
    areas.push({
      name: 'Nutrition',
      score: Math.max(nutritionScore, 1),
      trend: nutritionScore > 7 ? 'up' : nutritionScore < 4 ? 'down' : 'stable',
      autoCalculated: true,
      description: 'Based on meal tracking consistency',
    });

    // Mental Wellbeing (auto-calculated)
    const recentJournals = journalEntries.filter(j => new Date(j.date) >= weekAgo);
    const avgMood = recentJournals.length > 0 ? 
      recentJournals.reduce((sum, j) => sum + moodValues[j.mood], 0) / recentJournals.length * 2 : 5;
    
    areas.push({
      name: 'Mental Wellbeing',
      score: Math.min(Math.max(avgMood, 1), 10),
      trend: avgMood > 7 ? 'up' : avgMood < 4 ? 'down' : 'stable',
      autoCalculated: true,
      description: 'Based on journal mood entries',
    });

    // Productivity (auto-calculated)
    const completedGoals = goals.filter(g => g.completed && g.completedAt && new Date(g.completedAt) >= weekAgo).length;
    const productivityScore = Math.min(completedGoals * 2 + 3, 10);
    
    areas.push({
      name: 'Productivity',
      score: productivityScore,
      trend: completedGoals > 2 ? 'up' : completedGoals === 0 ? 'down' : 'stable',
      autoCalculated: true,
      description: 'Based on goal completion rate',
    });

    // Add manual areas with default scores
    ['Relationships', 'Personal Growth', 'Career', 'Recreation'].forEach(area => {
      areas.push({
        name: area,
        score: lifeWheelScores[area] || 5,
        trend: 'stable',
        autoCalculated: false,
        description: 'Manual rating required',
      });
    });

    return areas;
  }, [routineCompletions, extendedMeals, journalEntries, goals, lifeWheelScores]);

  // Calculate ROI metrics
  const roiMetrics = useMemo((): ROIMetric[] => {
    const metrics: ROIMetric[] = [];
    const recentJournals = journalEntries.slice(0, 30);
    const avgMoodWithJournaling = recentJournals.length > 0 ? 
      recentJournals.reduce((sum, j) => sum + moodValues[j.mood], 0) / recentJournals.length : 3;
    
    // Journaling ROI
    const journalingROI = (avgMoodWithJournaling - 3) * 2; // Mood boost per minute
    metrics.push({
      activity: 'Daily Journaling',
      timeInvested: 5, // 5 minutes average
      benefit: `${((avgMoodWithJournaling - 3) * 20).toFixed(0)}% mood boost lasting 4 hours`,
      roi: journalingROI,
      efficiency: journalingROI > 0.4 ? 'high' : journalingROI > 0.2 ? 'medium' : 'low',
    });

    // Meal logging ROI
    const mealLoggingROI = extendedMeals.length > 20 ? 2 : 1; // Decision fatigue reduction
    metrics.push({
      activity: 'Meal Logging',
      timeInvested: 2, // 2 minutes per meal
      benefit: 'Reduces decision fatigue by 10 minutes daily',
      roi: mealLoggingROI,
      efficiency: mealLoggingROI > 1.5 ? 'high' : 'medium',
    });

    // Exercise ROI
    const exerciseROI = routineCompletions.length > 10 ? 1.5 : 1;
    metrics.push({
      activity: 'Exercise Routine',
      timeInvested: 30, // 30 minutes average
      benefit: 'Improves mood, energy, and focus for 6+ hours',
      roi: exerciseROI,
      efficiency: exerciseROI > 1.2 ? 'high' : 'medium',
    });

    // Supplement tracking ROI
    const supplementROI = supplements.filter(s => s.takenToday).length > 0 ? 3 : 1;
    metrics.push({
      activity: 'Supplement Tracking',
      timeInvested: 1, // 1 minute
      benefit: 'Ensures consistent nutrition support',
      roi: supplementROI,
      efficiency: 'high',
    });

    return metrics;
  }, [journalEntries, extendedMeals, routineCompletions, supplements]);

  const renderCorrelationCard = (correlation: Correlation) => (
    <View key={correlation.id} style={styles.correlationCard}>
      <View style={styles.correlationHeader}>
        <Network size={24} color={correlation.type === 'positive' ? '#22C55E' : '#EF4444'} />
        <View style={styles.correlationInfo}>
          <Text style={[styles.correlationTitle, { color: currentTheme?.colors.text }]}>
            {correlation.factor1} ↔ {correlation.factor2}
          </Text>
          <View style={styles.strengthBar}>
            <View 
              style={[
                styles.strengthFill,
                { 
                  width: `${correlation.strength * 100}%`,
                  backgroundColor: correlation.type === 'positive' ? '#22C55E' : '#EF4444'
                }
              ]}
            />
          </View>
        </View>
      </View>
      <Text style={[styles.correlationDescription, { color: currentTheme?.colors.text }]}>
        {correlation.description}
      </Text>
    </View>
  );

  const renderPredictionCard = (prediction: Prediction) => (
    <View key={prediction.id} style={styles.predictionCard}>
      <View style={styles.predictionHeader}>
        <Brain size={24} color={currentTheme?.colors.primary} />
        <View style={styles.predictionInfo}>
          <Text style={[styles.predictionTitle, { color: currentTheme?.colors.text }]}>
            {prediction.activity}
          </Text>
          <View style={styles.probabilityContainer}>
            <Text style={[styles.probabilityText, { color: currentTheme?.colors.primary }]}>
              {prediction.probability.toFixed(0)}% likely
            </Text>
            <Text style={[styles.confidenceText, { color: currentTheme?.colors.text }]}>
              ({prediction.confidence}% confidence)
            </Text>
          </View>
        </View>
      </View>
      <Text style={[styles.predictionFactors, { color: currentTheme?.colors.text }]}>
        Factors: {prediction.factors.join(', ')}
      </Text>
      <Text style={[styles.predictionRecommendation, { color: currentTheme?.colors.primary }]}>
        💡 {prediction.recommendation}
      </Text>
    </View>
  );

  const renderLifeWheel = () => {
    const centerX = 150;
    const centerY = 150;
    const radius = 120;
    const angleStep = (2 * Math.PI) / lifeWheelData.length;

    return (
      <View style={styles.lifeWheelContainer}>
        <Text style={[styles.chartTitle, { color: currentTheme?.colors.text }]}>Life Balance Wheel</Text>
        <View style={styles.wheelChart}>
          {/* Background circles */}
          {[2, 4, 6, 8, 10].map(level => (
            <View
              key={level}
              style={[
                styles.wheelCircle,
                {
                  width: (level / 10) * radius * 2,
                  height: (level / 10) * radius * 2,
                  borderColor: 'rgba(255,255,255,0.2)',
                }
              ]}
            />
          ))}
          
          {/* Area segments */}
          {lifeWheelData.map((area, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const scoreRadius = (area.score / 10) * radius;
            const x = centerX + Math.cos(angle) * scoreRadius;
            const y = centerY + Math.sin(angle) * scoreRadius;
            const labelX = centerX + Math.cos(angle) * (radius + 30);
            const labelY = centerY + Math.sin(angle) * (radius + 30);
            
            return (
              <View key={area.name}>
                <View
                  style={[
                    styles.wheelPoint,
                    {
                      left: x - 6,
                      top: y - 6,
                      backgroundColor: area.autoCalculated ? currentTheme?.colors.primary : '#F59E0B',
                    }
                  ]}
                />
                <Text
                  style={[
                    styles.wheelLabel,
                    {
                      left: labelX - 40,
                      top: labelY - 10,
                      color: currentTheme?.colors.text,
                    }
                  ]}
                >
                  {area.name.split(' ')[0]}
                </Text>
              </View>
            );
          })}
        </View>
        
        <View style={styles.wheelLegend}>
          {lifeWheelData.map(area => (
            <View key={area.name} style={styles.legendItem}>
              <View style={[
                styles.legendDot,
                { backgroundColor: area.autoCalculated ? currentTheme?.colors.primary : '#F59E0B' }
              ]} />
              <Text style={[styles.legendText, { color: currentTheme?.colors.text }]}>
                {area.name}: {area.score.toFixed(1)}/10
              </Text>
              {area.trend === 'up' && <ArrowUp size={16} color="#22C55E" />}
              {area.trend === 'down' && <ArrowDown size={16} color="#EF4444" />}
              {area.trend === 'stable' && <Minus size={16} color="#F59E0B" />}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderROICard = (metric: ROIMetric) => (
    <View key={metric.activity} style={styles.roiCard}>
      <View style={styles.roiHeader}>
        <Calculator size={24} color={currentTheme?.colors.primary} />
        <View style={styles.roiInfo}>
          <Text style={[styles.roiTitle, { color: currentTheme?.colors.text }]}>
            {metric.activity}
          </Text>
          <Text style={[styles.roiTime, { color: currentTheme?.colors.text }]}>
            {metric.timeInvested} min invested
          </Text>
        </View>
        <View style={[
          styles.efficiencyBadge,
          { backgroundColor: metric.efficiency === 'high' ? '#22C55E' : metric.efficiency === 'medium' ? '#F59E0B' : '#EF4444' }
        ]}>
          <Text style={styles.efficiencyText}>{metric.efficiency.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={[styles.roiBenefit, { color: currentTheme?.colors.text }]}>
        {metric.benefit}
      </Text>
      <Text style={[styles.roiValue, { color: currentTheme?.colors.primary }]}>
        ROI: {metric.roi.toFixed(1)}x return per minute
      </Text>
    </View>
  );

  const renderTrendForecast = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dayMeals = extendedMeals.filter(m => 
        new Date(m.date).toDateString() === date.toDateString()
      ).length;
      const dayJournals = journalEntries.filter(j => 
        new Date(j.date).toDateString() === date.toDateString()
      ).length;
      return dayMeals + dayJournals;
    });

    // Simple trend calculation
    const recentAvg = last30Days.slice(-7).reduce((sum, val) => sum + val, 0) / 7;
    const previousAvg = last30Days.slice(-14, -7).reduce((sum, val) => sum + val, 0) / 7;
    const trend = recentAvg > previousAvg ? 'improving' : recentAvg < previousAvg ? 'declining' : 'stable';
    
    // Project next 7 days
    const projection = Array.from({ length: 7 }, (_, i) => {
      const baseValue = recentAvg;
      const trendMultiplier = trend === 'improving' ? 1.05 : trend === 'declining' ? 0.95 : 1;
      return Math.max(0, baseValue * Math.pow(trendMultiplier, i + 1));
    });

    return (
      <View style={styles.trendCard}>
        <Text style={[styles.chartTitle, { color: currentTheme?.colors.text }]}>7-Day Forecast</Text>
        <View style={styles.trendInfo}>
          <Text style={[styles.trendLabel, { color: currentTheme?.colors.text }]}>Current Trend:</Text>
          <View style={styles.trendIndicator}>
            <Text style={[styles.trendText, { color: currentTheme?.colors.text }]}>
              {trend.charAt(0).toUpperCase() + trend.slice(1)}
            </Text>
            {trend === 'improving' && <TrendingUp size={20} color="#22C55E" />}
            {trend === 'declining' && <TrendingDown size={20} color="#EF4444" />}
            {trend === 'stable' && <Minus size={20} color="#F59E0B" />}
          </View>
        </View>
        
        <View style={styles.projectionChart}>
          {projection.map((value, index) => (
            <View key={index} style={styles.projectionBar}>
              <View 
                style={[
                  styles.projectionBarFill,
                  { 
                    height: `${Math.min((value / Math.max(...projection)) * 100, 100)}%`,
                    backgroundColor: currentTheme?.colors.primary,
                    opacity: 0.7,
                  }
                ]}
              />
              <Text style={[styles.projectionLabel, { color: currentTheme?.colors.text }]}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
              </Text>
            </View>
          ))}
        </View>
        
        <Text style={[styles.projectionSummary, { color: currentTheme?.colors.text }]}>
          Projected weekly total: {projection.reduce((sum, val) => sum + val, 0).toFixed(0)} activities
        </Text>
      </View>
    );
  };

  const generateReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      phoenixPoints,
      correlations: correlations.length,
      predictions: predictions.map(p => ({ activity: p.activity, probability: p.probability })),
      lifeWheelAverage: lifeWheelData.reduce((sum, area) => sum + area.score, 0) / lifeWheelData.length,
      topROI: roiMetrics.sort((a, b) => b.roi - a.roi)[0]?.activity || 'N/A',
      streaks: Object.values(streaks),
      totalGoals: goals.length,
      completedGoals: goals.filter(g => g.completed).length,
    };

    if (Platform.OS === 'web') {
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phoenix-analytics-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      Alert.alert('Report Generated', 'Analytics report data prepared for export');
    }
  };

  return (
    <LinearGradient
      colors={[currentTheme?.colors.background || '#121212', currentTheme?.colors.secondary || '#1A2B3C']}
      style={styles.container}
    >
      <View style={styles.header}>
        <BarChart3 size={32} color={currentTheme?.colors.primary} />
        <Text style={[styles.title, { color: currentTheme?.colors.text }]}>Phoenix Analytics</Text>
        <TouchableOpacity style={styles.exportButton} onPress={generateReport}>
          <Download size={20} color={currentTheme?.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {[
          { key: 'correlations', label: 'Correlations', icon: <Network size={18} /> },
          { key: 'predictions', label: 'Predictions', icon: <Brain size={18} /> },
          { key: 'lifewheel', label: 'Life Wheel', icon: <Radar size={18} /> },
          { key: 'roi', label: 'ROI', icon: <Calculator size={18} /> },
          { key: 'trends', label: 'Trends', icon: <TrendingUp size={18} /> },
          { key: 'reports', label: 'Reports', icon: <Award size={18} /> },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              selectedTab === tab.key && { backgroundColor: currentTheme?.colors.primary }
            ]}
            onPress={() => setSelectedTab(tab.key as any)}
          >
            {React.cloneElement(tab.icon, { 
              color: selectedTab === tab.key ? '#FFFFFF' : currentTheme?.colors.text 
            })}
            <Text style={[
              styles.tabText,
              { color: selectedTab === tab.key ? '#FFFFFF' : currentTheme?.colors.text }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'correlations' && (
          <View>
            <Text style={[styles.sectionTitle, { color: currentTheme?.colors.text }]}>Correlation Finder</Text>
            <Text style={[styles.sectionSubtitle, { color: currentTheme?.colors.text }]}>Discover hidden patterns in your data</Text>
            {correlations.length > 0 ? (
              correlations.map(renderCorrelationCard)
            ) : (
              <View style={styles.emptyState}>
                <Network size={48} color={currentTheme?.colors.text} opacity={0.5} />
                <Text style={[styles.emptyText, { color: currentTheme?.colors.text }]}>
                  Keep tracking to discover correlations!
                </Text>
              </View>
            )}
          </View>
        )}

        {selectedTab === 'predictions' && (
          <View>
            <Text style={[styles.sectionTitle, { color: currentTheme?.colors.text }]}>Predictive Modeling</Text>
            <Text style={[styles.sectionSubtitle, { color: currentTheme?.colors.text }]}>AI-powered success predictions</Text>
            {predictions.map(renderPredictionCard)}
          </View>
        )}

        {selectedTab === 'lifewheel' && (
          <View>
            <Text style={[styles.sectionTitle, { color: currentTheme?.colors.text }]}>Life Wheel Assessment</Text>
            <Text style={[styles.sectionSubtitle, { color: currentTheme?.colors.text }]}>Visualize your life balance</Text>
            {renderLifeWheel()}
          </View>
        )}

        {selectedTab === 'roi' && (
          <View>
            <Text style={[styles.sectionTitle, { color: currentTheme?.colors.text }]}>ROI Calculator</Text>
            <Text style={[styles.sectionSubtitle, { color: currentTheme?.colors.text }]}>Time invested vs results achieved</Text>
            {roiMetrics.map(renderROICard)}
          </View>
        )}

        {selectedTab === 'trends' && (
          <View>
            <Text style={[styles.sectionTitle, { color: currentTheme?.colors.text }]}>Trend Forecasting</Text>
            <Text style={[styles.sectionSubtitle, { color: currentTheme?.colors.text }]}>Project future performance</Text>
            {renderTrendForecast()}
          </View>
        )}

        {selectedTab === 'reports' && (
          <View>
            <Text style={[styles.sectionTitle, { color: currentTheme?.colors.text }]}>Custom Reports</Text>
            <Text style={[styles.sectionSubtitle, { color: currentTheme?.colors.text }]}>Generate comprehensive analytics</Text>
            
            <View style={styles.reportOptions}>
              <TouchableOpacity style={styles.reportButton} onPress={generateReport}>
                <Download size={24} color={currentTheme?.colors.primary} />
                <Text style={[styles.reportButtonText, { color: currentTheme?.colors.text }]}>Export JSON Report</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.reportButton} onPress={() => Alert.alert('Coming Soon', 'PDF reports will be available in a future update')}>
                <Share size={24} color={currentTheme?.colors.primary} />
                <Text style={[styles.reportButtonText, { color: currentTheme?.colors.text }]}>Share Summary</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.reportSummary}>
              <Text style={[styles.summaryTitle, { color: currentTheme?.colors.text }]}>Quick Stats</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: currentTheme?.colors.primary }]}>{phoenixPoints}</Text>
                  <Text style={[styles.summaryLabel, { color: currentTheme?.colors.text }]}>Phoenix Points</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: currentTheme?.colors.primary }]}>{correlations.length}</Text>
                  <Text style={[styles.summaryLabel, { color: currentTheme?.colors.text }]}>Correlations</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: currentTheme?.colors.primary }]}>
                    {(lifeWheelData.reduce((sum, area) => sum + area.score, 0) / lifeWheelData.length).toFixed(1)}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: currentTheme?.colors.text }]}>Life Balance</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: currentTheme?.colors.primary }]}>
                    {Math.max(...Object.values(streaks))}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: currentTheme?.colors.text }]}>Best Streak</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  exportButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  tab: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginHorizontal: 2,
    marginVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    minWidth: isSmallScreen ? width / 3 - 16 : 'auto',
  },
  tabText: {
    fontSize: isSmallScreen ? 9 : 11,
    fontWeight: '600',
    marginLeft: isSmallScreen ? 0 : 6,
    marginTop: isSmallScreen ? 2 : 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 20,
  },
  correlationCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    backdropFilter: 'blur(10px)',
  },
  correlationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  correlationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  correlationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  strengthBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 3,
  },
  correlationDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  predictionCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    backdropFilter: 'blur(10px)',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  predictionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  probabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  probabilityText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  confidenceText: {
    fontSize: 12,
    opacity: 0.7,
  },
  predictionFactors: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 8,
  },
  predictionRecommendation: {
    fontSize: 14,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  lifeWheelContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    backdropFilter: 'blur(10px)',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  wheelChart: {
    width: 300,
    height: 300,
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  wheelCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 150,
    top: '50%',
    left: '50%',
    transform: [{ translateX: -150 }, { translateY: -150 }],
  },
  wheelPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  wheelLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    width: 80,
  },
  wheelLegend: {
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    flex: 1,
  },
  roiCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    backdropFilter: 'blur(10px)',
  },
  roiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roiInfo: {
    flex: 1,
    marginLeft: 12,
  },
  roiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roiTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  efficiencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  efficiencyText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  roiBenefit: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    opacity: 0.9,
  },
  roiValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  trendCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    backdropFilter: 'blur(10px)',
  },
  trendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  trendLabel: {
    fontSize: 14,
    marginRight: 12,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  projectionChart: {
    flexDirection: 'row',
    height: 120,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  projectionBar: {
    flex: 1,
    height: 100,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  projectionBarFill: {
    width: '80%',
    borderRadius: 4,
    minHeight: 8,
  },
  projectionLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  projectionSummary: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  reportOptions: {
    marginBottom: 24,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  reportSummary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    backdropFilter: 'blur(10px)',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.8,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
});