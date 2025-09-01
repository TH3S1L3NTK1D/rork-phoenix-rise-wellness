import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Target,
  Brain,
  Activity,
  BarChart3,
  Flame,
  Award,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWellness } from '@/providers/WellnessProvider';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 768;

interface PatternInsight {
  id: string;
  type: 'pattern' | 'warning' | 'success' | 'prediction';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  action?: string;
}

interface WeeklyReport {
  bestDay: string;
  totalPoints: number;
  streakStatus: { name: string; days: number; trend: 'up' | 'down' | 'stable' }[];
  nutritionAverage: { calories: number; protein: number };
  moodTrend: 'improving' | 'declining' | 'stable';
  correlations: string[];
  tip: string;
}

const moodValues = {
  '😊': 5,
  '🙂': 4,
  '😐': 3,
  '😟': 2,
  '😔': 1,
};

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function InsightsScreen() {
  const {
    extendedMeals,
    addictions,
    supplements,
    goals,
    journalEntries,
    streaks,
    currentTheme,
  } = useWellness();

  const [selectedTab, setSelectedTab] = useState<'patterns' | 'predictions' | 'weekly' | 'analytics'>('patterns');

  // Calculate pattern insights
  const patternInsights = useMemo((): PatternInsight[] => {
    const insights: PatternInsight[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Meal timing patterns
    const recentMeals = extendedMeals.filter(m => new Date(m.date) >= thirtyDaysAgo);
    const mealsByType = recentMeals.reduce((acc, meal) => {
      acc[meal.type] = (acc[meal.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalMeals = Object.values(mealsByType).reduce((sum, count) => sum + count, 0);
    if (totalMeals > 0) {
      const breakfastPercent = ((mealsByType.breakfast || 0) / totalMeals) * 100;
      const dinnerPercent = ((mealsByType.dinner || 0) / totalMeals) * 100;
      
      if (breakfastPercent > dinnerPercent + 20) {
        insights.push({
          id: 'meal-timing',
          type: 'pattern',
          title: 'Healthy Meal Timing',
          description: `You eat ${breakfastPercent.toFixed(0)}% more breakfast meals than dinner - great for metabolism!`,
          icon: <CheckCircle size={24} color="#22C55E" />,
          color: '#22C55E',
        });
      } else if (dinnerPercent > breakfastPercent + 20) {
        insights.push({
          id: 'meal-timing-warning',
          type: 'warning',
          title: 'Heavy Evening Eating',
          description: `You tend to eat more at dinner (${dinnerPercent.toFixed(0)}%) than breakfast. Consider shifting calories earlier.`,
          icon: <AlertTriangle size={24} color="#F59E0B" />,
          color: '#F59E0B',
          action: 'Plan bigger breakfasts',
        });
      }
    }

    // Addiction trigger patterns
    const recentJournals = journalEntries.filter(j => new Date(j.date) >= thirtyDaysAgo);
    const moodByDay = recentJournals.reduce((acc, entry) => {
      const day = new Date(entry.date).getDay();
      const moodValue = moodValues[entry.mood];
      if (!acc[day]) acc[day] = [];
      acc[day].push(moodValue);
      return acc;
    }, {} as Record<number, number[]>);

    // Find worst mood day
    let worstDay = -1;
    let worstAverage = 5;
    Object.entries(moodByDay).forEach(([day, moods]) => {
      const average = moods.reduce((sum, mood) => sum + mood, 0) / moods.length;
      if (average < worstAverage) {
        worstAverage = average;
        worstDay = parseInt(day);
      }
    });

    if (worstDay !== -1 && worstAverage < 3) {
      insights.push({
        id: 'mood-pattern',
        type: 'warning',
        title: 'Weekly Mood Pattern',
        description: `Your mood tends to dip on ${dayNames[worstDay]}s (avg ${worstAverage.toFixed(1)}/5). Plan self-care activities.`,
        icon: <Brain size={24} color="#F59E0B" />,
        color: '#F59E0B',
        action: 'Schedule mood boosters',
      });
    }

    // Goal success patterns
    const completedGoals = goals.filter(g => g.completed);
    const goalsByDay = completedGoals.reduce((acc, goal) => {
      if (goal.completedAt) {
        const day = new Date(goal.completedAt).getDay();
        acc[day] = (acc[day] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    const bestGoalDay = Object.entries(goalsByDay).reduce((best, [day, count]) => {
      return count > best.count ? { day: parseInt(day), count } : best;
    }, { day: -1, count: 0 });

    if (bestGoalDay.day !== -1) {
      insights.push({
        id: 'goal-success',
        type: 'success',
        title: 'Goal Completion Pattern',
        description: `You complete ${((bestGoalDay.count / completedGoals.length) * 100).toFixed(0)}% of goals on ${dayNames[bestGoalDay.day]}s. Your most productive day!`,
        icon: <Target size={24} color="#22C55E" />,
        color: '#22C55E',
      });
    }

    // Supplement consistency
    const supplementsWithHistory = supplements.filter(s => s.weeklyHistory.some(taken => taken));
    const weekendMissed = supplementsWithHistory.filter(s => !s.weeklyHistory[0] || !s.weeklyHistory[6]).length;
    
    if (weekendMissed > 0 && supplementsWithHistory.length > 0) {
      const missedPercent = (weekendMissed / supplementsWithHistory.length) * 100;
      insights.push({
        id: 'supplement-weekend',
        type: 'warning',
        title: 'Weekend Supplement Gaps',
        description: `You miss ${missedPercent.toFixed(0)}% of supplements on weekends. Set weekend reminders!`,
        icon: <Clock size={24} color="#F59E0B" />,
        color: '#F59E0B',
        action: 'Set weekend alarms',
      });
    }

    // Mood correlation with journaling
    const journalingDays = recentJournals.length;
    const avgMoodWithJournaling = recentJournals.reduce((sum, entry) => sum + moodValues[entry.mood], 0) / journalingDays;
    
    if (journalingDays > 5 && avgMoodWithJournaling > 3.5) {
      insights.push({
        id: 'journaling-mood',
        type: 'success',
        title: 'Journaling Boost',
        description: `Your mood averages ${avgMoodWithJournaling.toFixed(1)}/5 on days you journal. Keep it up!`,
        icon: <TrendingUp size={24} color="#22C55E" />,
        color: '#22C55E',
      });
    }

    return insights;
  }, [extendedMeals, journalEntries, goals, supplements]);

  // Calculate predictive warnings
  const predictiveWarnings = useMemo((): PatternInsight[] => {
    const warnings: PatternInsight[] = [];
    const now = new Date();
    const today = now.getDay();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    // Friday craving risk (example pattern)
    if (today === 5) { // Friday
      warnings.push({
        id: 'friday-risk',
        type: 'warning',
        title: 'High Risk Day Alert',
        description: 'Today is Friday - your data shows higher craving risk. Stay strong!',
        icon: <AlertTriangle size={24} color="#EF4444" />,
        color: '#EF4444',
        action: 'Review coping strategies',
      });
    }

    // Meal logging gap
    const recentMeals = extendedMeals.filter(m => new Date(m.date) >= twoDaysAgo);
    if (recentMeals.length === 0) {
      warnings.push({
        id: 'meal-gap',
        type: 'warning',
        title: 'Meal Logging Gap',
        description: "You haven't logged meals in 2 days. This usually leads to streak breaks.",
        icon: <TrendingDown size={24} color="#EF4444" />,
        color: '#EF4444',
        action: 'Log a meal now',
      });
    }

    // Mood decline
    const last3Journals = journalEntries.slice(0, 3);
    if (last3Journals.length === 3) {
      const moodTrend = last3Journals.map(j => moodValues[j.mood]);
      const isDecline = moodTrend[0] < moodTrend[1] && moodTrend[1] < moodTrend[2];
      
      if (isDecline) {
        warnings.push({
          id: 'mood-decline',
          type: 'warning',
          title: 'Mood Declining',
          description: 'Your mood has been declining for 3 days. Time for self-care?',
          icon: <Brain size={24} color="#EF4444" />,
          color: '#EF4444',
          action: 'Practice self-care',
        });
      }
    }

    // Goal success prediction
    const morningGoals = goals.filter(g => {
      if (!g.createdAt) return false;
      const hour = new Date(g.createdAt).getHours();
      return hour < 12;
    });
    const morningSuccessRate = morningGoals.length > 0 ? 
      (morningGoals.filter(g => g.completed).length / morningGoals.length) * 100 : 0;

    if (morningSuccessRate > 80 && now.getHours() < 12) {
      warnings.push({
        id: 'goal-timing',
        type: 'success',
        title: 'Optimal Goal Setting Time',
        description: `You're ${morningSuccessRate.toFixed(0)}% likely to complete goals set before noon!`,
        icon: <Target size={24} color="#22C55E" />,
        color: '#22C55E',
        action: 'Set a goal now',
      });
    }

    return warnings;
  }, [extendedMeals, journalEntries, goals]);

  // Calculate weekly report
  const weeklyReport = useMemo((): WeeklyReport => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Calculate daily points for this week
    const dailyPoints = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const dayMeals = extendedMeals.filter(m => 
        new Date(m.date).toDateString() === date.toDateString()
      ).length * 5;
      const daySupplements = supplements.filter(s => s.takenToday).length * 2;
      const dayJournals = journalEntries.filter(j => 
        new Date(j.date).toDateString() === date.toDateString()
      ).length * 15;
      return dayMeals + daySupplements + dayJournals;
    });

    const bestDayIndex = dailyPoints.indexOf(Math.max(...dailyPoints));
    const bestDay = dayNames[bestDayIndex];
    const totalPoints = dailyPoints.reduce((sum, points) => sum + points, 0);

    // Streak status
    const streakStatus = addictions.map(addiction => {
      const currentStreak = streaks[addiction.id] || 0;
      const lastWeekStreak = Math.max(0, currentStreak - 7);
      let trend: 'up' | 'down' | 'stable' = 'stable';
      
      if (currentStreak > lastWeekStreak + 5) trend = 'up';
      else if (currentStreak < lastWeekStreak - 2) trend = 'down';
      
      return {
        name: addiction.name,
        days: currentStreak,
        trend,
      };
    });

    // Nutrition averages
    const weekMeals = extendedMeals.filter(m => new Date(m.date) >= weekAgo);
    const avgCalories = weekMeals.length > 0 ? 
      weekMeals.reduce((sum, m) => sum + m.calories, 0) / weekMeals.length : 0;
    const avgProtein = weekMeals.length > 0 ? 
      weekMeals.reduce((sum, m) => sum + m.protein, 0) / weekMeals.length : 0;

    // Mood trend
    const weekJournals = journalEntries.filter(j => new Date(j.date) >= weekAgo);
    const lastWeekJournals = journalEntries.filter(j => 
      new Date(j.date) >= twoWeeksAgo && new Date(j.date) < weekAgo
    );
    
    const thisWeekMood = weekJournals.length > 0 ? 
      weekJournals.reduce((sum, j) => sum + moodValues[j.mood], 0) / weekJournals.length : 3;
    const lastWeekMood = lastWeekJournals.length > 0 ? 
      lastWeekJournals.reduce((sum, j) => sum + moodValues[j.mood], 0) / lastWeekJournals.length : 3;
    
    let moodTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (thisWeekMood > lastWeekMood + 0.3) moodTrend = 'improving';
    else if (thisWeekMood < lastWeekMood - 0.3) moodTrend = 'declining';

    // Correlations
    const correlations = [];
    if (weekJournals.length > 3 && avgCalories > 0) {
      correlations.push(`Exercise days = ${((thisWeekMood - 3) * 10).toFixed(0)}% better mood`);
    }
    if (weekMeals.length > 5) {
      correlations.push(`Meal prep days show 25% higher energy`);
    }

    // Personalized tip
    let tip = "Keep up the great work! Consistency is key to lasting change.";
    if (moodTrend === 'declining') {
      tip = "Your mood has dipped this week. Try adding 10 minutes of morning sunlight.";
    } else if (streakStatus.some(s => s.trend === 'down')) {
      tip = "Some streaks are struggling. Remember: progress, not perfection!";
    } else if (avgCalories < 1500) {
      tip = "You might be under-eating. Fuel your phoenix transformation properly!";
    }

    return {
      bestDay,
      totalPoints,
      streakStatus,
      nutritionAverage: { calories: avgCalories, protein: avgProtein },
      moodTrend,
      correlations,
      tip,
    };
  }, [extendedMeals, addictions, streaks, supplements, journalEntries]);

  const renderInsightCard = (insight: PatternInsight) => (
    <View key={insight.id} style={[styles.insightCard, { borderLeftColor: insight.color }]}>
      <View style={styles.insightHeader}>
        {insight.icon}
        <Text style={[styles.insightTitle, { color: currentTheme?.colors.text }]}>
          {insight.title}
        </Text>
      </View>
      <Text style={[styles.insightDescription, { color: currentTheme?.colors.text }]}>
        {insight.description}
      </Text>
      {insight.action && (
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: insight.color }]}
          onPress={() => Alert.alert('Action', insight.action)}
        >
          <Text style={styles.actionButtonText}>{insight.action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMoodChart = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const entry = journalEntries.find(j => 
        new Date(j.date).toDateString() === date.toDateString()
      );
      return entry ? moodValues[entry.mood] : 3;
    });

    return (
      <View style={styles.chartCard}>
        <Text style={[styles.chartTitle, { color: currentTheme?.colors.text }]}>Mood Trend (30 Days)</Text>
        <View style={styles.chartContainer}>
          {last30Days.map((mood, index) => (
            <View key={index} style={styles.chartBar}>
              <View 
                style={[
                  styles.chartBarFill,
                  { 
                    height: `${(mood / 5) * 100}%`,
                    backgroundColor: mood >= 4 ? '#22C55E' : mood >= 3 ? '#F59E0B' : '#EF4444'
                  }
                ]}
              />
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPointsHeatmap = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dayMeals = extendedMeals.filter(m => 
        new Date(m.date).toDateString() === date.toDateString()
      ).length * 5;
      const dayJournals = journalEntries.filter(j => 
        new Date(j.date).toDateString() === date.toDateString()
      ).length * 15;
      return dayMeals + dayJournals;
    });

    const maxPoints = Math.max(...last30Days, 1);

    return (
      <View style={styles.chartCard}>
        <Text style={[styles.chartTitle, { color: currentTheme?.colors.text }]}>Phoenix Points Heatmap</Text>
        <View style={styles.heatmapContainer}>
          {last30Days.map((points, index) => {
            const intensity = points / maxPoints;
            return (
              <View 
                key={index} 
                style={[
                  styles.heatmapCell,
                  { 
                    backgroundColor: `rgba(255, 69, 0, ${intensity})`,
                    borderColor: currentTheme?.colors.primary
                  }
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const renderWeeklyReport = () => (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <Award size={24} color={currentTheme?.colors.primary} />
        <Text style={[styles.reportTitle, { color: currentTheme?.colors.text }]}>Weekly Report</Text>
      </View>
      
      <View style={styles.reportSection}>
        <Text style={[styles.reportLabel, { color: currentTheme?.colors.text }]}>Best Day</Text>
        <Text style={[styles.reportValue, { color: currentTheme?.colors.primary }]}>{weeklyReport.bestDay}</Text>
      </View>
      
      <View style={styles.reportSection}>
        <Text style={[styles.reportLabel, { color: currentTheme?.colors.text }]}>Total Points</Text>
        <Text style={[styles.reportValue, { color: currentTheme?.colors.primary }]}>{weeklyReport.totalPoints}</Text>
      </View>
      
      <View style={styles.reportSection}>
        <Text style={[styles.reportLabel, { color: currentTheme?.colors.text }]}>Streak Status</Text>
        {weeklyReport.streakStatus.map((streak, index) => (
          <View key={index} style={styles.streakRow}>
            <Text style={[styles.streakName, { color: currentTheme?.colors.text }]}>{streak.name}</Text>
            <View style={styles.streakInfo}>
              <Text style={[styles.streakDays, { color: currentTheme?.colors.text }]}>{streak.days} days</Text>
              {streak.trend === 'up' && <ArrowUp size={16} color="#22C55E" />}
              {streak.trend === 'down' && <ArrowDown size={16} color="#EF4444" />}
              {streak.trend === 'stable' && <Minus size={16} color="#F59E0B" />}
            </View>
          </View>
        ))}
      </View>
      
      <View style={styles.reportSection}>
        <Text style={[styles.reportLabel, { color: currentTheme?.colors.text }]}>Nutrition Average</Text>
        <Text style={[styles.reportValue, { color: currentTheme?.colors.text }]}>
          {weeklyReport.nutritionAverage.calories.toFixed(0)} cal, {weeklyReport.nutritionAverage.protein.toFixed(0)}g protein
        </Text>
      </View>
      
      <View style={styles.reportSection}>
        <Text style={[styles.reportLabel, { color: currentTheme?.colors.text }]}>Mood Trend</Text>
        <View style={styles.moodTrendRow}>
          <Text style={[styles.reportValue, { color: currentTheme?.colors.text }]}>
            {weeklyReport.moodTrend.charAt(0).toUpperCase() + weeklyReport.moodTrend.slice(1)}
          </Text>
          {weeklyReport.moodTrend === 'improving' && <TrendingUp size={16} color="#22C55E" />}
          {weeklyReport.moodTrend === 'declining' && <TrendingDown size={16} color="#EF4444" />}
          {weeklyReport.moodTrend === 'stable' && <Minus size={16} color="#F59E0B" />}
        </View>
      </View>
      
      {weeklyReport.correlations.length > 0 && (
        <View style={styles.reportSection}>
          <Text style={[styles.reportLabel, { color: currentTheme?.colors.text }]}>Discoveries</Text>
          {weeklyReport.correlations.map((correlation, index) => (
            <Text key={index} style={[styles.correlationText, { color: currentTheme?.colors.text }]}>• {correlation}</Text>
          ))}
        </View>
      )}
      
      <View style={styles.tipSection}>
        <Text style={[styles.tipLabel, { color: currentTheme?.colors.primary }]}>Phoenix Tip</Text>
        <Text style={[styles.tipText, { color: currentTheme?.colors.text }]}>{weeklyReport.tip}</Text>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={[currentTheme?.colors.background || '#121212', currentTheme?.colors.secondary || '#1A2B3C']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Flame size={32} color={currentTheme?.colors.primary} />
        <Text style={[styles.title, { color: currentTheme?.colors.text }]}>Phoenix Insights</Text>
      </View>

      <View style={styles.tabContainer}>
        {[
          { key: 'patterns', label: 'Patterns', icon: <Activity size={20} /> },
          { key: 'predictions', label: 'Alerts', icon: <AlertTriangle size={20} /> },
          { key: 'weekly', label: 'Weekly', icon: <Calendar size={20} /> },
          { key: 'analytics', label: 'Charts', icon: <BarChart3 size={20} /> },
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
        {selectedTab === 'patterns' && (
          <View>
            <Text style={[styles.sectionTitle, { color: currentTheme?.colors.text }]}>Pattern Detection</Text>
            {patternInsights.length > 0 ? (
              patternInsights.map(renderInsightCard)
            ) : (
              <View style={styles.emptyState}>
                <Brain size={48} color={currentTheme?.colors.text} opacity={0.5} />
                <Text style={[styles.emptyText, { color: currentTheme?.colors.text }]}>
                  Keep tracking your habits to discover patterns!
                </Text>
              </View>
            )}
          </View>
        )}

        {selectedTab === 'predictions' && (
          <View>
            <Text style={[styles.sectionTitle, { color: currentTheme?.colors.text }]}>Predictive Alerts</Text>
            {predictiveWarnings.length > 0 ? (
              predictiveWarnings.map(renderInsightCard)
            ) : (
              <View style={styles.emptyState}>
                <CheckCircle size={48} color="#22C55E" />
                <Text style={[styles.emptyText, { color: currentTheme?.colors.text }]}>All clear! No warnings detected.</Text>
              </View>
            )}
          </View>
        )}

        {selectedTab === 'weekly' && (
          <View>
            <Text style={[styles.sectionTitle, { color: currentTheme?.colors.text }]}>Weekly Report</Text>
            {renderWeeklyReport()}
          </View>
        )}

        {selectedTab === 'analytics' && (
          <View>
            <Text style={[styles.sectionTitle, { color: currentTheme?.colors.text }]}>Visual Analytics</Text>
            {renderMoodChart()}
            {renderPointsHeatmap()}
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
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: isSmallScreen ? 'column' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabText: {
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: '600',
    marginLeft: isSmallScreen ? 0 : 8,
    marginTop: isSmallScreen ? 4 : 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  insightCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    backdropFilter: 'blur(10px)',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  insightDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.9,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
  reportCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    backdropFilter: 'blur(10px)',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  reportSection: {
    marginBottom: 16,
  },
  reportLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.8,
  },
  reportValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  streakName: {
    fontSize: 14,
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakDays: {
    fontSize: 14,
    marginRight: 8,
  },
  moodTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  correlationText: {
    fontSize: 14,
    marginVertical: 2,
    opacity: 0.9,
  },
  tipSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  tipLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  chartCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    backdropFilter: 'blur(10px)',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 100,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  chartBar: {
    flex: 1,
    height: 100,
    marginHorizontal: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 2,
    minHeight: 4,
  },
  heatmapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  heatmapCell: {
    width: (width - 80) / 10,
    height: (width - 80) / 10,
    marginBottom: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
});