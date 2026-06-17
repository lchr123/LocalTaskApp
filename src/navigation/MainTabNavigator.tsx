/**
 * Main Tab Navigator
 *
 * Bottom tab navigation with 5 tabs:
 * - 首页 (Home)
 * - 任务列表 (Tasks) - uses TaskStackNavigator
 * - 发布任务 (Post)
 * - 消息 (Chat) - uses ChatStackNavigator
 * - 个人中心 (Profile)
 *
 * Active tab is visually highlighted with a distinct color.
 * Uses native animations for smooth transitions (< 300ms).
 *
 * Requirements covered:
 * - 10.1: Bottom navigation with 5 entries, active tab highlighted
 * - 10.2: Tab switching completes within 300ms
 * - 10.5: Consistent navigation on iOS and Android
 */

import React, { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import CreateTaskScreen from '../screens/task/CreateTaskScreen';
import HomeStackNavigator from './HomeStackNavigator';
import TaskStackNavigator from './TaskStackNavigator';
import ChatStackNavigator from './ChatStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';
import { useAuthStore } from '../stores/authStore';
import { useBadgeStore } from '../stores/badgeStore';

// ─── Navigation Types ────────────────────────────────────────────────────────

export type MainTabParamList = {
  Home: undefined;
  Tasks: undefined;
  Post: undefined;
  Chat: undefined;
  Profile: undefined;
};

// ─── Tab Navigator ───────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Tab Icon Mapping ────────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof MainTabParamList, { focused: IoniconsName; unfocused: IoniconsName }> = {
  Home: { focused: 'home', unfocused: 'home-outline' },
  Tasks: { focused: 'list', unfocused: 'list-outline' },
  Post: { focused: 'add-circle', unfocused: 'add-circle-outline' },
  Chat: { focused: 'chatbubbles', unfocused: 'chatbubbles-outline' },
  Profile: { focused: 'person', unfocused: 'person-outline' },
};

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTIVE_COLOR = '#2196F3';
const INACTIVE_COLOR = '#8E8E93';

// ─── Component ───────────────────────────────────────────────────────────────

export default function MainTabNavigator() {
  const { isAuthenticated, tokens } = useAuthStore();
  const { pendingIntentCount, hasUnreadMessages, refreshBadges } = useBadgeStore();

  useEffect(() => {
    if (isAuthenticated && tokens) {
      refreshBadges();
      const interval = setInterval(refreshBadges, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, tokens, refreshBadges]);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.unfocused;
          const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
          return (
            <Ionicons
              name={iconName}
              size={size}
              color={color}
              accessibilityLabel={`${route.name} tab icon`}
            />
          );
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        // Disable lazy loading for faster tab switching (< 300ms)
        lazy: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: '首页',
          tabBarAccessibilityLabel: '首页',
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TaskStackNavigator}
        options={{
          tabBarLabel: '任务',
          tabBarAccessibilityLabel: '任务列表',
          tabBarBadge: pendingIntentCount > 0 ? pendingIntentCount : undefined,
        }}
      />
      <Tab.Screen
        name="Post"
        component={CreateTaskScreen}
        options={{
          tabBarLabel: '发布',
          tabBarAccessibilityLabel: '发布任务',
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStackNavigator}
        options={{
          tabBarLabel: '消息',
          tabBarAccessibilityLabel: '消息',
          tabBarBadge: hasUnreadMessages ? '' : undefined,
          tabBarBadgeStyle: hasUnreadMessages ? { backgroundColor: '#f44336', minWidth: 10, maxHeight: 10, borderRadius: 5, top: 2 } : undefined,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: '我的',
          tabBarAccessibilityLabel: '个人中心',
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 6,
    height: Platform.OS === 'ios' ? 88 : 72,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
