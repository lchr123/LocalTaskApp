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

export type HomeStackParamList = {
  TaskList: undefined;
  TaskDetail: { taskId: string };
  IntentList: { taskId: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

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
        component={TaskListScreen}
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
    </Stack.Navigator>
  );
}
