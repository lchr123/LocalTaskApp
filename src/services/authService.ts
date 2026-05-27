/**
 * Auth Service
 *
 * Wraps AWS Amplify Auth (Cognito) operations for the LocalTask platform.
 * Handles user registration, login, logout, password reset, and session management.
 *
 * When DEV_MOCK_AUTH is true, all operations are simulated locally
 * without calling AWS Cognito (for UI testing without a backend).
 *
 * Requirements covered:
 * - 1.3: Validate and create user via Cognito, send verification code within 60s
 * - 1.4: Correct verification code → complete registration and auto-login
 * - 2.1: Correct email+password → Cognito auth → redirect to home
 * - 2.5: Maintain login state while token valid (60 min)
 * - 2.6: Auto-refresh using Refresh Token when token expires
 * - 2.7: Clear local state and redirect to login if Refresh Token fails
 * - 3.1: Clear local auth info on logout
 * - 3.2: Invalidate current session on logout
 */

import {
  signUp,
  signIn,
  signOut,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  fetchAuthSession,
  resendSignUpCode,
} from 'aws-amplify/auth';
import * as SecureStore from 'expo-secure-store';
import { AuthTokens } from '../types/auth';
import { TOKEN_EXPIRY_MINUTES, DEV_MOCK_AUTH } from '../config/aws-config';
import { Amplify } from 'aws-amplify';
import { awsConfig } from '../config/aws-config';

Amplify.configure(awsConfig);
console.log('AWS config:', awsConfig);
// ─── Mock Auth Helpers ───────────────────────────────────────────────────────

/**
 * Generate mock tokens for development mode.
 * Simulates a valid auth session without real Cognito.
 */
function generateMockTokens(): AuthTokens {
  return {
    accessToken: 'mock-access-token-' + Date.now(),
    refreshToken: 'mock-refresh-token-' + Date.now(),
    idToken: 'mock-id-token-' + Date.now(),
    expiresAt: Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000,
  };
}

/**
 * Simulate network delay (300-800ms) for realistic UX in mock mode.
 */
function mockDelay(): Promise<void> {
  const delay = 300 + Math.random() * 500;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/** In-memory store of mock registered users (for dev session only) */
const mockRegisteredUsers = new Map<string, { password: string; verified: boolean }>();

/**
 * Secure Store keys for token persistence
 */
const SECURE_STORE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  ID_TOKEN: 'auth_id_token',
  EXPIRES_AT: 'auth_expires_at',
} as const;

/**
 * Token refresh timer reference
 */
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Callback for when tokens are refreshed (used by authStore)
 */
let onTokensRefreshed: ((tokens: AuthTokens) => void) | null = null;

/**
 * Callback for when auth session becomes invalid
 */
let onSessionInvalid: (() => void) | null = null;

/**
 * Register event listeners for token lifecycle events
 */
export function setAuthEventListeners(listeners: {
  onTokensRefreshed?: (tokens: AuthTokens) => void;
  onSessionInvalid?: () => void;
}): void {
  onTokensRefreshed = listeners.onTokensRefreshed ?? null;
  onSessionInvalid = listeners.onSessionInvalid ?? null;
}

/**
 * Persist tokens to secure storage
 */
async function persistTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN, tokens.accessToken),
    SecureStore.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
    SecureStore.setItemAsync(SECURE_STORE_KEYS.ID_TOKEN, tokens.idToken),
    SecureStore.setItemAsync(SECURE_STORE_KEYS.EXPIRES_AT, String(tokens.expiresAt)),
  ]);
}

/**
 * Load tokens from secure storage
 */
async function loadPersistedTokens(): Promise<AuthTokens | null> {
  try {
    const [accessToken, refreshToken, idToken, expiresAtStr] = await Promise.all([
      SecureStore.getItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN),
      SecureStore.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN),
      SecureStore.getItemAsync(SECURE_STORE_KEYS.ID_TOKEN),
      SecureStore.getItemAsync(SECURE_STORE_KEYS.EXPIRES_AT),
    ]);

    if (!accessToken || !refreshToken || !idToken || !expiresAtStr) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      idToken,
      expiresAt: parseInt(expiresAtStr, 10),
    };
  } catch {
    return null;
  }
}

/**
 * Clear all persisted tokens from secure storage
 */
async function clearPersistedTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN),
    SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ID_TOKEN),
    SecureStore.deleteItemAsync(SECURE_STORE_KEYS.EXPIRES_AT),
  ]);
}

/**
 * Schedule automatic token refresh before expiration.
 * Refreshes 5 minutes before the token expires.
 */
function scheduleTokenRefresh(expiresAt: number): void {
  cancelTokenRefresh();

  const now = Date.now();
  const refreshBuffer = 5 * 60 * 1000; // 5 minutes before expiry
  const delay = expiresAt - now - refreshBuffer;

  if (delay <= 0) {
    // Token is already expired or about to expire, refresh immediately
    void refreshSession();
    return;
  }

  refreshTimer = setTimeout(() => {
    void refreshSession();
  }, delay);
}

/**
 * Cancel any scheduled token refresh
 */
function cancelTokenRefresh(): void {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Extract tokens from an Amplify auth session
 */
function extractTokensFromSession(session: Awaited<ReturnType<typeof fetchAuthSession>>): AuthTokens | null {
  const tokens = session.tokens;
  if (!tokens?.accessToken || !tokens?.idToken) {
    return null;
  }

  const accessToken = tokens.accessToken.toString();
  const idToken = tokens.idToken.toString();
  // Amplify manages refresh tokens internally; we store a placeholder
  // since the actual refresh is handled by fetchAuthSession({ forceRefresh: true })
  const refreshToken = 'managed-by-amplify';
  const expiresAt = Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000;

  return { accessToken, refreshToken, idToken, expiresAt };
}

/**
 * Attempt to refresh the current session.
 * Implements Requirement 2.6: auto-refresh using Refresh Token.
 * If refresh fails, implements Requirement 2.7: clear state and redirect.
 */
async function refreshSession(): Promise<AuthTokens | null> {
  try {
    const session = await fetchAuthSession({ forceRefresh: true });
    const tokens = extractTokensFromSession(session);

    if (!tokens) {
      // Refresh failed - clear everything (Requirement 2.7)
      await clearPersistedTokens();
      cancelTokenRefresh();
      onSessionInvalid?.();
      return null;
    }

    // Persist new tokens and schedule next refresh
    await persistTokens(tokens);
    scheduleTokenRefresh(tokens.expiresAt);
    onTokensRefreshed?.(tokens);

    return tokens;
  } catch {
    // Refresh Token invalid or network error (Requirement 2.7)
    await clearPersistedTokens();
    cancelTokenRefresh();
    onSessionInvalid?.();
    return null;
  }
}

/**
 * Auth Service - singleton class managing all authentication operations
 */
class AuthService {
  /**
   * Register a new user via AWS Cognito.
   * Implements Requirement 1.3: validate and create user, send verification code.
   * Supports registration by phone number OR email (user chooses one).
   *
   * @param identifier - User's email address or phone number (with +81 country code)
   * @param password - User's password (must meet security policy)
   * @param method - 'email' or 'phone' indicating which identifier is used
   */
  async register(identifier: string, password: string, method: 'email' | 'phone'): Promise<void> {
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      if (mockRegisteredUsers.has(identifier)) {
        throw new Error('User already exists');
      }
      mockRegisteredUsers.set(identifier, { password, verified: false });
      console.log(`[MOCK AUTH] Registered: ${identifier} (${method}). Verification code: 123456`);
      return;
    }
    console.log('5')
    const userAttributes: Record<string, string> = {};

    if (method === 'email') {
      userAttributes.email = identifier;
    } else {
      userAttributes.phone_number = identifier;
    }

    await signUp({
      username: identifier,
      password,
      options: {
        userAttributes,
      },
    });
  }

  /**
   * Confirm user registration with verification code.
   * Implements Requirement 1.4: correct code → complete registration.
   *
   * @param identifier - User's email or phone number (same as used during registration)
   * @param code - 6-digit verification code
   */
  async confirmRegistration(identifier: string, code: string): Promise<void> {
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      const user = mockRegisteredUsers.get(identifier);
      if (!user) {
        throw new Error('User not found');
      }
      // Accept any 6-digit code in mock mode (or specifically "123456")
      if (code !== '123456' && code.length !== 6) {
        throw new Error('Invalid verification code');
      }
      user.verified = true;
      console.log(`[MOCK AUTH] Verified: ${identifier}`);
      return;
    }

    await confirmSignUp({
      username: identifier,
      confirmationCode: code,
    });
  }

  /**
   * Resend verification code to user's email or phone.
   *
   * @param identifier - User's email or phone number
   */
  async resendVerificationCode(identifier: string): Promise<void> {
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      console.log(`[MOCK AUTH] Resent verification code to: ${identifier}. Code: 123456`);
      return;
    }

    await resendSignUpCode({
      username: identifier,
    });
  }

  /**
   * Sign in user with identifier (email or phone) and password.
   * Implements Requirement 2.1: Cognito auth → return tokens.
   *
   * @param identifier - User's email or phone number
   * @param password - User's password
   * @returns AuthTokens containing access, refresh, and id tokens
   */
  async login(identifier: string, password: string): Promise<AuthTokens> {
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      // In mock mode, accept any credentials (or check mock registry)
      const user = mockRegisteredUsers.get(identifier);
      if (user && user.password !== password) {
        throw new Error('Incorrect username or password');
      }
      // Even if user isn't in mock registry, allow login for convenience
      const tokens = generateMockTokens();
      // Skip persistTokens in mock mode - SecureStore may not work on web
      try {
        await persistTokens(tokens);
      } catch {
        // Ignore persist errors in mock mode
      }
      console.log(`[MOCK AUTH] Logged in: ${identifier}`);
      return tokens;
    }

    await signIn({
      username: identifier,
      password,
    });

    // Fetch the session to get tokens
    const session = await fetchAuthSession();
    const tokens = extractTokensFromSession(session);

    if (!tokens) {
      throw new Error('Failed to retrieve authentication tokens after login');
    }

    // Persist tokens and schedule refresh
    await persistTokens(tokens);
    scheduleTokenRefresh(tokens.expiresAt);

    return tokens;
  }

  /**
   * Sign out the current user.
   * Implements Requirements 3.1 and 3.2:
   * - Clear local auth info
   * - Invalidate current session
   *
   * Note: Even if the network request fails, local state is cleared (Req 3.3 equivalent).
   */
  async logout(): Promise<void> {
    cancelTokenRefresh();

    if (!DEV_MOCK_AUTH) {
      try {
        // signOut({ global: true }) invalidates the session server-side (Req 3.2)
        await signOut({ global: true });
      } catch {
        // Network error during logout - still clear local state (Req 3.3 equivalent)
      }
    } else {
      await mockDelay();
      console.log('[MOCK AUTH] Logged out');
    }

    // Always clear local tokens regardless of network result (Req 3.1)
    await clearPersistedTokens();
  }

  /**
   * Initiate forgot password flow - sends verification code to email or phone.
   * Implements Requirement 2.4: send 6-digit code, valid for 10 minutes.
   *
   * @param identifier - User's registered email or phone number
   */
  async forgotPassword(identifier: string): Promise<void> {
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      console.log(`[MOCK AUTH] Forgot password code sent to: ${identifier}. Code: 123456`);
      return;
    }

    await resetPassword({
      username: identifier,
    });
  }

  /**
   * Complete forgot password flow - set new password with verification code.
   * Implements Requirement 2.4: verify code and set new password.
   *
   * @param identifier - User's email or phone number
   * @param code - 6-digit verification code
   * @param newPassword - New password (must meet security policy)
   */
  async confirmForgotPassword(
    identifier: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      if (code !== '123456') {
        throw new Error('Invalid verification code');
      }
      // Update password in mock registry if user exists
      const user = mockRegisteredUsers.get(identifier);
      if (user) {
        user.password = newPassword;
      }
      console.log(`[MOCK AUTH] Password reset for: ${identifier}`);
      return;
    }

    await confirmResetPassword({
      username: identifier,
      confirmationCode: code,
      newPassword,
    });
  }

  /**
   * Get the current auth session with valid tokens.
   * Implements Requirement 2.5: maintain login state while token valid.
   * Implements Requirement 2.6: auto-refresh if token expired.
   *
   * @returns AuthTokens if session is valid, null otherwise
   */
  async getSession(): Promise<AuthTokens | null> {
    try {
      // Check persisted tokens first
      const persisted = await loadPersistedTokens();

      if (persisted && persisted.expiresAt > Date.now()) {
        // Token still valid
        return persisted;
      }

      if (DEV_MOCK_AUTH) {
        // In mock mode, if no valid persisted token, return null (user needs to login)
        if (persisted) {
          await clearPersistedTokens();
        }
        return null;
      }

      // Token expired or not found - try to get/refresh from Amplify
      const session = await fetchAuthSession({ forceRefresh: persisted !== null });
      const tokens = extractTokensFromSession(session);

      if (!tokens) {
        // No valid session
        await clearPersistedTokens();
        return null;
      }

      // Persist and schedule refresh
      await persistTokens(tokens);
      scheduleTokenRefresh(tokens.expiresAt);

      return tokens;
    } catch {
      // Session invalid - clear everything
      await clearPersistedTokens();
      return null;
    }
  }

  /**
   * Check if the user is currently authenticated.
   *
   * @returns true if a valid session exists
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  }

  /**
   * Initialize auth state on app startup.
   * Loads persisted tokens and sets up auto-refresh if valid.
   *
   * @returns AuthTokens if a valid session exists, null otherwise
   */
  async initialize(): Promise<AuthTokens | null> {
    const tokens = await this.getSession();

    if (tokens) {
      scheduleTokenRefresh(tokens.expiresAt);
    }

    return tokens;
  }
}

export const authService = new AuthService();
