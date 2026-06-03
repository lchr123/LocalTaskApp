/**
 * Profile Stack Navigator
 *
 * Stack navigation for the profile module:
 * Profile → ReviewList / MyReports
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ReviewListScreen from '../screens/review/ReviewListScreen';
import MyReportsScreen from '../screens/report/MyReportsScreen';
import HelpScreen from '../screens/profile/HelpScreen';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ReviewList: { userId: string; nickname?: string };
  MyReports: undefined;
  Help: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="ProfileMain"
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right',
        headerBackTitle: '返回',
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: '个人中心', headerShown: false }}
      />
      <Stack.Screen
        name="ReviewList"
        component={ReviewListScreen}
        options={{ title: '评价列表' }}
      />
      <Stack.Screen
        name="MyReports"
        component={MyReportsScreen}
        options={{ title: '我的举报' }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{ title: '使用帮助' }}
      />
    </Stack.Navigator>
  );
}
