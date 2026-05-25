/**
 * Auth Navigator
 *
 * Stack navigator for the authentication flow.
 * Contains Login, Register, VerifyCode, and ForgotPassword screens.
 *
 * Requirements covered:
 * - 1.1: Display login/register entry when user is not logged in
 * - 2.1: Login flow with Cognito auth
 * - 2.4: Forgot password flow
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import VerifyCodeScreen from '../screens/auth/VerifyCodeScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// ─── Navigation Types ────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyCode: { identifier: string; method: 'email' | 'phone' };
  ForgotPassword: undefined;
};

// ─── Stack Navigator ─────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<AuthStackParamList>();

// ─── Component ───────────────────────────────────────────────────────────────

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: '登录' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: '注册' }}
      />
      <Stack.Screen
        name="VerifyCode"
        component={VerifyCodeScreen}
        options={{ title: '验证码确认' }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: '忘记密码' }}
      />
    </Stack.Navigator>
  );
}
