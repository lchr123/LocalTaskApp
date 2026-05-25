/**
 * Task Stack Navigator
 *
 * Stack navigation for the task module:
 * TaskList → TaskDetail → IntentList
 *
 * Uses native stack navigator for smooth animations (< 300ms).
 *
 * Requirements covered:
 * - 10.2: Page transitions complete within 300ms
 * - 10.5: Consistent navigation structure on iOS and Android
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TaskListScreen from '../screens/task/TaskListScreen';
import TaskDetailScreen from '../screens/task/TaskDetailScreen';
import IntentListScreen from '../screens/task/IntentListScreen';

// ─── Navigation Types ────────────────────────────────────────────────────────

export type TaskStackParamList = {
  TaskList: undefined;
  TaskDetail: { taskId: string };
  IntentList: { taskId: string };
};

// ─── Stack Navigator ─────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<TaskStackParamList>();

// ─── Component ───────────────────────────────────────────────────────────────

export default function TaskStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="TaskList"
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right',
        headerBackTitle: '返回',
      }}
    >
      <Stack.Screen
        name="TaskList"
        component={TaskListScreen}
        options={{ title: '任务列表', headerShown: false }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ title: '任务详情' }}
      />
      <Stack.Screen
        name="IntentList"
        component={IntentListScreen}
        options={{ title: '意向列表' }}
      />
    </Stack.Navigator>
  );
}
