import { TaskType } from '../types/task';
import { ReportType } from '../types/report';

/**
 * Task type labels (Chinese)
 */
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  delivery: '送文件',
  shopping: '买东西',
  dog_walking: '遛狗',
  queuing: '排队',
  pickup: '取件',
};

/**
 * Report type labels (Chinese)
 */
export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  fake_task: '虚假任务',
  harassment: '骚扰行为',
  fraud: '欺诈行为',
  inappropriate_content: '不当内容',
  other: '其他',
};

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGIN: '/auth/login',
  AUTH_VERIFY: '/auth/verify',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',

  // Tasks
  TASKS: '/tasks',
  TASK_DETAIL: (id: string) => `/tasks/${id}`,
  TASK_INTENTS: (id: string) => `/tasks/${id}/intents`,
  TASK_INTENT_DELETE: (taskId: string, intentId: string) =>
    `/tasks/${taskId}/intents/${intentId}`,
  TASK_SELECT_HELPER: (id: string) => `/tasks/${id}/select-helper`,

  // Chat
  CHAT_SESSIONS: '/chat/sessions',
  CHAT_MESSAGES: (sessionId: string) => `/chat/sessions/${sessionId}/messages`,
  CHAT_WS: '/ws/chat',

  // Reviews
  REVIEWS: '/reviews',
  USER_REVIEWS: (userId: string) => `/users/${userId}/reviews`,

  // Reports
  REPORTS: '/reports',
  UPLOAD_IMAGE: '/upload/image',
} as const;

/**
 * Pagination
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  CHAT_MESSAGE_PAGE_SIZE: 20,
} as const;

/**
 * Timeouts (in milliseconds)
 */
export const TIMEOUTS = {
  API_REQUEST: 10000,
  REFRESH_TIMEOUT: 5000,
  WEBSOCKET_RECONNECT_BASE: 3000,
  WEBSOCKET_MAX_RECONNECT_ATTEMPTS: 5,
  LOCATION_TIMEOUT: 15000,
} as const;

/**
 * Validation limits
 */
export const VALIDATION = {
  TASK_DESCRIPTION_MIN: 10,
  TASK_DESCRIPTION_MAX: 500,
  TASK_LOCATION_MAX: 100,
  TASK_REWARD_MIN: 1000,
  TASK_REWARD_MAX: 99999,
  INTENT_MESSAGE_MAX: 200,
  CHAT_MESSAGE_MAX: 1000,
  CHAT_IMAGE_MAX_SIZE_MB: 10,
  REVIEW_COMMENT_MAX: 500,
  REVIEW_RATING_MIN: 1,
  REVIEW_RATING_MAX: 5,
  REPORT_DESCRIPTION_MAX: 1000,
  REPORT_IMAGE_MAX_COUNT: 5,
  REPORT_IMAGE_MAX_SIZE_MB: 5,
  PASSWORD_MIN_LENGTH: 8,
  VERIFICATION_CODE_LENGTH: 6,
  VERIFICATION_CODE_EXPIRY_MINUTES: 10,
  VERIFICATION_CODE_MAX_ATTEMPTS: 3,
  VERIFICATION_CODE_MAX_RESEND: 5,
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_LOCKOUT_MINUTES: 30,
} as const;

/**
 * Location defaults
 */
export const LOCATION = {
  DEFAULT_RADIUS_KM: 10,
  MAX_RADIUS_KM: 50,
} as const;

/**
 * Review constraints
 */
export const REVIEW = {
  EXPIRY_DAYS: 14,
} as const;
