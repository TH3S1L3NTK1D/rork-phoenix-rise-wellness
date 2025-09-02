import { Tabs, router } from "expo-router";
import { TABS_ROUTES, TabRouteKey } from "@/constants/routes";
import { Home, UtensilsCrossed, Plus, MoreHorizontal, TrendingUp, ChevronRight } from "lucide-react-native";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { Dimensions, Platform, StyleSheet, Text, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 90 : 65;

interface PanelKindMap {
  track: true;
  progress: true;
  more: true;
  quick: true;
}

type PanelKind = keyof PanelKindMap;

type Measured = { x: number; y: number; width: number; height: number };

const CustomTabBar = memo(function CustomTabBar({ state }: any) {
  const [openPanel, setOpenPanel] = useState<null | PanelKind>(null);
  const [panelAnchor, setPanelAnchor] = useState<Measured | null>(null);

  const triggerRefs = {
    track: useRef<View | null>(null),
    progress: useRef<View | null>(null),
    more: useRef<View | null>(null),
    quick: useRef<View | null>(null),
  } as const;

  const measureTrigger = useCallback((kind: PanelKind) => {
    try {
      const ref = triggerRefs[kind].current;
      if (ref && typeof (ref as any).measureInWindow === 'function') {
        (ref as any).measureInWindow((x: number, y: number, width: number, height: number) => {
          setPanelAnchor({ x, y, width, height });
        });
      }
    } catch (e) {
      console.warn('[Tab] measureInWindow failed', e);
    }
  }, []);

  const togglePanel = useCallback((kind: PanelKind) => {
    setOpenPanel((prev) => {
      const opening = prev !== kind;
      const next = opening ? kind : null;
      requestAnimationFrame(() => measureTrigger(kind));
      if (opening && Platform.OS !== 'web') {
        requestAnimationFrame(async () => {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch (e) {
            console.warn('[Haptics] open panel failed', e);
          }
        });
      }
      return next;
    });
  }, [measureTrigger]);

  const navigateToRoute = useCallback(async (routeName: TabRouteKey) => {
    try {
      router.replace(TABS_ROUTES[routeName]);
      setOpenPanel(null);
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
  }, []);

  const trackOptions = useMemo(
    () => [
      { label: "Meals", route: "meal-prep" as TabRouteKey },
      { label: "Supplements", route: "supplements" as TabRouteKey },
      { label: "Breaking Chains", route: "addiction" as TabRouteKey },
    ],
    []
  );

  const progressOptions = useMemo(
    () => [
      { label: "Goals", route: "goals" as TabRouteKey },
      { label: "Insights", route: "insights" as TabRouteKey },
      { label: "Analytics", route: "analytics" as TabRouteKey },
    ],
    []
  );

  const moreOptions = useMemo(
    () => [
      { label: "Journal", route: "journal" as TabRouteKey },
      { label: "Coach", route: "coach" as TabRouteKey },
      { label: "Vision Board", route: "vision" as TabRouteKey },
      { label: "Routines", route: "routines" as TabRouteKey },
      { label: "Meditation", route: "meditation" as TabRouteKey },
      { label: "Settings", route: "settings" as TabRouteKey },
    ],
    []
  );

  const quickOptions = useMemo(
    () => [
      { label: "Log Meal", route: "meal-prep" as TabRouteKey },
      { label: "Track Day", route: "goals" as TabRouteKey },
      { label: "Journal", route: "journal" as TabRouteKey },
      { label: "Add Goal", route: "goals" as TabRouteKey },
    ],
    []
  );

  const currentRoute: string = state.routes[state.index]?.name ?? "index";

  return (
    <>
      {openPanel && (
        <Pressable
          testID="tabbar-overlay"
          style={[StyleSheet.absoluteFill, styles.overlay]}
          onPress={() => {
            console.log("[Tab] overlay press");
            setOpenPanel(null);
          }}
          pointerEvents="auto"
        >
          {(() => {
            const { height: winH, width: winW } = Dimensions.get('window');
            const anchor = panelAnchor;
            const panelWidth = Math.min(winW - 24, 360);
            const anchorCenterX = anchor ? anchor.x + anchor.width / 2 : winW / 2;
            const left = Math.max(12, Math.min(anchorCenterX - panelWidth / 2, winW - panelWidth - 12));
            const anchorTop = anchor ? anchor.y : winH - TAB_BAR_HEIGHT;
            const preferredTop = anchorTop - 12 - 180;
            const top = Math.max(12, Math.min(preferredTop, winH - TAB_BAR_HEIGHT - 200));
            return (
              <View
                pointerEvents="box-none"
                style={[
                  styles.panelContainer,
                  {
                    top,
                    left,
                    width: panelWidth,
                  },
                ]}
              >
                {openPanel === "track" && (
                  <DropdownPanel title="Track" options={trackOptions} onSelect={navigateToRoute} />
                )}
                {openPanel === "progress" && (
                  <DropdownPanel title="Progress" options={progressOptions} onSelect={navigateToRoute} />
                )}
                {openPanel === "more" && (
                  <DropdownPanel title="More" options={moreOptions} onSelect={navigateToRoute} />
                )}
                {openPanel === "quick" && (
                  <DropdownPanel title="Quick Actions" options={quickOptions} onSelect={navigateToRoute} />
                )}
              </View>
            );
          })()}
        </Pressable>
      )}

      <LinearGradient colors={["#1A2B3C", "#003366"]} style={styles.tabBar}>
        <Pressable
          testID="tab-home"
          accessibilityRole="button"
          style={styles.tabItem}
          onPressIn={() => {
            console.log("[Tab] home pressIn");
            if (Platform.OS === 'android') navigateToRoute("index");
          }}
          onPress={() => {
            if (Platform.OS !== 'android') navigateToRoute("index");
          }}
          android_ripple={{ color: "rgba(255,69,0,0.15)", borderless: false }}
        >
          <Home size={28} color={currentRoute === "index" ? "#FF4500" : "#8aa"} />
          <Text style={[styles.tabLabel, { color: currentRoute === "index" ? "#FF4500" : "#8aa" }]}>Home</Text>
        </Pressable>

        <Pressable
          testID="tab-track"
          accessibilityRole="button"
          style={styles.tabItem}
          onPressIn={() => {
            console.log("[Tab] track pressIn");
            if (Platform.OS === 'android') togglePanel('track');
          }}
          onPress={() => {
            if (Platform.OS !== 'android') togglePanel('track');
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          android_ripple={{ color: "rgba(255,69,0,0.15)", borderless: false }}
        >
          <View ref={triggerRefs.track} collapsable={false} onLayout={() => measureTrigger('track')}>
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
          </View>
        </Pressable>

        <Pressable
          testID="tab-quick"
          accessibilityRole="button"
          style={styles.centerButton}
          onPressIn={() => {
            console.log("[Tab] quick pressIn");
            if (Platform.OS === 'android') togglePanel('quick');
          }}
          onPress={() => {
            if (Platform.OS !== 'android') togglePanel('quick');
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          android_ripple={{ color: "rgba(255,69,0,0.2)", borderless: true }}
        >
          <View ref={triggerRefs.quick} collapsable={false} onLayout={() => measureTrigger('quick')}>
            <MemoizedCenterButton />
          </View>
        </Pressable>

        <Pressable
          testID="tab-progress"
          accessibilityRole="button"
          style={styles.tabItem}
          onPressIn={() => {
            console.log("[Tab] progress pressIn");
            if (Platform.OS === 'android') togglePanel('progress');
          }}
          onPress={() => {
            if (Platform.OS !== 'android') togglePanel('progress');
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          android_ripple={{ color: "rgba(255,69,0,0.15)", borderless: false }}
        >
          <View ref={triggerRefs.progress} collapsable={false} onLayout={() => measureTrigger('progress')}>
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
          </View>
        </Pressable>

        <Pressable
          testID="tab-more"
          accessibilityRole="button"
          style={styles.tabItem}
          onPressIn={() => {
            console.log("[Tab] more pressIn");
            if (Platform.OS === 'android') togglePanel('more');
          }}
          onPress={() => {
            if (Platform.OS !== 'android') togglePanel('more');
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          android_ripple={{ color: "rgba(255,69,0,0.15)", borderless: false }}
        >
          <View ref={triggerRefs.more} collapsable={false} onLayout={() => measureTrigger('more')}>
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
          </View>
        </Pressable>
      </LinearGradient>
    </>
  );
});

const MemoizedCenterButton = memo(function MemoizedCenterButton() {
  return (
    <LinearGradient colors={["#FF4500", "#FF6B35"]} style={styles.centerButtonGradient}>
      <Plus size={28} color="white" />
    </LinearGradient>
  );
});

interface DropdownOption { label: string; route: TabRouteKey }

const DropdownPanel = memo(function DropdownPanel({
  title,
  options,
  onSelect,
}: {
  title: string;
  options: DropdownOption[];
  onSelect: (route: TabRouteKey) => void;
}) {
  return (
    <View testID={`dropdown-${title}`} style={styles.panel} pointerEvents="auto">
      <Text style={styles.panelTitle}>{title}</Text>
      {options.map((opt) => (
        <Pressable
          key={opt.label}
          style={styles.panelItem}
          onPress={() => onSelect(opt.route)}
          onPressIn={Platform.OS === 'android' ? () => onSelect(opt.route) : undefined}
          testID={`dropdown-item-${opt.label}`}
        >
          <Text style={styles.panelItemText}>{opt.label}</Text>
          <ChevronRight size={18} color="#334" />
        </Pressable>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    height: TAB_BAR_HEIGHT,
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
  overlay: {
    zIndex: 1000,
    backgroundColor: Platform.OS === 'android' ? 'rgba(0,0,0,0.1)' : 'transparent',
    elevation: 50,
  },
  panelContainer: {
    position: 'absolute',
    zIndex: 1100,
    paddingHorizontal: 0,
    paddingBottom: 0,
    elevation: 60,
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    elevation: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334',
    paddingHorizontal: 8,
    paddingVertical: 4,
    opacity: 0.7,
  },
  panelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  panelItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#122',
  },
});

export const unstable_settings = { initialRouteName: 'index' };

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
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
