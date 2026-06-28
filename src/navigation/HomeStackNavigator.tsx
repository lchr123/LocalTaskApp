/**
 * Home Stack Navigator
 *
 * Stack navigation for the home/task hall module:
 * TaskList → TaskDetail → IntentList
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TaskListScreen from '../screens/task/TaskListScreen';
import TaskDetailScreen from '../screens/task/TaskDetailScreen';
import IntentListScreen from '../screens/task/IntentListScreen';
import CreateReportScreen from '../screens/report/CreateReportScreen';
import HelpScreen from '../screens/profile/HelpScreen';
import { withSafeAreaTop } from '../components/common';

export type HomeStackParamList = {
  TaskList: undefined;
  TaskDetail: { taskId: string };
  IntentList: { taskId: string };
  CreateReport: {
    targetType: 'user' | 'task';
    targetId: string;
    targetName: string;
  };
  Help: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

// Root screen hides the native header (headerShown: false), so wrap it to
// keep its custom top bar below the Android status bar.
const TaskListWithSafeArea = withSafeAreaTop(TaskListScreen);

export default function HomeStackNavigator() {
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
        component={TaskListWithSafeArea}
        options={{ title: '任务大厅', headerShown: false }}
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
        name="CreateReport"
        component={CreateReportScreen}
        options={{ title: '举报' }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{ title: '使用帮助' }}
      />
    </Stack.Navigator>
  );
}
