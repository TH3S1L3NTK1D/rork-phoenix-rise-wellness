import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pill, Plus, Check, Clock, X, Info, Bell, ChevronDown } from "lucide-react-native";
import { useWellness } from "@/providers/WellnessProvider";

const COMMON_SUPPLEMENTS = [
  { name: "Vitamin D", icon: "☀️", defaultDosage: "1000 IU" },
  { name: "Vitamin B12", icon: "⚡", defaultDosage: "500 mcg" },
  { name: "Omega-3", icon: "🐟", defaultDosage: "1000 mg" },
  { name: "Magnesium", icon: "💪", defaultDosage: "400 mg" },
  { name: "Zinc", icon: "🛡️", defaultDosage: "15 mg" },
  { name: "Iron", icon: "🩸", defaultDosage: "18 mg" },
  { name: "Calcium", icon: "🦴", defaultDosage: "1000 mg" },
  { name: "Probiotics", icon: "🦠", defaultDosage: "10 billion CFU" },
  { name: "Vitamin C", icon: "🍊", defaultDosage: "1000 mg" },
  { name: "Custom", icon: "💊", defaultDosage: "" },
];

const SUPPLEMENT_INFO = {
  "Vitamin D": {
    benefits: "Supports bone health, immune function, and mood",
    bestTime: "Morning with food",
    recommended: "1000-4000 IU daily",
    warnings: "Can interact with certain medications"
  },
  "Vitamin B12": {
    benefits: "Energy production, nerve function, red blood cell formation",
    bestTime: "Morning on empty stomach",
    recommended: "250-1000 mcg daily",
    warnings: "Generally safe, water-soluble"
  },
  "Omega-3": {
    benefits: "Heart health, brain function, anti-inflammatory",
    bestTime: "With meals to reduce fishy taste",
    recommended: "1000-2000 mg daily",
    warnings: "May interact with blood thinners"
  },
  "Magnesium": {
    benefits: "Muscle function, sleep quality, stress reduction",
    bestTime: "Evening for better sleep",
    recommended: "300-400 mg daily",
    warnings: "High doses may cause digestive issues"
  },
  "Zinc": {
    benefits: "Immune support, wound healing, protein synthesis",
    bestTime: "On empty stomach or with food if upset",
    recommended: "8-15 mg daily",
    warnings: "Too much can interfere with copper absorption"
  },
  "Iron": {
    benefits: "Oxygen transport, energy production, immune function",
    bestTime: "Morning on empty stomach with vitamin C",
    recommended: "8-18 mg daily (varies by gender/age)",
    warnings: "Can cause constipation, avoid with calcium"
  },
  "Calcium": {
    benefits: "Bone health, muscle function, nerve transmission",
    bestTime: "Throughout the day with meals",
    recommended: "1000-1200 mg daily",
    warnings: "May interfere with iron absorption"
  },
  "Probiotics": {
    benefits: "Digestive health, immune support, mood regulation",
    bestTime: "On empty stomach or with meals",
    recommended: "1-10 billion CFU daily",
    warnings: "May cause temporary digestive changes"
  },
  "Vitamin C": {
    benefits: "Immune support, collagen synthesis, antioxidant",
    bestTime: "Morning with food",
    recommended: "500-1000 mg daily",
    warnings: "High doses may cause digestive upset"
  },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SupplementsScreen() {
  const { supplements, addSupplement, toggleSupplementTaken, deleteSupplement } = useWellness();
  const [showForm, setShowForm] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedSupplement, setSelectedSupplement] = useState(COMMON_SUPPLEMENTS[0]);
  const [customName, setCustomName] = useState("");
  const [dosage, setDosage] = useState("");
  const [brand, setBrand] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [time, setTime] = useState("morning");
  const [activeTab, setActiveTab] = useState<"today" | "weekly" | "info">("today");
  const [infoSupplement, setInfoSupplement] = useState<string | null>(null);

  // Request notification permission
  useEffect(() => {
    if (Platform.OS === 'web') {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const handleAddSupplement = () => {
    const supplementName = selectedSupplement.name === "Custom" ? customName.trim() : selectedSupplement.name;
    
    if (!supplementName) {
      Alert.alert("Error", "Please enter supplement name");
      return;
    }

    const finalDosage = dosage.trim() || selectedSupplement.defaultDosage;

    addSupplement({
      name: supplementName,
      dosage: finalDosage,
      brand: brand.trim(),
      notes: notes.trim(),
      reminderTime: reminderTime.trim(),
      time: time as "morning" | "afternoon" | "evening",
      takenToday: false,
    });

    // Reset form
    setSelectedSupplement(COMMON_SUPPLEMENTS[0]);
    setCustomName("");
    setDosage("");
    setBrand("");
    setNotes("");
    setReminderTime("");
    setTime("morning");
    setShowForm(false);
    
    Alert.alert("Success!", "Supplement added! +2 Phoenix Points when taken daily");
  };

  const handleSupplementSelect = (supplement: typeof COMMON_SUPPLEMENTS[0]) => {
    setSelectedSupplement(supplement);
    setDosage(supplement.defaultDosage);
    setShowDropdown(false);
  };

  const showSupplementInfo = (supplementName: string) => {
    setInfoSupplement(supplementName);
    setShowInfo(true);
  };

  const timeOptions = [
    { value: "morning", label: "Morning", icon: "☀️" },
    { value: "afternoon", label: "Afternoon", icon: "🌤️" },
    { value: "evening", label: "Evening", icon: "🌙" },
  ];

  const groupedSupplements = {
    morning: supplements.filter((s) => s.time === "morning"),
    afternoon: supplements.filter((s) => s.time === "afternoon"),
    evening: supplements.filter((s) => s.time === "evening"),
  };

  const totalSupplements = supplements.length;
  const takenToday = supplements.filter((s) => s.takenToday).length;
  const completionRate = totalSupplements > 0 ? (takenToday / totalSupplements) * 100 : 0;
  
  const weeklyConsistency = useMemo(() => {
    if (supplements.length === 0) return 0;
    const totalDays = supplements.length * 7;
    const takenDays = supplements.reduce((sum, s) => sum + s.weeklyHistory.filter(Boolean).length, 0);
    return (takenDays / totalDays) * 100;
  }, [supplements]);

  return (
    <LinearGradient colors={["#000000", "#121212"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pill size={40} color="#FF4500" />
            <Text style={styles.title}>Supplements</Text>
            <Text style={styles.subtitle}>Optimize your health</Text>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              onPress={() => setActiveTab("today")}
              style={[styles.tab, activeTab === "today" && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === "today" && styles.activeTabText]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("weekly")}
              style={[styles.tab, activeTab === "weekly" && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === "weekly" && styles.activeTabText]}>Weekly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("info")}
              style={[styles.tab, activeTab === "info" && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === "info" && styles.activeTabText]}>Info</Text>
            </TouchableOpacity>
          </View>

          {/* Progress Cards */}
          <View style={styles.progressContainer}>
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>Today&apos;s Progress</Text>
              <View style={styles.progressStats}>
                <Text style={styles.progressText}>
                  {takenToday} of {totalSupplements} taken
                </Text>
                <Text style={styles.progressPercentage}>
                  {Math.round(completionRate)}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={["#FF4500", "#FF6347"]}
                  style={[styles.progressFill, { width: `${completionRate}%` }]}
                />
              </View>
            </View>
            
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>Weekly Consistency</Text>
              <View style={styles.progressStats}>
                <Text style={styles.progressText}>This week</Text>
                <Text style={styles.progressPercentage}>
                  {Math.round(weeklyConsistency)}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={["#4CAF50", "#45a049"]}
                  style={[styles.progressFill, { width: `${weeklyConsistency}%` }]}
                />
              </View>
            </View>
          </View>

          {/* Add Supplement Form */}
          {showForm ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Add New Supplement</Text>
              
              {/* Supplement Dropdown */}
              <Text style={styles.inputLabel}>Select Supplement:</Text>
              <TouchableOpacity
                onPress={() => setShowDropdown(!showDropdown)}
                style={styles.dropdown}
              >
                <View style={styles.dropdownContent}>
                  <Text style={styles.dropdownIcon}>{selectedSupplement.icon}</Text>
                  <Text style={styles.dropdownText}>{selectedSupplement.name}</Text>
                </View>
                <ChevronDown size={20} color="#8B9DC3" />
              </TouchableOpacity>
              
              {showDropdown && (
                <View style={styles.dropdownList}>
                  {COMMON_SUPPLEMENTS.map((supplement, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleSupplementSelect(supplement)}
                      style={styles.dropdownItem}
                    >
                      <Text style={styles.dropdownIcon}>{supplement.icon}</Text>
                      <Text style={styles.dropdownItemText}>{supplement.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {selectedSupplement.name === "Custom" && (
                <TextInput
                  style={styles.input}
                  placeholder="Enter supplement name"
                  placeholderTextColor="#8B9DC3"
                  value={customName}
                  onChangeText={setCustomName}
                  autoFocus
                />
              )}
              
              <TextInput
                style={styles.input}
                placeholder={`Dosage (e.g., ${selectedSupplement.defaultDosage || '500mg, 2 tablets'})`}
                placeholderTextColor="#8B9DC3"
                value={dosage}
                onChangeText={setDosage}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Brand (optional)"
                placeholderTextColor="#8B9DC3"
                value={brand}
                onChangeText={setBrand}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Reminder time (e.g., 8:00 AM)"
                placeholderTextColor="#8B9DC3"
                value={reminderTime}
                onChangeText={setReminderTime}
              />
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes (optional)"
                placeholderTextColor="#8B9DC3"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
              
              <Text style={styles.inputLabel}>When to take:</Text>
              <View style={styles.timeSelector}>
                {timeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setTime(option.value)}
                    style={[
                      styles.timeOption,
                      time === option.value && styles.timeOptionActive,
                    ]}
                  >
                    <Text style={styles.timeIcon}>{option.icon}</Text>
                    <Text
                      style={[
                        styles.timeText,
                        time === option.value && styles.timeTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.formButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowForm(false);
                    setSelectedSupplement(COMMON_SUPPLEMENTS[0]);
                    setCustomName("");
                    setDosage("");
                    setBrand("");
                    setNotes("");
                    setReminderTime("");
                    setTime("morning");
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddSupplement} activeOpacity={0.8}>
                  <LinearGradient
                    colors={["#FF4500", "#FF6347"]}
                    style={styles.saveButton}
                  >
                    <Text style={styles.saveButtonText}>Add Supplement</Text>
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
                <Text style={styles.addButtonText}>Add Supplement</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Tab Content */}
          {activeTab === "today" && (
            <>
              {/* Today's Supplements by Time */}
              {Object.entries(groupedSupplements).map(([timeKey, supps]) => {
                const timeOption = timeOptions.find((t) => t.value === timeKey);
                if (!timeOption || supps.length === 0) return null;

                return (
                  <View key={timeKey} style={styles.timeSection}>
                    <View style={styles.timeSectionHeader}>
                      <Text style={styles.timeSectionIcon}>{timeOption.icon}</Text>
                      <Text style={styles.timeSectionTitle}>{timeOption.label}</Text>
                      <Clock size={18} color="#8B9DC3" />
                    </View>

                    {supps.map((supplement) => {
                      const supplementIcon = COMMON_SUPPLEMENTS.find(s => s.name === supplement.name)?.icon || "💊";
                      return (
                        <View key={supplement.id} style={styles.supplementCard}>
                          <TouchableOpacity
                            onPress={() => toggleSupplementTaken(supplement.id)}
                            style={styles.supplementCheckbox}
                          >
                            {supplement.takenToday ? (
                              <LinearGradient
                                colors={["#4CAF50", "#45a049"]}
                                style={styles.checkboxChecked}
                              >
                                <Check size={18} color="#FFFFFF" />
                              </LinearGradient>
                            ) : (
                              <View style={styles.checkboxUnchecked} />
                            )}
                          </TouchableOpacity>

                          <Text style={styles.supplementIcon}>{supplementIcon}</Text>

                          <View style={styles.supplementInfo}>
                            <Text
                              style={[
                                styles.supplementName,
                                supplement.takenToday && styles.supplementNameTaken,
                              ]}
                            >
                              {supplement.name}
                            </Text>
                            {supplement.dosage && (
                              <Text style={styles.supplementDosage}>
                                {supplement.dosage}
                              </Text>
                            )}
                            {supplement.brand && (
                              <Text style={styles.supplementBrand}>
                                {supplement.brand}
                              </Text>
                            )}
                            {supplement.reminderTime && (
                              <View style={styles.reminderContainer}>
                                <Bell size={12} color="#8B9DC3" />
                                <Text style={styles.reminderText}>{supplement.reminderTime}</Text>
                              </View>
                            )}
                          </View>

                          <TouchableOpacity
                            onPress={() => showSupplementInfo(supplement.name)}
                            style={styles.infoButton}
                          >
                            <Info size={16} color="#8B9DC3" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => deleteSupplement(supplement.id)}
                            style={styles.deleteButton}
                          >
                            <X size={18} color="#FF4500" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </>
          )}

          {activeTab === "weekly" && (
            <View style={styles.weeklyContainer}>
              <Text style={styles.weeklyTitle}>Weekly Progress</Text>
              {supplements.map((supplement) => {
                const supplementIcon = COMMON_SUPPLEMENTS.find(s => s.name === supplement.name)?.icon || "💊";
                const weeklyTaken = supplement.weeklyHistory.filter(Boolean).length;
                const weeklyRate = (weeklyTaken / 7) * 100;
                
                return (
                  <View key={supplement.id} style={styles.weeklyCard}>
                    <View style={styles.weeklyHeader}>
                      <Text style={styles.supplementIcon}>{supplementIcon}</Text>
                      <View style={styles.weeklyInfo}>
                        <Text style={styles.weeklySupplementName}>{supplement.name}</Text>
                        <Text style={styles.weeklyStats}>{weeklyTaken}/7 days ({Math.round(weeklyRate)}%)</Text>
                      </View>
                    </View>
                    
                    <View style={styles.weeklyDays}>
                      {DAYS.map((day, index) => (
                        <View key={index} style={styles.dayContainer}>
                          <Text style={styles.dayLabel}>{day}</Text>
                          <View style={[
                            styles.dayIndicator,
                            supplement.weeklyHistory[index] && styles.dayIndicatorTaken
                          ]} />
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {activeTab === "info" && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>Supplement Information</Text>
              {Object.entries(SUPPLEMENT_INFO).map(([name, info]) => {
                const supplementIcon = COMMON_SUPPLEMENTS.find(s => s.name === name)?.icon || "💊";
                return (
                  <View key={name} style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                      <Text style={styles.supplementIcon}>{supplementIcon}</Text>
                      <Text style={styles.infoSupplementName}>{name}</Text>
                    </View>
                    <Text style={styles.infoBenefits}>{info.benefits}</Text>
                    <View style={styles.infoDetails}>
                      <Text style={styles.infoDetailLabel}>Best Time:</Text>
                      <Text style={styles.infoDetailText}>{info.bestTime}</Text>
                    </View>
                    <View style={styles.infoDetails}>
                      <Text style={styles.infoDetailLabel}>Recommended:</Text>
                      <Text style={styles.infoDetailText}>{info.recommended}</Text>
                    </View>
                    <View style={styles.infoDetails}>
                      <Text style={styles.infoDetailLabel}>Warnings:</Text>
                      <Text style={styles.infoDetailText}>{info.warnings}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {supplements.length === 0 && !showForm && activeTab === "today" && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No supplements added yet</Text>
              <Text style={styles.emptySubtext}>
                Start tracking your daily supplements
              </Text>
            </View>
          )}

          {/* Tips Card */}
          {activeTab === "today" && (
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
              <Text style={styles.tipText}>
                • Take supplements with food for better absorption
              </Text>
              <Text style={styles.tipText}>
                • Set reminders to maintain consistency
              </Text>
              <Text style={styles.tipText}>
                • Consult with healthcare providers regularly
              </Text>
              <Text style={styles.tipText}>
                • Earn +2 Phoenix Points for each supplement taken
              </Text>
            </View>
          )}

          {/* Supplement Info Modal */}
          <Modal
            visible={showInfo}
            transparent
            animationType="fade"
            onRequestClose={() => setShowInfo(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                {infoSupplement && SUPPLEMENT_INFO[infoSupplement as keyof typeof SUPPLEMENT_INFO] && (
                  <>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{infoSupplement}</Text>
                      <TouchableOpacity onPress={() => setShowInfo(false)}>
                        <X size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.modalBenefits}>
                      {SUPPLEMENT_INFO[infoSupplement as keyof typeof SUPPLEMENT_INFO].benefits}
                    </Text>
                    
                    <View style={styles.modalDetails}>
                      <Text style={styles.modalDetailLabel}>Best Time to Take:</Text>
                      <Text style={styles.modalDetailText}>
                        {SUPPLEMENT_INFO[infoSupplement as keyof typeof SUPPLEMENT_INFO].bestTime}
                      </Text>
                    </View>
                    
                    <View style={styles.modalDetails}>
                      <Text style={styles.modalDetailLabel}>Recommended Dosage:</Text>
                      <Text style={styles.modalDetailText}>
                        {SUPPLEMENT_INFO[infoSupplement as keyof typeof SUPPLEMENT_INFO].recommended}
                      </Text>
                    </View>
                    
                    <View style={styles.modalDetails}>
                      <Text style={styles.modalDetailLabel}>Important Notes:</Text>
                      <Text style={styles.modalDetailText}>
                        {SUPPLEMENT_INFO[infoSupplement as keyof typeof SUPPLEMENT_INFO].warnings}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </Modal>
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
  },
  progressCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 15,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressText: {
    fontSize: 14,
    color: "#8B9DC3",
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF4500",
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
  inputLabel: {
    fontSize: 14,
    color: "#8B9DC3",
    marginBottom: 10,
  },
  timeSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  timeOption: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    marginHorizontal: 5,
    backgroundColor: "rgba(26, 43, 60, 0.5)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  timeOptionActive: {
    backgroundColor: "rgba(255, 69, 0, 0.2)",
    borderColor: "#FF4500",
  },
  timeIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  timeText: {
    fontSize: 12,
    color: "#8B9DC3",
  },
  timeTextActive: {
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
  timeSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  timeSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  timeSectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  timeSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
  },
  supplementCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26, 43, 60, 0.2)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  supplementCheckbox: {
    marginRight: 12,
  },
  checkboxUnchecked: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#8B9DC3",
  },
  checkboxChecked: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  supplementInfo: {
    flex: 1,
  },
  supplementName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  supplementNameTaken: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  supplementDosage: {
    fontSize: 14,
    color: "#8B9DC3",
    marginTop: 2,
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
  },
  tipsCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 20,
    backgroundColor: "rgba(255, 69, 0, 0.1)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 69, 0, 0.3)",
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF4500",
    marginBottom: 15,
  },
  tipText: {
    fontSize: 14,
    color: "#FFFFFF",
    marginBottom: 8,
    lineHeight: 20,
  },
  // Tab styles
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 12,
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
    fontSize: 14,
    fontWeight: "600",
    color: "#8B9DC3",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  // Progress container
  progressContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  // Dropdown styles
  dropdown: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(139, 157, 195, 0.2)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  dropdownText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  dropdownList: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(139, 157, 195, 0.2)",
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139, 157, 195, 0.1)",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  // Supplement icon
  supplementIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  supplementBrand: {
    fontSize: 12,
    color: "#8B9DC3",
    fontStyle: "italic",
    marginTop: 2,
  },
  reminderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  reminderText: {
    fontSize: 12,
    color: "#8B9DC3",
    marginLeft: 4,
  },
  infoButton: {
    padding: 8,
    marginRight: 8,
  },
  // Weekly view styles
  weeklyContainer: {
    marginHorizontal: 20,
  },
  weeklyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
  },
  weeklyCard: {
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  weeklyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  weeklyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  weeklySupplementName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  weeklyStats: {
    fontSize: 14,
    color: "#8B9DC3",
    marginTop: 2,
  },
  weeklyDays: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayContainer: {
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 12,
    color: "#8B9DC3",
    marginBottom: 8,
  },
  dayIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(139, 157, 195, 0.3)",
  },
  dayIndicatorTaken: {
    backgroundColor: "#4CAF50",
  },
  // Info tab styles
  infoContainer: {
    marginHorizontal: 20,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: "rgba(26, 43, 60, 0.3)",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoSupplementName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 12,
  },
  infoBenefits: {
    fontSize: 14,
    color: "#FFFFFF",
    marginBottom: 10,
    lineHeight: 20,
  },
  infoDetails: {
    flexDirection: "row",
    marginBottom: 5,
  },
  infoDetailLabel: {
    fontSize: 12,
    color: "#FF4500",
    fontWeight: "600",
    width: 80,
  },
  infoDetailText: {
    fontSize: 12,
    color: "#8B9DC3",
    flex: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "rgba(26, 43, 60, 0.95)",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  modalBenefits: {
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 15,
    lineHeight: 22,
  },
  modalDetails: {
    marginBottom: 10,
  },
  modalDetailLabel: {
    fontSize: 14,
    color: "#FF4500",
    fontWeight: "600",
    marginBottom: 5,
  },
  modalDetailText: {
    fontSize: 14,
    color: "#8B9DC3",
    lineHeight: 20,
  },
});