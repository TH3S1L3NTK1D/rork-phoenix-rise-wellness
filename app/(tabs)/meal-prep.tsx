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
  Clipboard,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Check, Coffee, Sun, Moon, Utensils, Calendar, ShoppingCart, ChevronDown, ChevronUp, Copy } from "lucide-react-native";
import { useWellness } from "@/providers/WellnessProvider";

const { width } = Dimensions.get('window');
const isSmallScreen = width < 768;

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type ActiveTab = "add" | "calendar" | "grocery";

interface ExtendedMeal {
  id: string;
  type: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string;
  completed: boolean;
  date: Date;
}

export default function MealPrepScreen() {
  const { phoenixPoints, extendedMeals, addExtendedMeal, addMeal: addBasicMeal } = useWellness();
  const [activeTab, setActiveTab] = useState<ActiveTab>("add");
  const [selectedMeal, setSelectedMeal] = useState<MealType>("breakfast");
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const mealTypes = [
    { type: "breakfast" as MealType, icon: Coffee, label: "Breakfast" },
    { type: "lunch" as MealType, icon: Sun, label: "Lunch" },
    { type: "dinner" as MealType, icon: Moon, label: "Dinner" },
    { type: "snack" as MealType, icon: Utensils, label: "Snack" },
  ];

  const tabs = [
    { id: "add" as ActiveTab, label: "Add Meal", icon: Plus },
    { id: "calendar" as ActiveTab, label: "Calendar", icon: Calendar },
    { id: "grocery" as ActiveTab, label: "Grocery List", icon: ShoppingCart },
  ];

  const handleAddMeal = () => {
    if (!mealName.trim()) {
      Alert.alert("Error", "Please enter a meal name");
      return;
    }

    // Add to extended meals in provider
    addExtendedMeal({
      type: selectedMeal,
      name: mealName,
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fats: parseInt(fats) || 0,
      ingredients: ingredients.trim(),
      completed: false,
      date: selectedDate,
    });
    
    // Also add to basic wellness provider for points
    addBasicMeal({
      type: selectedMeal === "snack" ? "breakfast" : selectedMeal,
      name: mealName,
      calories: parseInt(calories) || 0,
      completed: false,
    });

    // Show success message with Phoenix Points
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);

    // Reset form
    setMealName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFats("");
    setIngredients("");
  };

  // Group meals by date for calendar view
  const mealsByDate = useMemo(() => {
    const grouped: Record<string, ExtendedMeal[]> = {};
    extendedMeals.forEach(meal => {
      const dateKey = meal.date.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(meal);
    });
    return grouped;
  }, [extendedMeals]);

  // Generate grocery list from all meal ingredients
  const groceryList = useMemo(() => {
    const allIngredients = extendedMeals
      .filter(meal => meal.ingredients.trim())
      .flatMap(meal => 
        meal.ingredients.split(',').map(ingredient => ingredient.trim().toLowerCase())
      )
      .filter(ingredient => ingredient.length > 0);
    
    // Remove duplicates and sort
    const uniqueIngredients = Array.from(new Set(allIngredients))
      .sort()
      .map(ingredient => ingredient.charAt(0).toUpperCase() + ingredient.slice(1));
    
    return uniqueIngredients;
  }, [extendedMeals]);

  const toggleDateExpansion = (dateKey: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDates(newExpanded);
  };

  const toggleGroceryItem = (item: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(item)) {
      newChecked.delete(item);
    } else {
      newChecked.add(item);
    }
    setCheckedItems(newChecked);
  };

  const copyGroceryList = async () => {
    const listText = groceryList.map(item => `• ${item}`).join('\n');
    if (Platform.OS === 'web') {
      if (Platform.OS === 'web' && navigator.clipboard) {
        navigator.clipboard.writeText(listText);
      } else {
        Alert.alert('Grocery List', listText);
      }
    } else {
      Clipboard.setString(listText);
    }
    Alert.alert("Success", "Grocery list copied to clipboard!");
  };

  const getDailyTotals = (meals: ExtendedMeal[]) => {
    return meals.reduce(
      (totals, meal) => ({
        calories: totals.calories + meal.calories,
        protein: totals.protein + meal.protein,
        carbs: totals.carbs + meal.carbs,
        fats: totals.fats + meal.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  };

  const renderAddMealTab = () => (
    <View>
      {/* Success Message */}
      {showSuccessMessage && (
        <View style={styles.successMessage}>
          <Text style={styles.successText}>🔥 Meal added! +5 Phoenix Points</Text>
          <Text style={styles.pointsText}>Total: {phoenixPoints + 5} points</Text>
        </View>
      )}

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Add New Meal</Text>
        
        {/* Meal Type Selector */}
        <View style={styles.mealTypeSelector}>
          {mealTypes.map((meal) => (
            <TouchableOpacity
              key={meal.type}
              onPress={() => setSelectedMeal(meal.type)}
              style={[
                styles.mealTypeButton,
                selectedMeal === meal.type && styles.mealTypeButtonActive,
              ]}
            >
              <meal.icon
                size={16}
                color={selectedMeal === meal.type ? "#FFFFFF" : "#8B9DC3"}
              />
              <Text
                style={[
                  styles.mealTypeText,
                  selectedMeal === meal.type && styles.mealTypeTextActive,
                ]}
              >
                {meal.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Meal name"
          placeholderTextColor="#8B9DC3"
          value={mealName}
          onChangeText={setMealName}
        />

        <View style={styles.nutritionRow}>
          <TextInput
            style={[styles.input, styles.nutritionInput]}
            placeholder="Calories"
            placeholderTextColor="#8B9DC3"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.nutritionInput]}
            placeholder="Protein (g)"
            placeholderTextColor="#8B9DC3"
            value={protein}
            onChangeText={setProtein}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.nutritionRow}>
          <TextInput
            style={[styles.input, styles.nutritionInput]}
            placeholder="Carbs (g)"
            placeholderTextColor="#8B9DC3"
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.nutritionInput]}
            placeholder="Fats (g)"
            placeholderTextColor="#8B9DC3"
            value={fats}
            onChangeText={setFats}
            keyboardType="numeric"
          />
        </View>

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ingredients (comma separated)"
          placeholderTextColor="#8B9DC3"
          value={ingredients}
          onChangeText={setIngredients}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity onPress={handleAddMeal} activeOpacity={0.8}>
          <LinearGradient
            colors={["#FF4500", "#FF6347"]}
            style={styles.addButton}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Meal</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCalendarTab = () => (
    <View>
      {Object.keys(mealsByDate).length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No meals added yet</Text>
          <Text style={styles.emptyStateSubtext}>Start by adding your first meal!</Text>
        </View>
      ) : (
        Object.entries(mealsByDate)
          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
          .map(([dateKey, meals]) => {
            const dailyTotals = getDailyTotals(meals);
            const isExpanded = expandedDates.has(dateKey);
            
            return (
              <View key={dateKey} style={styles.dateSection}>
                <TouchableOpacity
                  onPress={() => toggleDateExpansion(dateKey)}
                  style={styles.dateHeader}
                >
                  <View style={styles.dateInfo}>
                    <Text style={styles.dateText}>
                      {new Date(dateKey).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                    <Text style={styles.dateTotals}>
                      {dailyTotals.calories} cal • {dailyTotals.protein}g protein
                    </Text>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={20} color="#FF4500" />
                  ) : (
                    <ChevronDown size={20} color="#FF4500" />
                  )}
                </TouchableOpacity>
                
                {isExpanded && (
                  <View style={styles.mealsContainer}>
                    {meals.map((meal) => (
                      <View key={meal.id} style={styles.calendarMealItem}>
                        <View style={styles.mealHeader}>
                          <Text style={styles.mealTypeLabel}>
                            {mealTypes.find(t => t.type === meal.type)?.label}
                          </Text>
                          <Text style={styles.mealName}>{meal.name}</Text>
                        </View>
                        <View style={styles.nutritionInfo}>
                          <Text style={styles.nutritionText}>
                            {meal.calories} cal • {meal.protein}g protein • {meal.carbs}g carbs • {meal.fats}g fats
                          </Text>
                          {meal.ingredients && (
                            <Text style={styles.ingredientsText}>
                              Ingredients: {meal.ingredients}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
      )}
    </View>
  );

  const renderGroceryTab = () => (
    <View>
      <View style={styles.groceryHeader}>
        <Text style={styles.groceryTitle}>Grocery List</Text>
        <TouchableOpacity onPress={copyGroceryList} style={styles.copyButton}>
          <Copy size={16} color="#FF4500" />
          <Text style={styles.copyButtonText}>Copy List</Text>
        </TouchableOpacity>
      </View>
      
      {groceryList.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No ingredients found</Text>
          <Text style={styles.emptyStateSubtext}>Add meals with ingredients to generate your grocery list</Text>
        </View>
      ) : (
        <View style={styles.groceryList}>
          {groceryList.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => toggleGroceryItem(item)}
              style={styles.groceryItem}
            >
              <View style={styles.groceryCheckbox}>
                {checkedItems.has(item) ? (
                  <LinearGradient
                    colors={["#FF4500", "#FF6347"]}
                    style={styles.checkboxChecked}
                  >
                    <Check size={16} color="#FFFFFF" />
                  </LinearGradient>
                ) : (
                  <View style={styles.checkboxUnchecked} />
                )}
              </View>
              <Text
                style={[
                  styles.groceryItemText,
                  checkedItems.has(item) && styles.groceryItemTextChecked,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient colors={["#000000", "#121212"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>🍽️ Meal Prep</Text>
          <Text style={styles.subtitle}>Fuel your transformation</Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tab,
                activeTab === tab.id && styles.activeTab,
              ]}
            >
              <tab.icon
                size={18}
                color={activeTab === tab.id ? "#FFFFFF" : "#8B9DC3"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
          {activeTab === "add" && renderAddMealTab()}
          {activeTab === "calendar" && renderCalendarTab()}
          {activeTab === "grocery" && renderGroceryTab()}
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
    paddingHorizontal: isSmallScreen ? 15 : 20,
  },
  title: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: "#8B9DC3",
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: isSmallScreen ? 15 : 20,
    marginBottom: isSmallScreen ? 15 : 20,
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: isSmallScreen ? 10 : 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: isSmallScreen ? "column" : "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: isSmallScreen ? 10 : 12,
    paddingHorizontal: isSmallScreen ? 4 : 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "rgba(255, 69, 0, 0.2)",
  },
  tabText: {
    marginLeft: isSmallScreen ? 0 : 6,
    marginTop: isSmallScreen ? 4 : 0,
    fontSize: isSmallScreen ? 11 : 14,
    fontWeight: "500",
    color: "#8B9DC3",
    textAlign: "center",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 15 : 20,
  },
  successMessage: {
    backgroundColor: "rgba(255, 69, 0, 0.1)",
    borderWidth: 1,
    borderColor: "#FF4500",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    alignItems: "center",
  },
  successText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF4500",
    marginBottom: 4,
  },
  pointsText: {
    fontSize: 14,
    color: "#8B9DC3",
  },
  formCard: {
    marginBottom: isSmallScreen ? 15 : 20,
    padding: isSmallScreen ? 15 : 20,
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: isSmallScreen ? 12 : 15,
  },
  formTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: isSmallScreen ? 12 : 15,
  },
  mealTypeSelector: {
    flexDirection: isSmallScreen ? "column" : "row",
    justifyContent: "space-between",
    marginBottom: isSmallScreen ? 12 : 15,
    gap: isSmallScreen ? 8 : 0,
  },
  mealTypeButton: {
    flex: isSmallScreen ? 0 : 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: isSmallScreen ? 12 : 8,
    marginHorizontal: isSmallScreen ? 0 : 2,
    backgroundColor: "rgba(26, 43, 60, 0.5)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    minHeight: isSmallScreen ? 45 : 'auto',
  },
  mealTypeButtonActive: {
    backgroundColor: "rgba(255, 69, 0, 0.2)",
    borderColor: "#FF4500",
  },
  mealTypeText: {
    marginLeft: 4,
    fontSize: isSmallScreen ? 14 : 12,
    color: "#8B9DC3",
  },
  mealTypeTextActive: {
    color: "#FFFFFF",
  },
  input: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: isSmallScreen ? 8 : 10,
    padding: isSmallScreen ? 18 : 15,
    marginBottom: isSmallScreen ? 12 : 10,
    color: "#FFFFFF",
    fontSize: isSmallScreen ? 17 : 16,
    borderWidth: 1,
    borderColor: "rgba(139, 157, 195, 0.2)",
    minHeight: isSmallScreen ? 50 : 'auto',
  },
  nutritionRow: {
    flexDirection: isSmallScreen ? "column" : "row",
    justifyContent: "space-between",
    gap: isSmallScreen ? 0 : 0,
  },
  nutritionInput: {
    flex: isSmallScreen ? 0 : 1,
    marginHorizontal: isSmallScreen ? 0 : 5,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: isSmallScreen ? 18 : 15,
    borderRadius: isSmallScreen ? 8 : 10,
    marginTop: isSmallScreen ? 8 : 5,
    minHeight: isSmallScreen ? 50 : 'auto',
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: isSmallScreen ? 17 : 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#8B9DC3",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#8B9DC3",
    opacity: 0.7,
  },
  dateSection: {
    marginBottom: 15,
    backgroundColor: "rgba(26, 43, 60, 0.2)",
    borderRadius: 12,
    overflow: "hidden",
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "rgba(26, 43, 60, 0.3)",
  },
  dateInfo: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  dateTotals: {
    fontSize: 14,
    color: "#8B9DC3",
  },
  mealsContainer: {
    padding: 15,
  },
  calendarMealItem: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#FF4500",
  },
  mealHeader: {
    marginBottom: 8,
  },
  mealTypeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF4500",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  nutritionInfo: {
    marginTop: 8,
  },
  nutritionText: {
    fontSize: 14,
    color: "#8B9DC3",
    marginBottom: 4,
  },
  ingredientsText: {
    fontSize: 13,
    color: "#8B9DC3",
    opacity: 0.8,
    fontStyle: "italic",
  },
  groceryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  groceryTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 69, 0, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF4500",
  },
  copyButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
    color: "#FF4500",
  },
  groceryList: {
    backgroundColor: "rgba(26, 43, 60, 0.2)",
    borderRadius: 12,
    padding: 15,
  },
  groceryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139, 157, 195, 0.1)",
  },
  groceryCheckbox: {
    marginRight: 12,
  },
  checkboxUnchecked: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#8B9DC3",
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  groceryItemText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  groceryItemTextChecked: {
    textDecorationLine: "line-through",
    opacity: 0.6,
    color: "#8B9DC3",
  },
});