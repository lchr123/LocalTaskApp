/**
 * Task Stack Navigator
 *
 * Stack navigation for the task module:
 * MyTasksTab → TaskDetail → IntentList / CreateReview
 *
 * Uses native stack navigator for smooth animations (< 300ms).
 *
 * Requirements covered:
 * - 10.2: Page transitions complete within 300ms
 * - 10.5: Consistent navigation structure on iOS and Android
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TaskDetailScreen from '../screens/task/TaskDetailScreen';
import IntentListScreen from '../screens/task/IntentListScreen';
import MyTasksTabScreen from '../screens/task/MyTasksTabScreen';
import CreateReviewScreen from '../screens/review/CreateReviewScreen';
import CreateReportScreen from '../screens/report/CreateReportScreen';

// ─── Navigation Types ────────────────────────────────────────────────────────

export type TaskStackParamList = {
  MyTasksTab: undefined;
  TaskDetail: { taskId: string };
  IntentList: { taskId: string };
  CreateReview: {
    taskId: string;
    revieweeId: string;
    revieweeNickname: string;
    completedAt: string;
    alreadyReviewed?: boolean;
  };
  CreateReport: {
    targetType: 'user' | 'task';
    targetId: string;
    targetName: string;
  };
};

// ─── Stack Navigator ─────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<TaskStackParamList>();

// ─── Component ───────────────────────────────────────────────────────────────

export default function TaskStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="MyTasksTab"
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right',
        headerBackTitle: '返回',
      }}
    >
      <Stack.Screen
        name="MyTasksTab"
        component={MyTasksTabScreen}
        options={{ title: '我的任务', headerShown: false }}
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
      <Stack.Screen
        name="CreateReview"
        component={CreateReviewScreen}
        options={{ title: '评价' }}
      />
      <Stack.Screen
        name="CreateReport"
        component={CreateReportScreen}
        options={{ title: '举报' }}
      />
    </Stack.Navigator>
  );
}
