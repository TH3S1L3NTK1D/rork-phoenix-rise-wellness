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
import { Platform, StyleSheet, View, Text, TouchableOpacity, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";



function CustomTabBar({ state, descriptors, navigation }: any) {
  const [showTrackMenu, setShowTrackMenu] = useState(false);
  const [showProgressMenu, setShowProgressMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const closeAllMenus = () => {
    setShowTrackMenu(false);
    setShowProgressMenu(false);
    setShowMoreMenu(false);
    setShowQuickActions(false);
  };

  const navigateToRoute = (routeName: string) => {
    closeAllMenus();
    navigation.navigate(routeName);
  };

  const renderSubmenu = (items: {label: string, route: string, icon: any}[], visible: boolean) => {
    if (!visible) return null;
    
    return (
      <View style={styles.submenu}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.submenuItem}
            onPress={() => navigateToRoute(item.route)}
          >
            <item.icon size={20} color="#FF4500" />
            <Text style={styles.submenuText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderQuickActions = () => {
    if (!showQuickActions) return null;
    
    return (
      <View style={styles.quickActionsContainer}>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionItem} onPress={() => navigateToRoute('meal-prep')}>
            <UtensilsCrossed size={24} color="#FF4500" />
            <Text style={styles.quickActionText}>Log Meal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionItem} onPress={() => navigateToRoute('goals')}>
            <Target size={24} color="#FF4500" />
            <Text style={styles.quickActionText}>Track Day</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionItem} onPress={() => navigateToRoute('journal')}>
            <BookOpen size={24} color="#FF4500" />
            <Text style={styles.quickActionText}>Journal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionItem} onPress={() => navigateToRoute('goals')}>
            <Plus size={24} color="#FF4500" />
            <Text style={styles.quickActionText}>Add Goal</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const trackItems = [
    { label: 'Meals', route: 'meal-prep', icon: UtensilsCrossed },
    { label: 'Supplements', route: 'supplements', icon: Pill },
    { label: 'Breaking Chains', route: 'addiction', icon: Shield },
  ];

  const progressItems = [
    { label: 'Goals', route: 'goals', icon: Target },
    { label: 'Insights', route: 'insights', icon: TrendingUp },
    { label: 'Analytics', route: 'analytics', icon: BarChart3 },
  ];

  const moreItems = [
    { label: 'Journal', route: 'journal', icon: BookOpen },
    { label: 'Coach', route: 'coach', icon: MessageCircle },
    { label: 'Vision Board', route: 'vision', icon: Eye },
    { label: 'Routines', route: 'routines', icon: Link },
    { label: 'Meditation', route: 'meditation', icon: Brain },
    { label: 'Settings', route: 'settings', icon: Settings },
  ];

  const currentRoute = state.routes[state.index].name;

  return (
    <>
      {(showTrackMenu || showProgressMenu || showMoreMenu || showQuickActions) && (
        <Pressable style={styles.overlay} onPress={closeAllMenus} />
      )}
      
      {renderSubmenu(trackItems, showTrackMenu)}
      {renderSubmenu(progressItems, showProgressMenu)}
      {renderSubmenu(moreItems, showMoreMenu)}
      {renderQuickActions()}
      
      <LinearGradient
        colors={["#1A2B3C", "#003366"]}
        style={styles.tabBar}
      >
        {/* Home */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            closeAllMenus();
            navigation.navigate('index');
          }}
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
          onPress={() => {
            closeAllMenus();
            setShowTrackMenu(true);
          }}
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
          onPress={() => {
            closeAllMenus();
            setShowQuickActions(true);
          }}
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
          onPress={() => {
            closeAllMenus();
            setShowProgressMenu(true);
          }}
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
          onPress={() => {
            closeAllMenus();
            setShowMoreMenu(true);
          }}
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
    </>
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 999,
  },
  submenu: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 65,
    left: 20,
    right: 20,
    backgroundColor: '#1A2B3C',
    borderRadius: 12,
    padding: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  submenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  submenuText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  quickActionsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 140 : 115,
    left: '50%',
    transform: [{ translateX: -80 }],
    zIndex: 1000,
  },
  quickActionsGrid: {
    width: 160,
    height: 160,
    backgroundColor: '#1A2B3C',
    borderRadius: 12,
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  quickActionItem: {
    width: '50%',
    height: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  quickActionText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
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
    </Tabs>
  );
}