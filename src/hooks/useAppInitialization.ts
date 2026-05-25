/**
 * useAppInitialization Hook
 *
 * Handles app startup initialization flow:
 * 1. Configures AWS Amplify
 * 2. Checks for stored token validity
 * 3. Valid token → sets isAuthenticated=true → user sees main app
 * 4. Token expired → attempts refresh using Refresh Token
 * 5. Refresh fails → clears auth state → user sees login screen
 *
 * Requirements covered:
 * - 2.5: Maintain login state while token valid (60 min)
 * - 2.6: Auto-refresh using Refresh Token when token expires
 * - 2.7: Clear local state and redirect to login if Refresh Token fails
 */

import { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { awsConfig, DEV_MOCK_AUTH } from '../config/aws-config';
import { useAuthStore } from '../stores/authStore';

/**
 * Configure AWS Amplify on app startup.
 * Skipped in mock mode since no real Cognito is available.
 */
function configureAmplify(): void {
  if (!DEV_MOCK_AUTH) {
    Amplify.configure(awsConfig);
  }
}

/**
 * Hook return type
 */
interface AppInitializationState {
  /** Whether the app has completed initialization */
  isReady: boolean;
  /** Whether initialization encountered an error */
  hasError: boolean;
}

/**
 * useAppInitialization
 *
 * Call this hook in the root App component to handle:
 * - AWS Amplify configuration
 * - Auth state restoration from persisted tokens
 * - Automatic token refresh scheduling
 *
 * The hook delegates to authStore.initialize() which:
 * - Loads persisted tokens from SecureStore
 * - Validates token expiration
 * - Attempts refresh if token is expired
 * - Sets isAuthenticated accordingly
 * - Schedules automatic token refresh for valid sessions
 */
export function useAppInitialization(): AppInitializationState {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap(): Promise<void> {
      try {
        // Step 1: Configure AWS Amplify
        configureAmplify();

        // Step 2: Initialize auth state (check tokens, refresh if needed)
        // This handles:
        // - Valid token → isAuthenticated=true (Req 2.5)
        // - Expired token → attempt refresh (Req 2.6)
        // - Refresh failure → isAuthenticated=false (Req 2.7)
        await initialize();
      } catch {
        // Initialization failed - user will see login screen
        if (isMounted) {
          setHasError(true);
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [initialize]);

  return { isReady, hasError };
}
