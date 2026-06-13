/**
 * Auth Service
 *
 * Wraps AWS Amplify Auth (Cognito) operations for the LocalTask platform.
 * Handles user registration, login, logout, password reset, and session management.
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
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthTokens } from '../types/auth';
import { TOKEN_EXPIRY_MINUTES } from '../config/aws-config';
import { Amplify } from 'aws-amplify';
import { awsConfig } from '../config/aws-config';

Amplify.configure(awsConfig);

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
    setStorageItem(SECURE_STORE_KEYS.ACCESS_TOKEN, tokens.accessToken),
    setStorageItem(SECURE_STORE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
    setStorageItem(SECURE_STORE_KEYS.ID_TOKEN, tokens.idToken),
    setStorageItem(SECURE_STORE_KEYS.EXPIRES_AT, String(tokens.expiresAt)),
  ]);
}

/**
 * Load tokens from secure storage
 */
async function loadPersistedTokens(): Promise<AuthTokens | null> {
  try {
    const [accessToken, refreshToken, idToken, expiresAtStr] = await Promise.all([
      getStorageItem(SECURE_STORE_KEYS.ACCESS_TOKEN),
      getStorageItem(SECURE_STORE_KEYS.REFRESH_TOKEN),
      getStorageItem(SECURE_STORE_KEYS.ID_TOKEN),
      getStorageItem(SECURE_STORE_KEYS.EXPIRES_AT),
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
    deleteStorageItem(SECURE_STORE_KEYS.ACCESS_TOKEN),
    deleteStorageItem(SECURE_STORE_KEYS.REFRESH_TOKEN),
    deleteStorageItem(SECURE_STORE_KEYS.ID_TOKEN),
    deleteStorageItem(SECURE_STORE_KEYS.EXPIRES_AT),
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

async function setStorageItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function deleteStorageItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
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
  async register(identifier: string, password: string, method: 'email' | 'phone', captchaToken?: string): Promise<void> {
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
        clientMetadata: captchaToken ? { captchaToken } : undefined,
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
    console.log('[AUTH] Calling Cognito signIn with:', identifier);
    try {
      // Clear any stale Amplify session before signing in
      // Use global: true to ensure all cached tokens are purged
      try {
        await signOut({ global: true });
      } catch {
        // Ignore signOut errors - there may be no session to clear
      }

      const signInResult = await signIn({
        username: identifier,
        password,
      });
      console.log('[AUTH] signIn result:', JSON.stringify(signInResult));
    } catch (signInError) {
      console.error('[AUTH] signIn error:', signInError);
      throw signInError;
    }

    // Fetch the session to get tokens
    const session = await fetchAuthSession();
    console.log('[AUTH] fetchAuthSession result:', JSON.stringify(session));
    const tokens = extractTokensFromSession(session);
    console.log('[AUTH] extracted tokens:', tokens ? 'success' : 'null');

    if (!tokens) {
      throw new Error('Failed to retrieve authentication tokens after login');
    }

    // Persist tokens and schedule refresh
    try {
      await persistTokens(tokens);
    } catch (persistError) {
      console.warn('[AUTH] persistTokens failed (expected on web):', persistError);
      // Don't fail login just because SecureStore isn't available on web
    }
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

    try {
      // signOut({ global: true }) invalidates the session server-side (Req 3.2)
      await signOut({ global: true });
    } catch {
      // Network error during logout - still clear local state (Req 3.3 equivalent)
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
      // On web, SecureStore is not available, so skip persisted tokens
      // and rely on Amplify's built-in localStorage persistence
      let persisted: AuthTokens | null = null;
      try {
        persisted = await loadPersistedTokens();
      } catch {
        // SecureStore not available (web) - that's fine, continue
      }

      if (persisted && persisted.expiresAt > Date.now()) {
        // Token still valid from SecureStore
        return persisted;
      }

      // Try to get session from Amplify (uses localStorage on web)
      const session = await fetchAuthSession({ forceRefresh: false });
      const tokens = extractTokensFromSession(session);

      if (!tokens) {
        return null;
      }

      // Persist and schedule refresh
      try {
        await persistTokens(tokens);
      } catch {
        // SecureStore not available on web - ignore
      }
      scheduleTokenRefresh(tokens.expiresAt);

      return tokens;
    } catch {
      // Session invalid
      try { await clearPersistedTokens(); } catch {}
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
