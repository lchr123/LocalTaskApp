/**
 * Home Stack Navigator
 *
 * Stack navigation for the home/task hall module:
 * TaskList → TaskDetail → IntentList
 */

import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, createNativeStackNavigator } from '@react-navigation/native-stack';
import TaskListScreen from '../screens/task/TaskListScreen';
import TaskDetailScreen from '../screens/task/TaskDetailScreen';
import IntentListScreen from '../screens/task/IntentListScreen';
import CreateReportScreen from '../screens/report/CreateReportScreen';
import HelpScreen from '../screens/profile/HelpScreen';
import CategoryPickerScreen from '../components/task/CategoryPickerScreen';
import { TaskKind } from '../types/task';
import { withSafeAreaTop } from '../components/common';

export type HomeStackParamList = {
  CategoryPicker: undefined;
  TaskList: { kind: TaskKind };
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

type CategoryPickerNavProp = NativeStackNavigationProp<HomeStackParamList, 'CategoryPicker'>;

/**
 * Root screen of the Home tab: choose between 周边任务/工作 and 二手市场
 * before entering the (shared) task list.
 */
function HomeCategoryPicker() {
  const navigation = useNavigation<CategoryPickerNavProp>();

  return (
    <CategoryPickerScreen
      heading="首页 · 你想找什么？"
      options={[
        {
          kind: 'task',
          title: '周边任务/工作',
          description: '发布或接取跑腿、遛狗、取送等本地任务',
          icon: 'briefcase-outline',
          accentColor: '#1976D2',
          onPress: () => navigation.navigate('TaskList', { kind: 'task' }),
        },
        {
          kind: 'marketplace',
          title: '二手市场',
          description: '买卖身边的闲置物品',
          icon: 'shopping-outline',
          accentColor: '#E65100',
          onPress: () => navigation.navigate('TaskList', { kind: 'marketplace' }),
        },
      ]}
    />
  );
}

// Root screen hides the native header (headerShown: false), so wrap it to
// keep its custom top bar below the Android status bar.
const HomeCategoryPickerWithSafeArea = withSafeAreaTop(HomeCategoryPicker);

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="CategoryPicker"
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right',
        headerBackTitle: '返回',
      }}
    >
      <Stack.Screen
        name="CategoryPicker"
        component={HomeCategoryPickerWithSafeArea}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskList"
        component={TaskListScreen}
        options={({ route }) => ({
          title: route.params.kind === 'marketplace' ? '二手市场' : '任务大厅',
        })}
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
