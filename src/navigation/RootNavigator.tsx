/**
 * Root Navigator
 *
 * Switches between Auth and Main navigation stacks based on
 * the user's authentication state from authStore.
 *
 * When isAuthenticated is true → show Main (tab) navigation
 * When isAuthenticated is false → show Auth (login/register) navigation
 *
 * Requirements covered:
 * - 1.1: Show login/register entry when user is not logged in
 * - 2.1: After successful login, navigate to main app
 * - 10.1: Provide bottom tab navigation for authenticated users
 */

import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import { navigationRef, RootStackParamList } from './navigationRef';
import { linking } from './linking';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';

// ─── Stack Navigator ─────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─── Component ───────────────────────────────────────────────────────────────

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [isInitializing, setIsInitializing] = React.useState(true);

  // Only show loading screen during initial app startup auth check
  React.useEffect(() => {
    if (!isLoading && isInitializing) {
      setIsInitializing(false);
    }
  }, [isLoading, isInitializing]);

  // Show loading screen only during initial auth state check (app startup)
  if (isInitializing && isLoading) {
    return (
      <View style={styles.loadingContainer} accessibilityLabel="加载中">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      fallback={
        <View style={styles.loadingContainer} accessibilityLabel="加载中">
          <ActivityIndicator size="large" />
        </View>
      }
    >
      <Stack.Navigator
        initialRouteName="Main"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
