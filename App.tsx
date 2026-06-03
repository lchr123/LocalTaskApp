/**
 * App.tsx - Application Entry Point
 *
 * Integrates all core modules:
 * - AWS Amplify initialization (Cognito auth)
 * - Auth state restoration and token lifecycle management
 * - React Native Paper theme provider (Material Design UI)
 * - Global Error Boundary (crash recovery)
 * - Network status listener (offline banner)
 * - Root navigation (Auth/Main switching)
 *
 * The navigation structure is consistent across iOS and Android
 * via React Navigation's native stack and bottom tabs.
 *
 * Requirements covered:
 * - 2.5: Maintain login state while token valid (60 min)
 * - 2.6: Auto-refresh using Refresh Token when token expires
 * - 2.7: Clear local state and redirect to login if Refresh Token fails
 * - 10.1: Bottom tab navigation with 5 entries
 * - 10.5: Consistent iOS and Android navigation
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';

import { useAppInitialization } from './src/hooks/useAppInitialization';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { NetworkStatusBar } from './src/components/common/NetworkStatusBar';
import RootNavigator from './src/navigation/RootNavigator';
import AppDialog from './src/components/common/AppDialog';

// ─── Theme Configuration ─────────────────────────────────────────────────────

/**
 * Custom theme extending Material Design 3 light theme.
 * Primary color: #2196F3 (consistent with tab navigation active color)
 */
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2196F3',
    primaryContainer: '#BBDEFB',
    secondary: '#FF9800',
    secondaryContainer: '#FFE0B2',
    error: '#D32F2F',
    errorContainer: '#FFCDD2',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
  },
  roundness: 8,
};

// ─── App Component ───────────────────────────────────────────────────────────

export default function App() {
  // Initialize app: configure AWS Amplify, restore auth state from persisted tokens.
  // This handles the full token lifecycle:
  // - Valid token → isAuthenticated=true → user sees main app (Req 2.5)
  // - Token expired → attempt refresh (Req 2.6)
  // - Refresh fails → isAuthenticated=false → user sees login (Req 2.7)
  useAppInitialization();

  return (
    <PaperProvider theme={theme}>
      <ErrorBoundary>
        <RootNavigator />
        <AppDialog />
        <NetworkStatusBar />
        <StatusBar style="auto" />
      </ErrorBoundary>
    </PaperProvider>
  );
}
