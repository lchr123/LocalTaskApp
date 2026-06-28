/**
 * Profile Stack Navigator
 *
 * Stack navigation for the profile module:
 * Profile → ReviewList / MyReports
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ReviewListScreen from '../screens/review/ReviewListScreen';
import MyReportsScreen from '../screens/report/MyReportsScreen';
import HelpScreen from '../screens/profile/HelpScreen';
import { withSafeAreaTop } from '../components/common';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  ReviewList: { userId: string; nickname?: string };
  MyReports: undefined;
  Help: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

// Root screen hides the native header (headerShown: false), so wrap it to
// keep its content below the Android status bar.
const ProfileWithSafeArea = withSafeAreaTop(ProfileScreen);

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
        component={ProfileWithSafeArea}
        options={{ title: '个人中心', headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: '编辑个人资料' }}
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
