/**
 * Post Stack Navigator
 *
 * Stack navigation for the "发布" tab:
 * CategoryPicker → CreateTask
 *
 * Mirrors the Home tab's category picker pattern: the user first chooses
 * which domain (周边任务/工作 or 二手市场) they're posting to, then lands on
 * the (shared) CreateTaskScreen with that kind.
 */

import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, createNativeStackNavigator } from '@react-navigation/native-stack';
import CreateTaskScreen from '../screens/task/CreateTaskScreen';
import CategoryPickerScreen from '../components/task/CategoryPickerScreen';
import { TaskKind } from '../types/task';
import { withSafeAreaTop } from '../components/common';

export type PostStackParamList = {
  CategoryPicker: undefined;
  CreateTask: { kind: TaskKind };
};

const Stack = createNativeStackNavigator<PostStackParamList>();

type CategoryPickerNavProp = NativeStackNavigationProp<PostStackParamList, 'CategoryPicker'>;

function PostCategoryPicker() {
  const navigation = useNavigation<CategoryPickerNavProp>();

  return (
    <CategoryPickerScreen
      heading="发布 · 你想发布什么？"
      options={[
        {
          kind: 'task',
          title: '周边任务/工作',
          description: '发布跑腿、遛狗、取送等本地任务',
          icon: 'briefcase-outline',
          accentColor: '#1976D2',
          onPress: () => navigation.navigate('CreateTask', { kind: 'task' }),
        },
        {
          kind: 'marketplace',
          title: '二手市场',
          description: '发布你想出售的闲置物品',
          icon: 'shopping-outline',
          accentColor: '#E65100',
          onPress: () => navigation.navigate('CreateTask', { kind: 'marketplace' }),
        },
      ]}
    />
  );
}

// Root screen hides the native header (headerShown: false), so wrap it to
// keep its custom top bar below the Android status bar.
const PostCategoryPickerWithSafeArea = withSafeAreaTop(PostCategoryPicker);

export default function PostStackNavigator() {
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
        component={PostCategoryPickerWithSafeArea}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={({ route }) => ({
          title: route.params.kind === 'marketplace' ? '发布闲置' : '发布任务',
        })}
      />
    </Stack.Navigator>
  );
}
