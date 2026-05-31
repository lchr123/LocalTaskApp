/**
 * Auth Store (Zustand)
 *
 * Manages authentication state for the LocalTask platform.
 * Handles user session, tokens, loading states, and auth actions.
 *
 * Requirements covered:
 * - 1.3: User registration flow
 * - 1.4: Verification and auto-login
 * - 2.1: User login
 * - 2.5: Maintain login state while token valid
 * - 2.6: Auto token refresh
 * - 2.7: Clear state on refresh failure
 * - 3.1: Logout clears local auth info
 * - 3.2: Logout invalidates session
 */

import { create } from 'zustand';
import { User, AuthTokens } from '../types/auth';
import { authService, setAuthEventListeners } from '../services/authService';
import { navigateToAuth } from '../navigation/navigationRef';

/**
 * Auth store state interface
 */
interface AuthState {
  /** Current authenticated user profile */
  user: User | null;
  /** Current auth tokens (access, refresh, id) */
  tokens: AuthTokens | null;
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** Whether an auth operation is in progress */
  isLoading: boolean;
  /** Current error message, if any */
  error: string | null;

  // Actions

  /** Initialize auth state on app startup */
  initialize: () => Promise<void>;
  /** Register a new user */
  register: (identifier: string, password: string, method: 'email' | 'phone') => Promise<void>;
  /** Confirm registration with verification code */
  confirmRegistration: (identifier: string, code: string) => Promise<void>;
  /** Resend verification code */
  resendVerificationCode: (identifier: string) => Promise<void>;
  /** Login with identifier (email or phone) and password */
  login: (identifier: string, password: string) => Promise<void>;
  /** Logout current user */
  logout: () => Promise<void>;
  /** Initiate forgot password flow */
  forgotPassword: (identifier: string) => Promise<void>;
  /** Confirm forgot password with code and new password */
  confirmForgotPassword: (identifier: string, code: string, newPassword: string) => Promise<void>;
  /** Set user profile data */
  setUser: (user: User | null) => void;
  /** Clear any error state */
  clearError: () => void;
}

/**
 * Auth Store
 *
 * Central state management for authentication.
 * Uses Zustand for lightweight, TypeScript-friendly state management.
 */
export const useAuthStore = create<AuthState>((set, get) => {
  // Register auth event listeners for token lifecycle
  setAuthEventListeners({
    onTokensRefreshed: (tokens: AuthTokens) => {
      // Update store when tokens are auto-refreshed (Requirement 2.6)
      set({ tokens });
    },
    onSessionInvalid: () => {
      // Only redirect if user was previously authenticated
      const wasAuthenticated = get().isAuthenticated;
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        error: null,
      });
      if (wasAuthenticated) {
        navigateToAuth();
      }
    },
  });

  return {
    // Initial state
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    /**
     * Initialize auth state on app startup.
     * Checks for persisted tokens and restores session if valid.
     * Implements Requirement 2.5: maintain login state while token valid.
     */
    initialize: async () => {
      set({ isLoading: true, error: null });

      try {
        const tokens = await authService.initialize();

        if (tokens) {
          // Validate token by calling /users/me
          try {
            const { default: apiClient } = await import('../services/api');
            const res = await apiClient.get('/users/me');
            set({
              tokens,
              isAuthenticated: true,
              isLoading: false,
              user: res.data,
            });
          } catch {
            // Token is invalid, clear state
            set({
              tokens: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } else {
          set({
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch {
        set({
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    },

    /**
     * Register a new user.
     * Implements Requirement 1.3: create user via Cognito.
     * Supports phone or email as the registration identifier.
     */
    register: async (identifier: string, password: string, method: 'email' | 'phone') => {
      set({ isLoading: true, error: null });
      console.log('3')
      try {
        await authService.register(identifier, password, method);
        console.log('4')
        set({ isLoading: false });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : '注册失败，请稍后重试';
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    /**
     * Confirm registration with verification code.
     * Implements Requirement 1.4: correct code → complete registration.
     */
    confirmRegistration: async (identifier: string, code: string) => {
      set({ isLoading: true, error: null });

      try {
        await authService.confirmRegistration(identifier, code);
        set({ isLoading: false });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : '验证码确认失败';
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    /**
     * Resend verification code.
     */
    resendVerificationCode: async (identifier: string) => {
      set({ isLoading: true, error: null });

      try {
        await authService.resendVerificationCode(identifier);
        set({ isLoading: false });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : '发送验证码失败';
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    /**
     * Login with identifier (email or phone) and password.
     * Implements Requirement 2.1: Cognito auth → set authenticated state.
     */
    login: async (identifier: string, password: string) => {
      set({ isLoading: true, error: null });

      try {
        const tokens = await authService.login(identifier, password);
        set({
          tokens,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : '登录失败，请检查账号和密码';
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    /**
     * Logout current user.
     * Implements Requirements 3.1 and 3.2:
     * - Clear local auth info and redirect to login
     * - Invalidate current session
     */
    logout: async () => {
      set({ isLoading: true, error: null });

      try {
        await authService.logout();
      } catch {
        // Even if logout request fails, we still clear local state (Req 3.3 equivalent)
      }

      // Always clear state regardless of network result (Req 3.1)
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      navigateToAuth();
    },

    /**
     * Initiate forgot password flow.
     * Implements Requirement 2.4: send verification code to identifier.
     */
    forgotPassword: async (identifier: string) => {
      set({ isLoading: true, error: null });

      try {
        await authService.forgotPassword(identifier);
        set({ isLoading: false });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : '发送重置密码验证码失败';
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    /**
     * Confirm forgot password with code and new password.
     * Implements Requirement 2.4: verify code and set new password.
     */
    confirmForgotPassword: async (
      identifier: string,
      code: string,
      newPassword: string
    ) => {
      set({ isLoading: true, error: null });

      try {
        await authService.confirmForgotPassword(identifier, code, newPassword);
        set({ isLoading: false });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : '重置密码失败';
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    /**
     * Set user profile data (typically after fetching from API)
     */
    setUser: (user: User | null) => {
      set({ user });
    },

    /**
     * Clear any error state
     */
    clearError: () => {
      set({ error: null });
    },
  };
});
