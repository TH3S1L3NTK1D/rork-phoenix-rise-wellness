export const TABS_ROUTES = {
  index: "/(tabs)",
  "meal-prep": "/(tabs)/meal-prep",
  addiction: "/(tabs)/addiction",
  supplements: "/(tabs)/supplements",
  goals: "/(tabs)/goals",
  journal: "/(tabs)/journal",
  coach: "/(tabs)/coach",
  routines: "/(tabs)/routines",
  insights: "/(tabs)/insights",
  analytics: "/(tabs)/analytics",

  meditation: "/(tabs)/meditation",
  settings: "/(tabs)/settings",
  "test-android": "/(tabs)/test-android",
} as const;

export type TabRouteKey = keyof typeof TABS_ROUTES;
