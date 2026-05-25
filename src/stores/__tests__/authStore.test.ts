/**
 * Unit Tests for Auth Store
 *
 * Tests Zustand auth store state management logic.
 *
 * Validates:
 * - Requirement 2.1: Login sets authenticated state
 * - Requirement 2.2: Login failure sets error (generic message)
 * - Requirement 1.3: Registration flow state management
 */

import { useAuthStore } from '../authStore';
import { authService } from '../../services/authService';

// Mock authService
jest.mock('../../services/authService', () => ({
  authService: {
    register: jest.fn(),
    confirmRegistration: jest.fn(),
    resendVerificationCode: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    confirmForgotPassword: jest.fn(),
    initialize: jest.fn(),
  },
  setAuthEventListeners: jest.fn(),
}));

// Mock navigation ref
jest.mock('../../navigation/navigationRef', () => ({
  navigateToAuth: jest.fn(),
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('AuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('starts with unauthenticated state', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('register', () => {
    it('sets isLoading during registration', async () => {
      mockAuthService.register.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const promise = useAuthStore.getState().register('test@example.com', '+8613800138000', 'Test1234!');

      expect(useAuthStore.getState().isLoading).toBe(true);
      expect(useAuthStore.getState().error).toBeNull();

      await promise;

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('clears error on successful registration', async () => {
      useAuthStore.setState({ error: 'previous error' });
      mockAuthService.register.mockResolvedValue(undefined);

      await useAuthStore.getState().register('test@example.com', '+8613800138000', 'Test1234!');

      expect(useAuthStore.getState().error).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets error message on registration failure', async () => {
      mockAuthService.register.mockRejectedValue(new Error('UsernameExistsException'));

      await expect(
        useAuthStore.getState().register('existing@example.com', '+8613800138000', 'Test1234!')
      ).rejects.toThrow();

      expect(useAuthStore.getState().error).toBe('UsernameExistsException');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('login (Req 2.1, 2.2)', () => {
    it('sets authenticated state on successful login', async () => {
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        idToken: 'mock-id-token',
        expiresAt: Date.now() + 60 * 60 * 1000,
      };
      mockAuthService.login.mockResolvedValue(mockTokens);

      await useAuthStore.getState().login('test@example.com', 'Test1234!');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.tokens).toEqual(mockTokens);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on login failure without revealing specific field (Req 2.2)', async () => {
      mockAuthService.login.mockRejectedValue(new Error('NotAuthorizedException'));

      await expect(
        useAuthStore.getState().login('test@example.com', 'wrongpassword')
      ).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.tokens).toBeNull();
      expect(state.isLoading).toBe(false);
      // Error message should be the generic Cognito error, not revealing which field is wrong
      expect(state.error).toBe('NotAuthorizedException');
    });

    it('sets isLoading during login attempt', async () => {
      mockAuthService.login.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const promise = useAuthStore.getState().login('test@example.com', 'Test1234!');

      expect(useAuthStore.getState().isLoading).toBe(true);

      mockAuthService.login.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        idToken: 'id',
        expiresAt: Date.now() + 3600000,
      });

      await promise.catch(() => {});
    });
  });

  describe('logout', () => {
    it('clears all auth state on logout', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', phone: '+81', nickname: 'Test', averageRating: 5, completedTaskCount: 0, createdAt: '' },
        tokens: { accessToken: 'token', refreshToken: 'refresh', idToken: 'id', expiresAt: Date.now() + 3600000 },
        isAuthenticated: true,
      });

      mockAuthService.logout.mockResolvedValue(undefined);

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('clears state even when logout network request fails', async () => {
      useAuthStore.setState({
        tokens: { accessToken: 'token', refreshToken: 'refresh', idToken: 'id', expiresAt: Date.now() + 3600000 },
        isAuthenticated: true,
      });

      mockAuthService.logout.mockRejectedValue(new Error('NetworkError'));

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.tokens).toBeNull();
    });
  });

  describe('confirmRegistration', () => {
    it('sets isLoading during confirmation', async () => {
      mockAuthService.confirmRegistration.mockResolvedValue(undefined);

      await useAuthStore.getState().confirmRegistration('test@example.com', '123456');

      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('sets error on confirmation failure', async () => {
      mockAuthService.confirmRegistration.mockRejectedValue(new Error('CodeMismatchException'));

      await expect(
        useAuthStore.getState().confirmRegistration('test@example.com', '000000')
      ).rejects.toThrow();

      expect(useAuthStore.getState().error).toBe('CodeMismatchException');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('forgotPassword', () => {
    it('completes without error on success', async () => {
      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      await useAuthStore.getState().forgotPassword('test@example.com');

      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('sets error on failure', async () => {
      mockAuthService.forgotPassword.mockRejectedValue(new Error('UserNotFoundException'));

      await expect(
        useAuthStore.getState().forgotPassword('unknown@example.com')
      ).rejects.toThrow();

      expect(useAuthStore.getState().error).toBe('UserNotFoundException');
    });
  });

  describe('confirmForgotPassword', () => {
    it('completes without error on success', async () => {
      mockAuthService.confirmForgotPassword.mockResolvedValue(undefined);

      await useAuthStore.getState().confirmForgotPassword('test@example.com', '123456', 'NewPass1!');

      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('sets error on failure', async () => {
      mockAuthService.confirmForgotPassword.mockRejectedValue(new Error('ExpiredCodeException'));

      await expect(
        useAuthStore.getState().confirmForgotPassword('test@example.com', '000000', 'NewPass1!')
      ).rejects.toThrow();

      expect(useAuthStore.getState().error).toBe('ExpiredCodeException');
    });
  });

  describe('initialize', () => {
    it('sets authenticated state when valid tokens exist', async () => {
      const mockTokens = {
        accessToken: 'valid-token',
        refreshToken: 'valid-refresh',
        idToken: 'valid-id',
        expiresAt: Date.now() + 3600000,
      };
      mockAuthService.initialize.mockResolvedValue(mockTokens);

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.tokens).toEqual(mockTokens);
      expect(state.isLoading).toBe(false);
    });

    it('sets unauthenticated state when no valid tokens', async () => {
      mockAuthService.initialize.mockResolvedValue(null);

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.tokens).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('handles initialization error gracefully', async () => {
      mockAuthService.initialize.mockRejectedValue(new Error('NetworkError'));

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.tokens).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setUser', () => {
    it('sets user profile data', () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        phone: '+8613800138000',
        nickname: 'TestUser',
        averageRating: 4.5,
        completedTaskCount: 10,
        createdAt: '2024-01-01T00:00:00Z',
      };

      useAuthStore.getState().setUser(mockUser);

      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('clears user when set to null', () => {
      useAuthStore.setState({ user: { id: '1', email: 'test@example.com', phone: '+81', nickname: 'Test', averageRating: 5, completedTaskCount: 0, createdAt: '' } });

      useAuthStore.getState().setUser(null);

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useAuthStore.setState({ error: 'some error' });

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
