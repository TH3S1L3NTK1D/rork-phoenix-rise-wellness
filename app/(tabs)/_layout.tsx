import { Tabs } from "expo-router";
import { 
  Home, 
  UtensilsCrossed, 
  Shield, 
  Pill, 
  Target, 
  BookOpen,
  Settings,
  MessageCircle,
  TrendingUp,
  Link,
  Eye,
  BarChart3,
  Brain,
  Plus,
  MoreHorizontal
} from "lucide-react-native";
import React, { useState } from "react";
import { Platform, StyleSheet, View, Text, TouchableOpacity, Alert, AlertButton } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";



function CustomTabBar({ state, descriptors, navigation }: any) {
  const navigateToRoute = async (routeName: string) => {
    if (Platform.OS !== 'web') {
      try { await Haptics.selectionAsync(); } catch (e) { console.warn('[Haptics] selection failed', e); }
    }
    navigation.navigate(routeName);
  };

  const showTrackMenu = async () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) { console.warn('[Haptics] impact light failed', e); }
    }
    
    const trackOptions = [
      { label: 'Meals', route: 'meal-prep' },
      { label: 'Supplements', route: 'supplements' },
      { label: 'Breaking Chains', route: 'addiction' },
    ];
    
    const buttons: AlertButton[] = trackOptions.map(option => ({
      text: option.label,
      onPress: () => navigateToRoute(option.route)
    }));
    
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert('Track', 'What would you like to track?', buttons);
  };

  const showProgressMenu = async () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) { console.warn('[Haptics] impact light failed', e); }
    }
    
    const progressOptions = [
      { label: 'Goals', route: 'goals' },
      { label: 'Insights', route: 'insights' },
      { label: 'Analytics', route: 'analytics' },
    ];
    
    const buttons: AlertButton[] = progressOptions.map(option => ({
      text: option.label,
      onPress: () => navigateToRoute(option.route)
    }));
    
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert('Progress', 'What would you like to view?', buttons);
  };

  const showMoreMenu = async () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) { console.warn('[Haptics] impact light failed', e); }
    }
    
    const moreOptions = [
      { label: 'Journal', route: 'journal' },
      { label: 'Coach', route: 'coach' },
      { label: 'Vision Board', route: 'vision' },
      { label: 'Routines', route: 'routines' },
      { label: 'Meditation', route: 'meditation' },
      { label: 'Settings', route: 'settings' },
    ];
    
    const buttons: AlertButton[] = moreOptions.map(option => ({
      text: option.label,
      onPress: () => navigateToRoute(option.route)
    }));
    
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert('More', 'What would you like to access?', buttons);
  };

  const showQuickActions = async () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) { console.warn('[Haptics] impact medium failed', e); }
    }
    
    const quickOptions = [
      { label: 'Log Meal', route: 'meal-prep' },
      { label: 'Track Day', route: 'goals' },
      { label: 'Journal', route: 'journal' },
      { label: 'Add Goal', route: 'goals' },
    ];
    
    const buttons: AlertButton[] = quickOptions.map(option => ({
      text: option.label,
      onPress: () => navigateToRoute(option.route)
    }));
    
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert('Quick Actions', 'What would you like to do?', buttons);
  };





  const currentRoute = state.routes[state.index].name;

  return (
    <LinearGradient
      colors={["#1A2B3C", "#003366"]}
      style={styles.tabBar}
    >
        {/* Home */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('index')}
        >
          <Home 
            size={28} 
            color={currentRoute === 'index' ? '#FF4500' : '#8aa'} 
          />
          <Text style={[styles.tabLabel, { color: currentRoute === 'index' ? '#FF4500' : '#8aa' }]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* Track */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={showTrackMenu}
        >
          <UtensilsCrossed 
            size={28} 
            color={['meal-prep', 'supplements', 'addiction'].includes(currentRoute) ? '#FF4500' : '#8aa'} 
          />
          <Text style={[styles.tabLabel, { color: ['meal-prep', 'supplements', 'addiction'].includes(currentRoute) ? '#FF4500' : '#8aa' }]}>
            Track
          </Text>
        </TouchableOpacity>

        {/* Quick Actions (Center) */}
        <TouchableOpacity
          style={styles.centerButton}
          onPress={showQuickActions}
        >
          <LinearGradient
            colors={['#FF4500', '#FF6B35']}
            style={styles.centerButtonGradient}
          >
            <Plus size={28} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Progress */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={showProgressMenu}
        >
          <TrendingUp 
            size={28} 
            color={['goals', 'insights', 'analytics'].includes(currentRoute) ? '#FF4500' : '#8aa'} 
          />
          <Text style={[styles.tabLabel, { color: ['goals', 'insights', 'analytics'].includes(currentRoute) ? '#FF4500' : '#8aa' }]}>
            Progress
          </Text>
        </TouchableOpacity>

        {/* More */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={showMoreMenu}
        >
          <MoreHorizontal 
            size={28} 
            color={['journal', 'coach', 'vision', 'routines', 'meditation', 'settings'].includes(currentRoute) ? '#FF4500' : '#8aa'} 
          />
          <Text style={[styles.tabLabel, { color: ['journal', 'coach', 'vision', 'routines', 'meditation', 'settings'].includes(currentRoute) ? '#FF4500' : '#8aa' }]}>
            More
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 90 : 65,
    paddingBottom: Platform.OS === 'ios' ? 25 : 8,
    paddingTop: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  centerButton: {
    position: 'relative',
    bottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4500',
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