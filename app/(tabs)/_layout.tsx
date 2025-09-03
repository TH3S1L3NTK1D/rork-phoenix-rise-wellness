import { Tabs, router } from "expo-router";
import { TABS_ROUTES, TabRouteKey } from "@/constants/routes";
import { Home, UtensilsCrossed, Plus, MoreHorizontal, TrendingUp, ChevronRight } from "lucide-react-native";
import React, { memo, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Dimensions, Platform, StyleSheet, Text, Pressable, View, LayoutChangeEvent } from "react-native";
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

class PanelErrorBoundary extends React.Component<{ children: ReactNode; onReset?: () => void }, { hasError: boolean; message?: string }> {
  constructor(props: { children: ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: (error as Error)?.message ?? 'Something went wrong' };
  }
  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.warn('[Dropdown] error boundary caught', error, info?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.panel, styles.errorBox]} testID="dropdown-error">
          <Text style={styles.panelTitle}>Issue loading menu</Text>
          <Text style={styles.errorText}>{this.state.message}</Text>
          <Pressable
            testID="dropdown-error-close"
            style={[styles.panelItem, { justifyContent: 'center' }]}
            onPress={() => {
              this.setState({ hasError: false, message: undefined });
              if (this.props.onReset) this.props.onReset();
            }}
          >
            <Text style={styles.panelItemText}>Close</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const TabBarItem = memo(function TabBarItem({
  testID,
  active,
  label,
  icon,
  onPress,
  onPressIn,
}: {
  testID: string;
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  onPressIn?: () => void;
}) {
  const color = active ? "#FF4500" : "#8aa";
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    console.log(`[TabItem ${label}] layout`, { width, height });
  }, [label]);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      style={styles.tabItem}
      onPressIn={onPressIn}
      onPress={onPress}
      android_ripple={{ color: "rgba(255,69,0,0.15)", borderless: false }}
      onLayout={handleLayout}
    >
      <View style={styles.tabItemContent}>
        {icon}
        <Text
          style={[styles.tabLabel, { color }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}, (p, n) => p.active === n.active && p.label === n.label);

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
                  <PanelErrorBoundary onReset={() => setOpenPanel(null)}>
                    <DropdownPanel title="Track" options={trackOptions} onSelect={navigateToRoute} />
                  </PanelErrorBoundary>
                )}
                {openPanel === "progress" && (
                  <PanelErrorBoundary onReset={() => setOpenPanel(null)}>
                    <DropdownPanel title="Progress" options={progressOptions} onSelect={navigateToRoute} />
                  </PanelErrorBoundary>
                )}
                {openPanel === "more" && (
                  <PanelErrorBoundary onReset={() => setOpenPanel(null)}>
                    <DropdownPanel title="More" options={moreOptions} onSelect={navigateToRoute} />
                  </PanelErrorBoundary>
                )}
                {openPanel === "quick" && (
                  <PanelErrorBoundary onReset={() => setOpenPanel(null)}>
                    <DropdownPanel title="Quick Actions" options={quickOptions} onSelect={navigateToRoute} />
                  </PanelErrorBoundary>
                )}
              </View>
            );
          })()}
        </Pressable>
      )}

      <LinearGradient colors={["#1A2B3C", "#003366"]} style={styles.tabBar}>
        <TabBarItem
          testID="tab-home"
          active={currentRoute === "index"}
          label="Home"
          icon={<Home size={28} color={currentRoute === "index" ? "#FF4500" : "#8aa"} />}
          onPressIn={useCallback(() => {
            console.log("[Tab] home pressIn");
            if (Platform.OS === 'android') navigateToRoute("index");
          }, [navigateToRoute])}
          onPress={useCallback(() => {
            if (Platform.OS !== 'android') navigateToRoute("index");
          }, [navigateToRoute])}
        />

        <TabBarItem
          testID="tab-track"
          active={["meal-prep", "supplements", "addiction"].includes(currentRoute)}
          label="Track"
          icon={
            <View ref={triggerRefs.track} collapsable={false} onLayout={() => measureTrigger('track')}>
              <UtensilsCrossed
                size={28}
                color={["meal-prep", "supplements", "addiction"].includes(currentRoute) ? "#FF4500" : "#8aa"}
              />
            </View>
          }
          onPressIn={useCallback(() => {
            console.log("[Tab] track pressIn");
            if (Platform.OS === 'android') togglePanel('track');
          }, [togglePanel])}
          onPress={useCallback(() => {
            if (Platform.OS !== 'android') togglePanel('track');
          }, [togglePanel])}
        />

        <Pressable
          testID="tab-quick"
          accessibilityRole="button"
          style={styles.centerButton}
          onPressIn={useCallback(() => {
            console.log("[Tab] quick pressIn");
            if (Platform.OS === 'android') togglePanel('quick');
          }, [togglePanel])}
          onPress={useCallback(() => {
            if (Platform.OS !== 'android') togglePanel('quick');
          }, [togglePanel])}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          android_ripple={{ color: "rgba(255,69,0,0.2)", borderless: true }}
        >
          <View ref={triggerRefs.quick} collapsable={false} onLayout={() => measureTrigger('quick')}>
            <MemoizedCenterButton />
          </View>
        </Pressable>

        <TabBarItem
          testID="tab-progress"
          active={["goals", "insights", "analytics"].includes(currentRoute)}
          label="Progress"
          icon={
            <View ref={triggerRefs.progress} collapsable={false} onLayout={() => measureTrigger('progress')}>
              <TrendingUp
                size={28}
                color={["goals", "insights", "analytics"].includes(currentRoute) ? "#FF4500" : "#8aa"}
              />
            </View>
          }
          onPressIn={useCallback(() => {
            console.log("[Tab] progress pressIn");
            if (Platform.OS === 'android') togglePanel('progress');
          }, [togglePanel])}
          onPress={useCallback(() => {
            if (Platform.OS !== 'android') togglePanel('progress');
          }, [togglePanel])}
        />

        <TabBarItem
          testID="tab-more"
          active={["journal", "coach", "routines", "meditation", "settings"].includes(currentRoute)}
          label="More"
          icon={
            <View ref={triggerRefs.more} collapsable={false} onLayout={() => measureTrigger('more')}>
              <MoreHorizontal
                size={28}
                color={["journal", "coach", "routines", "meditation", "settings"].includes(currentRoute) ? "#FF4500" : "#8aa"}
              />
            </View>
          }
          onPressIn={useCallback(() => {
            console.log("[Tab] more pressIn");
            if (Platform.OS === 'android') togglePanel('more');
          }, [togglePanel])}
          onPress={useCallback(() => {
            if (Platform.OS !== 'android') togglePanel('more');
          }, [togglePanel])}
        />
      </LinearGradient>
    </>
  );
}, (prev: any, next: any) => {
  try {
    return prev?.state?.index === next?.state?.index && prev?.state?.routes === next?.state?.routes;
  } catch (e) {
    console.warn('[Tab] memo compare failed', e);
    return false;
  }
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
          <Text style={[styles.panelItemText, opt.label === 'Settings' ? { fontSize: 12 } : null]} numberOfLines={1} ellipsizeMode="tail">{opt.label}</Text>
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
    paddingBottom: Platform.select({ ios: 25, android: 4, web: 0, default: 8 }) as number,
    paddingTop: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "space-around",
    zIndex: 1000,
    elevation: 40,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingVertical: Platform.select({ android: 4, web: 0, default: 0 }) as number,
  },
  tabItemContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
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
  errorBox: {
    borderWidth: 1,
    borderColor: '#f4c7c7',
    backgroundColor: '#fff8f8',
  },
  errorText: {
    color: '#b00020',
    paddingHorizontal: 8,
    paddingBottom: 8,
    fontSize: 12,
    fontWeight: '600',
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

      <Tabs.Screen name="meditation" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="test-android" />
    </Tabs>
  );
}
