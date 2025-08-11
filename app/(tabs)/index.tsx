import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Flame, Target, Utensils, Pill, Shield } from "lucide-react-native";
import { useWellness } from "@/providers/WellnessProvider";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";

const { width } = Dimensions.get('window');
const isSmallScreen = width < 768;

export default function DashboardScreen() {
  const { phoenixPoints, streaks, todaysMeals, todaysSupplements, goals } = useWellness();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim]);

  // Calculate Rebirth Score
  const calculateRebirthScore = () => {
    let score = 0;
    
    // Meals today (25% weight)
    const mealScore = Math.min((todaysMeals / 3) * 25, 25);
    
    // Total streak days (25% weight)
    const totalStreakDays = Object.values(streaks).reduce((sum, days) => sum + days, 0);
    const streakScore = Math.min((totalStreakDays / 30) * 25, 25); // Max at 30 days
    
    // Supplements today (25% weight)
    const supplementScore = Math.min((todaysSupplements / 5) * 25, 25); // Max at 5 supplements
    
    // Active goals (25% weight)
    const activeGoals = goals.filter(g => !g.completed).length;
    const goalScore = Math.min((activeGoals / 4) * 25, 25); // Max at 4 active goals
    
    score = mealScore + streakScore + supplementScore + goalScore;
    return Math.round(score);
  };

  const rebirthScore = calculateRebirthScore();

  // Animate progress circle
  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: rebirthScore / 100,
      duration: 2000,
      useNativeDriver: false,
    }).start();
  }, [rebirthScore, progressAnim]);

  // Motivational quotes that rotate daily
  const motivationalQuotes = [
    "Rise from the ashes stronger than before",
    "Every setback is a setup for a comeback", 
    "Transform your trials into triumphs",
    "The phoenix must burn to emerge",
    "Your comeback is always stronger than your setback",
    "From destruction comes creation",
    "Embrace the fire, become the phoenix"
  ];

  const getDailyQuote = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return motivationalQuotes[dayOfYear % motivationalQuotes.length];
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning, Phoenix";
    if (hour < 17) return "Good afternoon, Phoenix";
    return "Good evening, Phoenix";
  };

  const metricCards = [
    {
      icon: <Utensils size={isSmallScreen ? 24 : 28} color="#FF4500" />,
      label: "Today's Meals",
      value: todaysMeals.toString(),
      subtitle: "meals logged",
      color: "#4CAF50",
    },
    {
      icon: <Shield size={isSmallScreen ? 24 : 28} color="#FF4500" />,
      label: "Total Streak Days",
      value: Object.values(streaks).reduce((sum, days) => sum + days, 0).toString(),
      subtitle: "days strong",
      color: "#2196F3",
    },
    {
      icon: <Pill size={isSmallScreen ? 24 : 28} color="#FF4500" />,
      label: "Supplements Today",
      value: todaysSupplements.toString(),
      subtitle: "taken today",
      color: "#9C27B0",
    },
    {
      icon: <Target size={isSmallScreen ? 24 : 28} color="#FF4500" />,
      label: "Active Goals",
      value: goals.filter(g => !g.completed).length.toString(),
      subtitle: "in progress",
      color: "#FF6B35",
    },
  ];

  // Circular progress component
  const CircularProgress = ({ progress, size = 120 }: { progress: number; size?: number }) => {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Defs>
            <SvgLinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FF4500" />
              <Stop offset="100%" stopColor="#FF6347" />
            </SvgLinearGradient>
          </Defs>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 69, 0, 0.2)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#gradient)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.progressText}>{progress}%</Text>
          <Text style={styles.progressLabel}>Rebirth</Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={["#000000", "#121212"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Text style={styles.logo}>🔥</Text>
            </Animated.View>
            <Text style={styles.title}>Phoenix Rise Wellness</Text>
            <Text style={styles.tagline}>Rise from the ashes</Text>
          </View>

          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeMessage}>{getWelcomeMessage()}</Text>
            <Text style={styles.currentDate}>{getCurrentDate()}</Text>
          </View>

          {/* Rebirth Score */}
          <View style={styles.rebirthScoreContainer}>
            <View style={styles.glassCard}>
              <Text style={styles.rebirthTitle}>Rebirth Score</Text>
              <View style={styles.progressContainer}>
                <CircularProgress progress={rebirthScore} size={isSmallScreen ? 120 : 140} />
                <Animated.View style={[styles.fireAnimation, { transform: [{ scale: scaleAnim }] }]}>
                  <Text style={styles.fireEmoji}>🔥</Text>
                </Animated.View>
              </View>
              <Text style={styles.rebirthSubtitle}>Your wellness journey progress</Text>
            </View>
          </View>

          {/* Phoenix Points Card */}
          <LinearGradient
            colors={["#FF4500", "#FF6347"]}
            style={styles.pointsCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.pointsContent}>
              <Flame size={isSmallScreen ? 28 : 32} color="#FFFFFF" />
              <View style={styles.pointsTextContainer}>
                <Text style={styles.pointsLabel}>Phoenix Points</Text>
                <Text style={styles.pointsValue}>{phoenixPoints}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Metric Cards */}
          <View style={styles.metricsGrid}>
            {metricCards.map((metric, index) => (
              <TouchableOpacity
                key={index}
                style={styles.metricCard}
                activeOpacity={0.8}
              >
                <View style={styles.glassMetricCard}>
                  <View style={styles.metricHeader}>
                    {metric.icon}
                    <Text style={styles.metricValue}>{metric.value}</Text>
                  </View>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text style={styles.metricSubtitle}>{metric.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
              <LinearGradient
                colors={["#FF4500", "#FF6347"]}
                style={styles.actionGradient}
              >
                <Text style={styles.actionText}>Log Today&apos;s Progress</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
              <LinearGradient
                colors={["#1A2B3C", "#003366"]}
                style={styles.actionGradient}
              >
                <Text style={styles.actionText}>View Weekly Report</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Motivational Quote */}
          <View style={[styles.glassCard, { marginHorizontal: isSmallScreen ? 15 : 20, marginBottom: isSmallScreen ? 20 : 30 }]}>
            <View style={styles.quoteHeader}>
              <Text style={styles.quoteIcon}>💫</Text>
              <Text style={styles.quoteSectionTitle}>Daily Inspiration</Text>
            </View>
            <Text style={styles.quoteText}>
              &quot;{getDailyQuote()}&quot;
            </Text>
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
    paddingVertical: isSmallScreen ? 15 : 20,
  },
  logo: {
    fontSize: isSmallScreen ? 48 : 60,
    marginBottom: isSmallScreen ? 8 : 10,
  },
  title: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 5,
    textAlign: "center",
    paddingHorizontal: isSmallScreen ? 10 : 0,
  },
  tagline: {
    fontSize: isSmallScreen ? 14 : 16,
    color: "#8B9DC3",
    fontStyle: "italic",
    textAlign: "center",
  },
  welcomeSection: {
    paddingHorizontal: isSmallScreen ? 15 : 20,
    marginBottom: isSmallScreen ? 15 : 20,
    alignItems: "center",
  },
  welcomeMessage: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 5,
    textAlign: "center",
  },
  currentDate: {
    fontSize: isSmallScreen ? 13 : 14,
    color: "#8B9DC3",
    textAlign: "center",
  },
  rebirthScoreContainer: {
    paddingHorizontal: isSmallScreen ? 15 : 20,
    marginBottom: isSmallScreen ? 20 : 30,
  },
  glassCard: {
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: isSmallScreen ? 16 : 20,
    padding: isSmallScreen ? 20 : 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  rebirthTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: isSmallScreen ? 15 : 20,
  },
  progressContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    position: "relative",
  },
  progressText: {
    fontSize: isSmallScreen ? 28 : 32,
    fontWeight: "bold",
    color: "#FF4500",
  },
  progressLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    color: "#8B9DC3",
    marginTop: 2,
  },
  fireAnimation: {
    position: "absolute",
    top: -10,
    right: -10,
  },
  fireEmoji: {
    fontSize: 24,
  },
  rebirthSubtitle: {
    fontSize: 14,
    color: "#8B9DC3",
    textAlign: "center",
  },
  metricsGrid: {
    paddingHorizontal: isSmallScreen ? 15 : 20,
    marginBottom: isSmallScreen ? 20 : 30,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  metricCard: {
    width: (width - (isSmallScreen ? 50 : 60)) / 2,
    marginBottom: isSmallScreen ? 12 : 15,
  },
  glassMetricCard: {
    backgroundColor: "rgba(26, 43, 60, 0.25)",
    borderRadius: isSmallScreen ? 12 : 16,
    padding: isSmallScreen ? 15 : 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    minHeight: isSmallScreen ? 110 : 120,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  metricValue: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: "bold",
    color: "#FF4500",
  },
  metricLabel: {
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: isSmallScreen ? 11 : 12,
    color: "#8B9DC3",
  },
  pointsCard: {
    marginHorizontal: isSmallScreen ? 15 : 20,
    marginVertical: isSmallScreen ? 15 : 20,
    padding: isSmallScreen ? 18 : 20,
    borderRadius: isSmallScreen ? 12 : 15,
    elevation: 5,
    shadowColor: "#FF4500",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  pointsContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  pointsTextContainer: {
    marginLeft: isSmallScreen ? 12 : 15,
  },
  pointsLabel: {
    fontSize: isSmallScreen ? 13 : 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  pointsValue: {
    fontSize: isSmallScreen ? 32 : 36,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  quickActions: {
    paddingHorizontal: isSmallScreen ? 15 : 20,
    marginBottom: isSmallScreen ? 15 : 20,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: isSmallScreen ? 12 : 15,
  },
  actionButton: {
    marginBottom: isSmallScreen ? 8 : 10,
  },
  actionGradient: {
    padding: isSmallScreen ? 18 : 15,
    borderRadius: isSmallScreen ? 8 : 10,
    alignItems: "center",
    minHeight: isSmallScreen ? 50 : 45,
    justifyContent: "center",
  },
  actionText: {
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  quoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  quoteIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  quoteSectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  quoteText: {
    fontSize: isSmallScreen ? 15 : 16,
    color: "#FFFFFF",
    fontStyle: "italic",
    lineHeight: isSmallScreen ? 22 : 24,
    textAlign: "center",
  },
});