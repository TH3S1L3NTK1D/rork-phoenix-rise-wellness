import { Tabs } from "expo-router";
import { Home, UtensilsCrossed, Plus, MoreHorizontal, TrendingUp } from "lucide-react-native";
import React, { memo, useCallback, useState } from "react";
import { Platform, StyleSheet, Text, Pressable, View, Alert, AlertButton } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const CustomTabBar = memo(function CustomTabBar({ state, descriptors, navigation }: any) {
  const navigateToRoute = useCallback(async (routeName: string) => {
    try {
      navigation.navigate(routeName);
      if (Platform.OS !== "web") {
        requestAnimationFrame(async () => {
          try {
            await Haptics.selectionAsync();
          } catch (e) {
            console.warn("[Haptics] selection failed", e);
          }
        });
      }
    } catch (e) {
      console.warn("[Tabs] navigate failed", e);
    }
  }, [navigation]);

  const openMenu = useCallback(
    async (title: string, message: string, options: { label: string; route: string }[]) => {
      const buttons: AlertButton[] = options.map((option) => ({
        text: option.label,
        onPress: () => navigateToRoute(option.route),
      }));
      buttons.push({ text: "Cancel", style: "cancel" });
      try {
        Alert.alert(title, message, buttons);
      } catch (e) {
        console.warn("[Tabs] Alert failed", e);
        if (Platform.OS === "web") {
          const first = options[0];
          if (first) navigateToRoute(first.route);
        }
      }
    },
    [navigateToRoute]
  );

  const showTrackMenu = useCallback(
    () =>
      openMenu("Track", "What would you like to track?", [
        { label: "Meals", route: "meal-prep" },
        { label: "Supplements", route: "supplements" },
        { label: "Breaking Chains", route: "addiction" },
      ]),
    [openMenu]
  );

  const showProgressMenu = useCallback(
    () =>
      openMenu("Progress", "What would you like to view?", [
        { label: "Goals", route: "goals" },
        { label: "Insights", route: "insights" },
        { label: "Analytics", route: "analytics" },
      ]),
    [openMenu]
  );

  const showMoreMenu = useCallback(
    () =>
      openMenu("More", "What would you like to access?", [
        { label: "Journal", route: "journal" },
        { label: "Coach", route: "coach" },
        { label: "Vision Board", route: "vision" },
        { label: "Routines", route: "routines" },
        { label: "Meditation", route: "meditation" },
        { label: "Settings", route: "settings" },
      ]),
    [openMenu]
  );

  const showQuickActions = useCallback(async () => {
    openMenu("Quick Actions", "What would you like to do?", [
      { label: "Log Meal", route: "meal-prep" },
      { label: "Track Day", route: "goals" },
      { label: "Journal", route: "journal" },
      { label: "Add Goal", route: "goals" },
    ]);
  }, [openMenu]);

  const currentRoute: string = state.routes[state.index]?.name ?? "index";

  return (
    <LinearGradient colors={["#1A2B3C", "#003366"]} style={styles.tabBar}>
      <Pressable
        testID="tab-home"
        accessibilityRole="button"
        style={styles.tabItem}
        onPressIn={() => console.log("[Tab] home pressIn")}
        onPress={() => navigateToRoute("index")}
        android_ripple={{ color: "rgba(255,69,0,0.15)", borderless: false }}
      >
        <Home size={28} color={currentRoute === "index" ? "#FF4500" : "#8aa"} />
        <Text style={[styles.tabLabel, { color: currentRoute === "index" ? "#FF4500" : "#8aa" }]}>Home</Text>
      </Pressable>

      <Pressable
        testID="tab-track"
        accessibilityRole="button"
        style={styles.tabItem}
        onPressIn={() => console.log("[Tab] track pressIn")}
        onPress={showTrackMenu}
        android_ripple={{ color: "rgba(255,69,0,0.15)", borderless: false }}
      >
        <UtensilsCrossed
          size={28}
          color={["meal-prep", "supplements", "addiction"].includes(currentRoute) ? "#FF4500" : "#8aa"}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: ["meal-prep", "supplements", "addiction"].includes(currentRoute) ? "#FF4500" : "#8aa" },
          ]}
        >
          Track
        </Text>
      </Pressable>

      <Pressable
        testID="tab-quick"
        accessibilityRole="button"
        style={styles.centerButton}
        onPressIn={() => console.log("[Tab] quick pressIn")}
        onPress={showQuickActions}
        android_ripple={{ color: "rgba(255,69,0,0.2)", borderless: true }}
      >
        <LinearGradient colors={["#FF4500", "#FF6B35"]} style={styles.centerButtonGradient}>
          <Plus size={28} color="white" />
        </LinearGradient>
      </Pressable>

      <Pressable
        testID="tab-progress"
        accessibilityRole="button"
        style={styles.tabItem}
        onPressIn={() => console.log("[Tab] progress pressIn")}
        onPress={showProgressMenu}
        android_ripple={{ color: "rgba(255,69,0,0.15)", borderless: false }}
      >
        <TrendingUp
          size={28}
          color={["goals", "insights", "analytics"].includes(currentRoute) ? "#FF4500" : "#8aa"}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: ["goals", "insights", "analytics"].includes(currentRoute) ? "#FF4500" : "#8aa" },
          ]}
        >
          Progress
        </Text>
      </Pressable>

      <Pressable
        testID="tab-more"
        accessibilityRole="button"
        style={styles.tabItem}
        onPressIn={() => console.log("[Tab] more pressIn")}
        onPress={showMoreMenu}
        android_ripple={{ color: "rgba(255,69,0,0.15)", borderless: false }}
      >
        <MoreHorizontal
          size={28}
          color={["journal", "coach", "vision", "routines", "meditation", "settings"].includes(currentRoute) ? "#FF4500" : "#8aa"}
        />
        <Text
          style={[
            styles.tabLabel,
            {
              color: ["journal", "coach", "vision", "routines", "meditation", "settings"].includes(currentRoute)
                ? "#FF4500"
                : "#8aa",
            },
          ]}
        >
          More
        </Text>
      </Pressable>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    height: Platform.OS === "ios" ? 90 : 65,
    paddingBottom: Platform.OS === "ios" ? 25 : 8,
    paddingTop: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  centerButton: {
    position: "relative",
    bottom: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  centerButtonGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF4500",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="meal-prep" />
      <Tabs.Screen name="addiction" />
      <Tabs.Screen name="supplements" />
      <Tabs.Screen name="goals" />
      <Tabs.Screen name="journal" />
      <Tabs.Screen name="coach" />
      <Tabs.Screen name="routines" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="vision" />
      <Tabs.Screen name="meditation" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="test-android" />
    </Tabs>
  );
}
