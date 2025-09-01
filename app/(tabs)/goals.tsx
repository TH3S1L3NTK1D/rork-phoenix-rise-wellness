import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  Target, 
  Plus, 
  Trophy, 
  TrendingUp, 
  X, 
  Calendar,
  Flag,
  Edit3,
  CheckCircle,
  Star,
  ChevronDown,
  ChevronUp
} from "lucide-react-native";
import { useWellness } from "@/providers/WellnessProvider";

export default function GoalsScreen() {
  const { goals, addGoal, updateGoal, updateGoalProgress, completeGoal, deleteGoal, phoenixPoints } = useWellness();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [selectedView, setSelectedView] = useState<'active' | 'completed' | 'categories'>('active');
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"health" | "fitness" | "nutrition" | "mental" | "career" | "personal">("health");
  const [targetDate, setTargetDate] = useState("");
  const [measurementMethod, setMeasurementMethod] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [milestones, setMilestones] = useState("");
  const [progress, setProgress] = useState("0");

  const categories = [
    { value: "health" as const, label: "Health", color: "#4CAF50", icon: "💚" },
    { value: "fitness" as const, label: "Fitness", color: "#2196F3", icon: "💪" },
    { value: "nutrition" as const, label: "Nutrition", color: "#FF9800", icon: "🥗" },
    { value: "mental" as const, label: "Mental", color: "#9C27B0", icon: "🧠" },
    { value: "career" as const, label: "Career", color: "#FF5722", icon: "💼" },
    { value: "personal" as const, label: "Personal", color: "#607D8B", icon: "🌟" },
  ];

  const priorities = [
    { value: "low" as const, label: "Low", color: "#8BC34A" },
    { value: "medium" as const, label: "Medium", color: "#FF9800" },
    { value: "high" as const, label: "High", color: "#F44336" },
  ];

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("health");
    setTargetDate("");
    setMeasurementMethod("");
    setPriority("medium");
    setMilestones("");
    setProgress("0");
    setEditingGoal(null);
  };

  const handleAddGoal = () => {
    if (!title.trim() || !targetDate.trim() || !measurementMethod.trim()) {
      Alert.alert("Error", "Please fill in all required fields (Title, Target Date, Measurement Method)");
      return;
    }

    const targetDateObj = new Date(targetDate);
    if (isNaN(targetDateObj.getTime()) || targetDateObj <= new Date()) {
      Alert.alert("Error", "Please enter a valid future date");
      return;
    }

    const progressNum = parseInt(progress) || 0;
    if (progressNum < 0 || progressNum > 100) {
      Alert.alert("Error", "Progress must be between 0 and 100");
      return;
    }

    const milestonesArray = milestones.trim() 
      ? milestones.split('\n').map(m => m.trim()).filter(m => m.length > 0)
      : [];

    if (editingGoal) {
      updateGoal(editingGoal, {
        title: title.trim(),
        description: description.trim(),
        category,
        targetDate: targetDateObj,
        measurementMethod: measurementMethod.trim(),
        priority,
        milestones: milestonesArray,
        progress: progressNum,
      });
    } else {
      addGoal({
        title: title.trim(),
        description: description.trim(),
        category,
        targetDate: targetDateObj,
        measurementMethod: measurementMethod.trim(),
        priority,
        milestones: milestonesArray,
        progress: progressNum,
        completed: false,
      });
    }

    resetForm();
    setShowForm(false);
  };

  const handleEditGoal = (goal: any) => {
    setTitle(goal.title);
    setDescription(goal.description);
    setCategory(goal.category);
    setTargetDate(goal.targetDate.toISOString().split('T')[0]);
    setMeasurementMethod(goal.measurementMethod);
    setPriority(goal.priority);
    setMilestones(goal.milestones.join('\n'));
    setProgress(goal.progress.toString());
    setEditingGoal(goal.id);
    setShowForm(true);
  };

  const handleUpdateProgress = (goalId: string, currentProgress: number) => {
    if (Platform.OS === 'web') {
      const newProgressStr = prompt(`Update progress (current: ${currentProgress}%):`);
      if (newProgressStr) {
        const newProgress = parseInt(newProgressStr);
        if (!isNaN(newProgress) && newProgress >= 0 && newProgress <= 100) {
          updateGoalProgress(goalId, newProgress);
        }
      }
    } else {
      Alert.prompt(
        "Update Progress",
        `Current progress: ${currentProgress}%`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Update",
            onPress: (text) => {
              const newProgress = parseInt(text || "0");
              if (!isNaN(newProgress) && newProgress >= 0 && newProgress <= 100) {
                updateGoalProgress(goalId, newProgress);
              }
            },
          },
        ],
        "plain-text",
        currentProgress.toString()
      );
    }
  };

  const toggleGoalExpansion = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const getDaysRemaining = (targetDate: Date) => {
    const now = new Date();
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);
  
  const goalsByCategory = useMemo(() => {
    const grouped: Record<string, typeof goals> = {};
    categories.forEach(cat => {
      grouped[cat.value] = goals.filter(g => g.category === cat.value);
    });
    return grouped;
  }, [goals, categories]);

  const suggestedGoals = [
    { category: "health", title: "Drink 8 glasses of water daily", measurement: "Track daily water intake" },
    { category: "fitness", title: "Exercise 30 minutes daily", measurement: "Log workout sessions" },
    { category: "nutrition", title: "Eat 5 servings of fruits/vegetables daily", measurement: "Count servings per day" },
    { category: "mental", title: "Meditate for 10 minutes daily", measurement: "Track meditation sessions" },
    { category: "career", title: "Learn a new skill", measurement: "Complete online course" },
    { category: "personal", title: "Read 12 books this year", measurement: "Track books completed" },
  ];

  return (
    <LinearGradient colors={["#000000", "#121212"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                <Target size={40} color="#FF4500" />
                <View>
                  <Text style={styles.title}>🔥 SMART Goals</Text>
                  <Text style={styles.subtitle}>Rise from the ashes stronger</Text>
                </View>
              </View>
              <View style={styles.phoenixPoints}>
                <Text style={styles.pointsText}>{phoenixPoints}</Text>
                <Text style={styles.pointsLabel}>Phoenix Points</Text>
              </View>
            </View>
          </View>

          {/* View Selector */}
          <View style={styles.viewSelector}>
            {[
              { key: 'active', label: 'Active', icon: TrendingUp, count: activeGoals.length },
              { key: 'completed', label: 'Completed', icon: Trophy, count: completedGoals.length },
              { key: 'categories', label: 'Categories', icon: Target, count: categories.length },
            ].map((view) => {
              const IconComponent = view.icon;
              return (
                <TouchableOpacity
                  key={view.key}
                  onPress={() => setSelectedView(view.key as any)}
                  style={[
                    styles.viewTab,
                    selectedView === view.key && styles.viewTabActive
                  ]}
                >
                  <IconComponent 
                    size={20} 
                    color={selectedView === view.key ? "#FF4500" : "#8B9DC3"} 
                  />
                  <Text style={[
                    styles.viewTabText,
                    selectedView === view.key && styles.viewTabTextActive
                  ]}>
                    {view.label}
                  </Text>
                  <View style={[
                    styles.viewTabBadge,
                    selectedView === view.key && styles.viewTabBadgeActive
                  ]}>
                    <Text style={[
                      styles.viewTabBadgeText,
                      selectedView === view.key && styles.viewTabBadgeTextActive
                    ]}>
                      {view.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Add/Edit Goal Form */}
          {showForm ? (
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>
                  {editingGoal ? '✏️ Edit Goal' : '🎯 Set SMART Goal'}
                </Text>
                <Text style={styles.formSubtitle}>+15 Phoenix Points</Text>
              </View>
              
              <TextInput
                style={styles.input}
                placeholder="Goal Title *"
                placeholderTextColor="#8B9DC3"
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
              
              <Text style={styles.inputLabel}>Category *</Text>
              <View style={styles.categorySelector}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    style={[
                      styles.categoryOption,
                      category === cat.value && styles.categoryOptionActive,
                      category === cat.value && { borderColor: cat.color },
                    ]}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text
                      style={[
                        styles.categoryText,
                        category === cat.value && styles.categoryTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                placeholderTextColor="#8B9DC3"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Target Date (YYYY-MM-DD) *"
                placeholderTextColor="#8B9DC3"
                value={targetDate}
                onChangeText={setTargetDate}
              />
              
              <TextInput
                style={styles.input}
                placeholder="How to Measure Success *"
                placeholderTextColor="#8B9DC3"
                value={measurementMethod}
                onChangeText={setMeasurementMethod}
              />
              
              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.prioritySelector}>
                {priorities.map((pri) => (
                  <TouchableOpacity
                    key={pri.value}
                    onPress={() => setPriority(pri.value)}
                    style={[
                      styles.priorityOption,
                      priority === pri.value && styles.priorityOptionActive,
                      priority === pri.value && { borderColor: pri.color },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        priority === pri.value && { color: pri.color },
                      ]}
                    >
                      {pri.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Milestones (one per line)"
                placeholderTextColor="#8B9DC3"
                value={milestones}
                onChangeText={setMilestones}
                multiline
                numberOfLines={4}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Current Progress (0-100%)"
                placeholderTextColor="#8B9DC3"
                value={progress}
                onChangeText={setProgress}
                keyboardType="numeric"
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
                <TouchableOpacity onPress={handleAddGoal} activeOpacity={0.8}>
                  <LinearGradient
                    colors={["#FF4500", "#FF6347"]}
                    style={styles.saveButton}
                  >
                    <Text style={styles.saveButtonText}>
                      {editingGoal ? 'Update Goal' : 'Create Goal'}
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
                <Text style={styles.addButtonText}>Set New SMART Goal</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Active Goals */}
          {selectedView === 'active' && (
            <View style={styles.goalsSection}>
              <Text style={styles.sectionTitle}>🔥 Active Goals</Text>
              {activeGoals.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No active goals yet</Text>
                  <Text style={styles.emptySubtext}>Set your first SMART goal to start your journey</Text>
                  
                  <Text style={styles.suggestedTitle}>💡 Suggested Goals:</Text>
                  {suggestedGoals.slice(0, 3).map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionCard}
                      onPress={() => {
                        setTitle(suggestion.title);
                        setCategory(suggestion.category as any);
                        setMeasurementMethod(suggestion.measurement);
                        setShowForm(true);
                      }}
                    >
                      <Text style={styles.suggestionText}>{suggestion.title}</Text>
                      <Text style={styles.suggestionCategory}>{suggestion.category}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                activeGoals.map((goal) => {
                  const categoryData = categories.find((c) => c.value === goal.category);
                  const categoryColor = categoryData?.color || "#FF4500";
                  const isExpanded = expandedGoals.has(goal.id);
                  const daysRemaining = getDaysRemaining(goal.targetDate);
                  
                  return (
                    <View key={goal.id} style={styles.goalCard}>
                      <TouchableOpacity
                        onPress={() => toggleGoalExpansion(goal.id)}
                        style={styles.goalHeader}
                      >
                        <View style={styles.goalTitleContainer}>
                          <Text style={styles.goalTitle}>{goal.title}</Text>
                          <View style={styles.goalBadges}>
                            <View style={[styles.categoryBadge, { backgroundColor: categoryColor + "20" }]}>
                              <Text style={styles.categoryIcon}>{categoryData?.icon}</Text>
                              <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
                                {goal.category}
                              </Text>
                            </View>
                            <View style={[styles.priorityBadge, { 
                              backgroundColor: priorities.find(p => p.value === goal.priority)?.color + "20" 
                            }]}>
                              <Text style={[styles.priorityBadgeText, { 
                                color: priorities.find(p => p.value === goal.priority)?.color 
                              }]}>
                                {goal.priority.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.goalActions}>
                          {isExpanded ? 
                            <ChevronUp size={20} color="#8B9DC3" /> : 
                            <ChevronDown size={20} color="#8B9DC3" />
                          }
                        </View>
                      </TouchableOpacity>
                      
                      <View style={styles.goalMeta}>
                        <View style={styles.metaItem}>
                          <Calendar size={16} color="#8B9DC3" />
                          <Text style={styles.metaText}>
                            {daysRemaining > 0 ? `${daysRemaining} days left` : 
                             daysRemaining === 0 ? 'Due today' : `${Math.abs(daysRemaining)} days overdue`}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Flag size={16} color="#8B9DC3" />
                          <Text style={styles.metaText}>{formatDate(goal.targetDate)}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.progressContainer}>
                        <View style={styles.progressInfo}>
                          <Text style={styles.progressText}>Progress</Text>
                          <Text style={styles.progressPercentage}>{goal.progress}%</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.progressBar}
                          onPress={() => handleUpdateProgress(goal.id, goal.progress)}
                        >
                          <View style={styles.progressTrack}>
                            <LinearGradient
                              colors={[categoryColor, categoryColor + "CC"]}
                              style={[styles.progressFill, { width: `${Math.min(goal.progress, 100)}%` }]}
                            />
                            {goal.progress >= 100 && (
                              <View style={styles.phoenixWing}>
                                <Text style={styles.phoenixWingText}>🔥</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      </View>
                      
                      {isExpanded && (
                        <View style={styles.expandedContent}>
                          {goal.description && (
                            <Text style={styles.goalDescription}>{goal.description}</Text>
                          )}
                          
                          <Text style={styles.measurementText}>
                            📊 Measurement: {goal.measurementMethod}
                          </Text>
                          
                          {goal.milestones.length > 0 && (
                            <View style={styles.milestonesContainer}>
                              <Text style={styles.milestonesTitle}>🎯 Milestones:</Text>
                              {goal.milestones.map((milestone, index) => (
                                <Text key={index} style={styles.milestoneItem}>
                                  • {milestone}
                                </Text>
                              ))}
                            </View>
                          )}
                          
                          <View style={styles.goalActions}>
                            <TouchableOpacity
                              onPress={() => handleEditGoal(goal)}
                              style={styles.actionButton}
                            >
                              <Edit3 size={16} color="#8B9DC3" />
                              <Text style={styles.actionButtonText}>Edit</Text>
                            </TouchableOpacity>
                            
                            {goal.progress < 100 && (
                              <TouchableOpacity
                                onPress={() => completeGoal(goal.id)}
                                style={[styles.actionButton, styles.completeButton]}
                              >
                                <CheckCircle size={16} color="#4CAF50" />
                                <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>Complete (+50 Points)</Text>
                              </TouchableOpacity>
                            )}
                            
                            <TouchableOpacity
                              onPress={() => deleteGoal(goal.id)}
                              style={[styles.actionButton, styles.deleteActionButton]}
                            >
                              <X size={16} color="#FF4500" />
                              <Text style={[styles.actionButtonText, { color: '#FF4500' }]}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Completed Goals */}
          {selectedView === 'completed' && (
            <View style={styles.goalsSection}>
              <Text style={styles.sectionTitle}>🏆 Trophy Section</Text>
              {completedGoals.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No completed goals yet</Text>
                  <Text style={styles.emptySubtext}>Complete your first goal to earn a trophy!</Text>
                </View>
              ) : (
                completedGoals.map((goal) => {
                  const categoryData = categories.find((c) => c.value === goal.category);
                  const categoryColor = categoryData?.color || "#FF4500";
                  const completionTime = goal.completedAt && goal.createdAt ? 
                    Math.ceil((goal.completedAt.getTime() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  
                  return (
                    <View key={goal.id} style={[styles.goalCard, styles.completedGoalCard]}>
                      <View style={styles.completedHeader}>
                        <View style={styles.trophyContainer}>
                          <Trophy size={32} color="#FFD700" />
                          <View style={styles.celebrationAnimation}>
                            <Text style={styles.celebrationText}>🎉</Text>
                          </View>
                        </View>
                        <View style={styles.completedInfo}>
                          <Text style={styles.completedGoalTitle}>{goal.title}</Text>
                          <Text style={styles.completedCategory}>
                            {categoryData?.icon} {goal.category.toUpperCase()}
                          </Text>
                          <Text style={styles.completedDate}>
                            Completed: {goal.completedAt ? formatDate(goal.completedAt) : 'Unknown'}
                          </Text>
                          {completionTime > 0 && (
                            <Text style={styles.completionTime}>
                              ⏱️ Took {completionTime} days
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => deleteGoal(goal.id)}
                          style={styles.deleteButton}
                        >
                          <X size={18} color="#FF4500" />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.achievementBanner}>
                        <Star size={16} color="#FFD700" />
                        <Text style={styles.achievementText}>+50 Phoenix Points Earned!</Text>
                        <Star size={16} color="#FFD700" />
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Categories View */}
          {selectedView === 'categories' && (
            <View style={styles.goalsSection}>
              <Text style={styles.sectionTitle}>📊 Goals by Category</Text>
              {categories.map((category) => {
                const categoryGoals = goalsByCategory[category.value] || [];
                const activeCount = categoryGoals.filter(g => !g.completed).length;
                const completedCount = categoryGoals.filter(g => g.completed).length;
                const avgProgress = categoryGoals.length > 0 ? 
                  categoryGoals.reduce((sum, g) => sum + g.progress, 0) / categoryGoals.length : 0;
                
                return (
                  <View key={category.value} style={styles.categoryCard}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryEmoji}>{category.icon}</Text>
                        <View>
                          <Text style={styles.categoryName}>{category.label}</Text>
                          <Text style={styles.categoryStats}>
                            {activeCount} active • {completedCount} completed
                          </Text>
                        </View>
                      </View>
                      <View style={styles.categoryProgress}>
                        <Text style={styles.categoryProgressText}>{Math.round(avgProgress)}%</Text>
                      </View>
                    </View>
                    
                    <View style={styles.categoryProgressBar}>
                      <LinearGradient
                        colors={[category.color, category.color + "CC"]}
                        style={[styles.categoryProgressFill, { width: `${avgProgress}%` }]}
                      />
                    </View>
                    
                    {categoryGoals.length === 0 && (
                      <TouchableOpacity
                        style={styles.addCategoryGoal}
                        onPress={() => {
                          setCategory(category.value);
                          setShowForm(true);
                        }}
                      >
                        <Plus size={16} color={category.color} />
                        <Text style={[styles.addCategoryGoalText, { color: category.color }]}>
                          Add {category.label} Goal
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
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
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#8B9DC3",
    marginLeft: 12,
    marginTop: 2,
  },
  phoenixPoints: {
    alignItems: "center",
    backgroundColor: "rgba(255, 69, 0, 0.1)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 69, 0, 0.3)",
  },
  pointsText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF4500",
  },
  pointsLabel: {
    fontSize: 10,
    color: "#8B9DC3",
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 5,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 14,
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
  categorySelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  categoryOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: "rgba(26, 43, 60, 0.5)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  categoryOptionActive: {
    backgroundColor: "rgba(255, 69, 0, 0.1)",
  },
  categoryText: {
    fontSize: 14,
    color: "#8B9DC3",
  },
  categoryTextActive: {
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
  goalsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 15,
  },
  goalCard: {
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  completedGoalCard: {
    opacity: 0.7,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  goalTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  completedGoalTitle: {
    textDecorationLine: "line-through",
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  goalDescription: {
    fontSize: 14,
    color: "#8B9DC3",
    marginBottom: 15,
    lineHeight: 20,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: "#8B9DC3",
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(139, 157, 195, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  completedText: {
    fontSize: 14,
    color: "#4CAF50",
    fontStyle: "italic",
  },
  deleteButton: {
    padding: 5,
  },
  emptyCard: {
    marginHorizontal: 20,
    marginBottom: 20,
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
    marginBottom: 20,
  },
  // View Selector Styles
  viewSelector: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 12,
    padding: 4,
  },
  viewTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  viewTabActive: {
    backgroundColor: "rgba(255, 69, 0, 0.1)",
  },
  viewTabText: {
    fontSize: 12,
    color: "#8B9DC3",
    marginLeft: 6,
    fontWeight: "600",
  },
  viewTabTextActive: {
    color: "#FF4500",
  },
  viewTabBadge: {
    backgroundColor: "rgba(139, 157, 195, 0.2)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  viewTabBadgeActive: {
    backgroundColor: "rgba(255, 69, 0, 0.2)",
  },
  viewTabBadgeText: {
    fontSize: 10,
    color: "#8B9DC3",
    fontWeight: "bold",
  },
  viewTabBadgeTextActive: {
    color: "#FF4500",
  },
  // Form Styles
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  formSubtitle: {
    fontSize: 12,
    color: "#FF4500",
    fontWeight: "600",
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  prioritySelector: {
    flexDirection: "row",
    marginBottom: 20,
  },
  priorityOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: "rgba(26, 43, 60, 0.5)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  priorityOptionActive: {
    backgroundColor: "rgba(255, 69, 0, 0.1)",
  },
  priorityText: {
    fontSize: 14,
    color: "#8B9DC3",
  },
  // Suggestion Styles
  suggestedTitle: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
  },
  suggestionCard: {
    backgroundColor: "rgba(255, 69, 0, 0.1)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 69, 0, 0.2)",
  },
  suggestionText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  suggestionCategory: {
    fontSize: 12,
    color: "#FF4500",
    marginTop: 4,
    textTransform: "capitalize",
  },
  // Goal Card Styles
  goalBadges: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  goalActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 15,
  },
  goalMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: "#8B9DC3",
    marginLeft: 6,
  },
  progressTrack: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  phoenixWing: {
    position: "absolute",
    right: 4,
    top: -2,
  },
  phoenixWingText: {
    fontSize: 12,
  },
  // Expanded Content Styles
  expandedContent: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "rgba(139, 157, 195, 0.2)",
  },
  measurementText: {
    fontSize: 14,
    color: "#8B9DC3",
    marginBottom: 15,
    fontStyle: "italic",
  },
  milestonesContainer: {
    marginBottom: 15,
  },
  milestonesTitle: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
    marginBottom: 8,
  },
  milestoneItem: {
    fontSize: 13,
    color: "#8B9DC3",
    marginBottom: 4,
    paddingLeft: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(26, 43, 60, 0.5)",
    marginRight: 8,
  },
  completeButton: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  deleteActionButton: {
    backgroundColor: "rgba(255, 69, 0, 0.1)",
  },
  actionButtonText: {
    fontSize: 12,
    color: "#8B9DC3",
    marginLeft: 4,
    fontWeight: "600",
  },
  // Completed Goals Styles
  completedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  trophyContainer: {
    position: "relative",
    marginRight: 15,
  },
  celebrationAnimation: {
    position: "absolute",
    top: -5,
    right: -5,
  },
  celebrationText: {
    fontSize: 16,
  },
  completedInfo: {
    flex: 1,
  },
  completedCategory: {
    fontSize: 12,
    color: "#8B9DC3",
    marginTop: 4,
  },
  completedDate: {
    fontSize: 12,
    color: "#4CAF50",
    marginTop: 4,
  },
  completionTime: {
    fontSize: 11,
    color: "#8B9DC3",
    marginTop: 2,
    fontStyle: "italic",
  },
  achievementBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  achievementText: {
    fontSize: 12,
    color: "#FFD700",
    fontWeight: "600",
    marginHorizontal: 8,
  },
  // Category View Styles
  categoryCard: {
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  categoryStats: {
    fontSize: 12,
    color: "#8B9DC3",
    marginTop: 4,
  },
  categoryProgress: {
    alignItems: "center",
  },
  categoryProgressText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  categoryProgressBar: {
    height: 6,
    backgroundColor: "rgba(139, 157, 195, 0.2)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  categoryProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  addCategoryGoal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(139, 157, 195, 0.3)",
  },
  addCategoryGoalText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
});