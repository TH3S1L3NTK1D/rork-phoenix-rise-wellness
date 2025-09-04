import { Platform } from 'react-native';

const TABS_PREFIX = Platform.OS === 'web' ? '' : '/(tabs)';
const path = (slug?: string) => {
  if (Platform.OS === 'web') {
    return slug ? `/${slug}` : '/';
  }
  return slug ? `${TABS_PREFIX}/${slug}` : TABS_PREFIX;
};

export const TABS_ROUTES = {
  index: path(),
  home: path('home'),
  'meal-prep': path('meal-prep'),
  addiction: path('addiction'),
  supplements: path('supplements'),
  goals: path('goals'),
  journal: path('journal'),
  coach: path('coach'),
  routines: path('routines'),
  insights: path('insights'),
  analytics: path('analytics'),
  settings: path('settings'),
  'test-android': path('test-android'),
} as const;

export type TabRouteKey = keyof typeof TABS_ROUTES;
