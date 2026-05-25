/**
 * API Client
 *
 * Axios instance with request/response interceptors for:
 * - Auto-attaching Authorization Bearer Token (Requirement 2.5)
 * - Handling 401 with automatic token refresh (Requirement 2.6)
 * - Redirecting to login on refresh failure (Requirement 2.7)
 */

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { navigateToAuth } from '../navigation/navigationRef';
import { useAuthStore } from '../stores/authStore';
import { TIMEOUTS } from '../utils/constants';
import { DEV_MOCK_AUTH } from '../config/aws-config';

/**
 * API base URL for the LocalTask backend
 *
 * In development, points to local backend server.
 * - iOS Simulator / Expo Web: use localhost
 * - Android Emulator: use 10.0.2.2 (maps to host machine's localhost)
 */
import { Platform } from 'react-native';

const DEV_API_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_BASE_URL = __DEV__
  ? `http://${DEV_API_HOST}:3000`
  : 'https://api.localtask.example.com/v1';

/**
 * Flag to prevent multiple simultaneous token refresh attempts
 */
let isRefreshing = false;

/**
 * Queue of requests waiting for token refresh to complete
 */
let failedRequestsQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

/**
 * Process queued requests after token refresh
 */
function processQueue(error: unknown, token: string | null): void {
  failedRequestsQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedRequestsQueue = [];
}

/**
 * Retrieve the current access token from Amplify Auth session.
 * Returns null if no valid session exists.
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    return token ?? null;
  } catch {
    return null;
  }
}

/**
 * Attempt to refresh the access token via Amplify Auth.
 * Forces a token refresh by passing forceRefresh option.
 * Returns the new access token or null if refresh fails.
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession({ forceRefresh: true });
    const token = session.tokens?.accessToken?.toString();
    return token ?? null;
  } catch {
    return null;
  }
}

/**
 * Handle authentication failure: clear local state and navigate to login.
 * Implements Requirement 2.7: clear local auth state and redirect to login.
 * Syncs with Zustand auth store to ensure UI state is consistent.
 */
async function handleAuthFailure(): Promise<void> {
  try {
    await signOut();
  } catch {
    // Even if signOut fails, we still navigate to auth
    // per Requirement 3.3 (network error during logout)
  }

  // Clear Zustand auth store state so RootNavigator switches to Auth screen
  const { getState } = useAuthStore;
  getState().setUser(null);
  useAuthStore.setState({
    tokens: null,
    isAuthenticated: false,
    error: null,
  });

  navigateToAuth();
}

/**
 * Create and configure the Axios instance
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUTS.API_REQUEST,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 *
 * Automatically attaches the Authorization Bearer Token to every request.
 * In DEV_MOCK_AUTH mode, sends a dummy token (backend MOCK_AUTH=true skips verification).
 * If no token is available, the request proceeds without auth header
 * (the server will return 401 which triggers the response interceptor).
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (DEV_MOCK_AUTH) {
      // In mock mode, send a dummy token — backend with MOCK_AUTH=true will skip verification
      config.headers.Authorization = 'Bearer dev-mock-token';
      return config;
    }
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 *
 * Handles 401 Unauthorized responses by:
 * 1. Attempting to refresh the access token (Requirement 2.6)
 * 2. Retrying the original request with the new token
 * 3. If refresh fails, clearing auth state and navigating to login (Requirement 2.7)
 *
 * Uses a queue mechanism to handle concurrent requests during token refresh,
 * preventing multiple simultaneous refresh attempts.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Only handle 401 errors with a valid original request
    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Prevent retry loops: if this request was already retried, fail
    if ((originalRequest as InternalAxiosRequestConfig & { _retry?: boolean })._retry) {
      await handleAuthFailure();
      return Promise.reject(error);
    }

    // If a refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedRequestsQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    // Mark as retrying and start refresh
    (originalRequest as InternalAxiosRequestConfig & { _retry?: boolean })._retry = true;
    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();

      if (!newToken) {
        // Refresh failed - clear auth and redirect to login
        processQueue(new Error('Token refresh failed'), null);
        await handleAuthFailure();
        return Promise.reject(error);
      }

      // Refresh succeeded - retry original request and process queue
      processQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await handleAuthFailure();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
