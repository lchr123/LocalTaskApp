/**
 * Unit Tests for Auth Service
 *
 * Tests authService methods for both success and error paths.
 *
 * Validates:
 * - Requirement 2.1: Successful login via Cognito
 * - Requirement 2.2: Generic login failure message (not revealing which field is wrong)
 * - Requirement 1.3: Registration via Cognito
 */

import { authService } from '../authService';

// Mock AWS Amplify Auth
jest.mock('aws-amplify/auth', () => ({
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  confirmSignUp: jest.fn(),
  resetPassword: jest.fn(),
  confirmResetPassword: jest.fn(),
  fetchAuthSession: jest.fn(),
  resendSignUpCode: jest.fn(),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock navigation ref
jest.mock('../../navigation/navigationRef', () => ({
  navigateToAuth: jest.fn(),
}));

// Mock aws-config
jest.mock('../../config/aws-config', () => ({
  TOKEN_EXPIRY_MINUTES: 60,
}));

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

const mockSignUp = signUp as jest.MockedFunction<typeof signUp>;
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockConfirmSignUp = confirmSignUp as jest.MockedFunction<typeof confirmSignUp>;
const mockResetPassword = resetPassword as jest.MockedFunction<typeof resetPassword>;
const mockConfirmResetPassword = confirmResetPassword as jest.MockedFunction<typeof confirmResetPassword>;
const mockFetchAuthSession = fetchAuthSession as jest.MockedFunction<typeof fetchAuthSession>;
const mockResendSignUpCode = resendSignUpCode as jest.MockedFunction<typeof resendSignUpCode>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('register', () => {
    it('calls Cognito signUp with correct parameters (Req 1.3)', async () => {
      mockSignUp.mockResolvedValue({
        isSignUpComplete: false,
        userId: 'test-user-id',
        nextStep: { signUpStep: 'CONFIRM_SIGN_UP' },
      } as any);

      await authService.register('test@example.com', '+8613800138000', 'Test1234!');

      expect(mockSignUp).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'Test1234!',
        options: {
          userAttributes: {
            email: 'test@example.com',
            phone_number: '+8613800138000',
          },
        },
      });
    });

    it('throws error when registration fails', async () => {
      mockSignUp.mockRejectedValue(new Error('UsernameExistsException'));

      await expect(
        authService.register('existing@example.com', '+8613800138000', 'Test1234!')
      ).rejects.toThrow('UsernameExistsException');
    });
  });

  describe('confirmRegistration', () => {
    it('calls Cognito confirmSignUp with correct parameters', async () => {
      mockConfirmSignUp.mockResolvedValue({
        isSignUpComplete: true,
        nextStep: { signUpStep: 'DONE' },
      } as any);

      await authService.confirmRegistration('test@example.com', '123456');

      expect(mockConfirmSignUp).toHaveBeenCalledWith({
        username: 'test@example.com',
        confirmationCode: '123456',
      });
    });

    it('throws error when verification code is invalid', async () => {
      mockConfirmSignUp.mockRejectedValue(new Error('CodeMismatchException'));

      await expect(
        authService.confirmRegistration('test@example.com', '000000')
      ).rejects.toThrow('CodeMismatchException');
    });
  });

  describe('resendVerificationCode', () => {
    it('calls Cognito resendSignUpCode with correct email', async () => {
      mockResendSignUpCode.mockResolvedValue({} as any);

      await authService.resendVerificationCode('test@example.com');

      expect(mockResendSignUpCode).toHaveBeenCalledWith({
        username: 'test@example.com',
      });
    });

    it('throws error when resend fails', async () => {
      mockResendSignUpCode.mockRejectedValue(new Error('LimitExceededException'));

      await expect(
        authService.resendVerificationCode('test@example.com')
      ).rejects.toThrow('LimitExceededException');
    });
  });

  describe('login (Req 2.1)', () => {
    it('returns tokens on successful login', async () => {
      mockSignIn.mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      mockFetchAuthSession.mockResolvedValue({
        tokens: {
          accessToken: { toString: () => 'mock-access-token' },
          idToken: { toString: () => 'mock-id-token' },
        },
      } as any);

      const tokens = await authService.login('test@example.com', 'Test1234!');

      expect(mockSignIn).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'Test1234!',
      });
      expect(tokens.accessToken).toBe('mock-access-token');
      expect(tokens.idToken).toBe('mock-id-token');
      expect(tokens.expiresAt).toBeGreaterThan(Date.now());
    });

    it('throws error on invalid credentials (Req 2.2 - generic error)', async () => {
      mockSignIn.mockRejectedValue(new Error('NotAuthorizedException'));

      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('NotAuthorizedException');
    });

    it('throws error when session tokens cannot be retrieved', async () => {
      mockSignIn.mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      mockFetchAuthSession.mockResolvedValue({
        tokens: undefined,
      } as any);

      await expect(
        authService.login('test@example.com', 'Test1234!')
      ).rejects.toThrow('Failed to retrieve authentication tokens after login');
    });
  });

  describe('logout', () => {
    it('calls Cognito signOut with global option', async () => {
      mockSignOut.mockResolvedValue(undefined as any);

      await authService.logout();

      expect(mockSignOut).toHaveBeenCalledWith({ global: true });
    });

    it('clears local tokens even when signOut network request fails', async () => {
      const SecureStore = require('expo-secure-store');
      mockSignOut.mockRejectedValue(new Error('NetworkError'));

      await authService.logout();

      // Should still clear tokens despite network error
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('calls Cognito resetPassword with correct email', async () => {
      mockResetPassword.mockResolvedValue({
        isPasswordReset: false,
        nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' },
      } as any);

      await authService.forgotPassword('test@example.com');

      expect(mockResetPassword).toHaveBeenCalledWith({
        username: 'test@example.com',
      });
    });

    it('throws error when email is not registered', async () => {
      mockResetPassword.mockRejectedValue(new Error('UserNotFoundException'));

      await expect(
        authService.forgotPassword('unknown@example.com')
      ).rejects.toThrow('UserNotFoundException');
    });
  });

  describe('confirmForgotPassword', () => {
    it('calls Cognito confirmResetPassword with correct parameters', async () => {
      mockConfirmResetPassword.mockResolvedValue(undefined as any);

      await authService.confirmForgotPassword('test@example.com', '123456', 'NewPass1!');

      expect(mockConfirmResetPassword).toHaveBeenCalledWith({
        username: 'test@example.com',
        confirmationCode: '123456',
        newPassword: 'NewPass1!',
      });
    });

    it('throws error when code is invalid', async () => {
      mockConfirmResetPassword.mockRejectedValue(new Error('CodeMismatchException'));

      await expect(
        authService.confirmForgotPassword('test@example.com', '000000', 'NewPass1!')
      ).rejects.toThrow('CodeMismatchException');
    });
  });

  describe('getSession', () => {
    it('returns null when no persisted tokens exist', async () => {
      const SecureStore = require('expo-secure-store');
      SecureStore.getItemAsync.mockResolvedValue(null);
      mockFetchAuthSession.mockResolvedValue({ tokens: undefined } as any);

      const session = await authService.getSession();

      expect(session).toBeNull();
    });

    it('returns persisted tokens when still valid', async () => {
      const SecureStore = require('expo-secure-store');
      const futureExpiry = Date.now() + 30 * 60 * 1000; // 30 min from now

      SecureStore.getItemAsync.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          auth_access_token: 'valid-access-token',
          auth_refresh_token: 'valid-refresh-token',
          auth_id_token: 'valid-id-token',
          auth_expires_at: String(futureExpiry),
        };
        return Promise.resolve(values[key] || null);
      });

      const session = await authService.getSession();

      expect(session).not.toBeNull();
      expect(session!.accessToken).toBe('valid-access-token');
    });

    it('attempts refresh when persisted tokens are expired', async () => {
      const SecureStore = require('expo-secure-store');
      const pastExpiry = Date.now() - 10 * 60 * 1000; // 10 min ago

      SecureStore.getItemAsync.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          auth_access_token: 'expired-access-token',
          auth_refresh_token: 'valid-refresh-token',
          auth_id_token: 'expired-id-token',
          auth_expires_at: String(pastExpiry),
        };
        return Promise.resolve(values[key] || null);
      });

      mockFetchAuthSession.mockResolvedValue({
        tokens: {
          accessToken: { toString: () => 'refreshed-access-token' },
          idToken: { toString: () => 'refreshed-id-token' },
        },
      } as any);

      const session = await authService.getSession();

      expect(session).not.toBeNull();
      expect(session!.accessToken).toBe('refreshed-access-token');
      expect(mockFetchAuthSession).toHaveBeenCalledWith({ forceRefresh: true });
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when valid session exists', async () => {
      const SecureStore = require('expo-secure-store');
      const futureExpiry = Date.now() + 30 * 60 * 1000;

      SecureStore.getItemAsync.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          auth_access_token: 'valid-token',
          auth_refresh_token: 'valid-refresh',
          auth_id_token: 'valid-id',
          auth_expires_at: String(futureExpiry),
        };
        return Promise.resolve(values[key] || null);
      });

      const result = await authService.isAuthenticated();
      expect(result).toBe(true);
    });

    it('returns false when no session exists', async () => {
      const SecureStore = require('expo-secure-store');
      SecureStore.getItemAsync.mockResolvedValue(null);
      mockFetchAuthSession.mockResolvedValue({ tokens: undefined } as any);

      const result = await authService.isAuthenticated();
      expect(result).toBe(false);
    });
  });
});
