import React, { useCallback, useEffect, useMemo } from 'react';
import { router, usePathname } from 'expo-router';
import { Platform, Pressable, SafeAreaView, StyleSheet, Text, View, Alert } from 'react-native';
import { AlertTriangle, Home } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function NotFoundScreen(): React.JSX.Element {
  const pathname = usePathname();

  useEffect(() => {
    try {
      console.error('[RouteMismatch] Unmatched route', JSON.stringify({ pathname, platform: Platform.OS }));
    } catch (e) {
      console.error('[RouteMismatch] Unmatched route (stringify failed)', { pathname, platform: Platform.OS });
    }
  }, [pathname]);

  const label = useMemo(() => 'Go back to home', []);

  const handleGoHome = useCallback(async () => {
    try {
      console.log('[NotFound] Navigating home via router.replace');
      if (Platform.OS !== 'web') {
        try {
          await Haptics.selectionAsync();
        } catch (e) {
          console.log('[NotFound] Haptics not available or failed', e);
        }
      }
      router.replace('/');
    } catch (error) {
      console.error('[NotFound] Navigation error', error);
      if (Platform.OS === 'android') {
        Alert.alert('Navigation error', 'Could not navigate home. Please try again.');
      }
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe} testID="notFoundSafeArea">
      <View style={styles.container} testID="notFoundContainer">
        <View style={styles.iconWrap} testID="notFoundIconWrap">
          <AlertTriangle color="#FF8A65" size={64} />
        </View>
        <Text style={styles.title} testID="notFoundTitle">Page not found</Text>
        <Text style={styles.subtitle} numberOfLines={3} testID="notFoundSubtitle">
          We could not find the page {pathname}. It may have been moved or deleted.
        </Text>

        <Pressable
          onPressIn={Platform.OS === 'android' ? handleGoHome : undefined}
          onPress={Platform.OS !== 'android' ? handleGoHome : undefined}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          testID="goHomeButton"
        >
          <View style={styles.buttonContent} testID="goHomeButtonContent">
            <Home color="#0B0B0F" size={22} />
            <Text style={styles.buttonText}>{label}</Text>
          </View>
        </Pressable>

        <View style={styles.meta} testID="notFoundMeta">
          <Text style={styles.metaText}>Path: {pathname}</Text>
          <Text style={styles.metaText}>Platform: {Platform.OS}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#1A1A24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#9AA0B4',
    fontSize: 14,
    textAlign: 'center' as const,
  },
  button: {
    marginTop: 8,
    minWidth: 220,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F5F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonContent: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#0B0B0F',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  meta: {
    position: 'absolute' as const,
    bottom: 24,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  metaText: {
    color: '#5C637A',
    fontSize: 12,
  },
});
