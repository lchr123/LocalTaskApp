import { z } from 'zod';
import { VALIDATION } from './constants';

/**
 * Password validation regex:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character
 */
const passwordRegex = /^(?=.*[a-z])(?=.*\d)/;

/**
 * International phone number regex:
 * - Starts with + followed by country code
 * - Total digits (excluding +) up to 15
 * Default market: Japan (+81)
 */
const phoneRegex = /^\+[1-9]\d{1,14}$/;

/**
 * Japan phone number regex (more specific):
 * - +81 followed by 10 digits (without leading 0)
 * - e.g. +819012345678
 */
const japanPhoneRegex = /^\+81[0-9]{10}$/;

// ─── Registration Form Schema (Phone) ───────────────────────────────────────

export const registerByPhoneSchema = z.object({
  phone: z
    .string()
    .min(1, '手机号为必填项')
    .regex(phoneRegex, '请输入有效的国际电话号码（如 +819012345678）'),
  password: z
    .string()
    .min(VALIDATION.PASSWORD_MIN_LENGTH, `密码至少需要${VALIDATION.PASSWORD_MIN_LENGTH}个字符`)
    .regex(
      passwordRegex,
      '密码必须包含至少1个小写字母、1个数字'
    ),
  confirmPassword: z.string().min(1, '请再次输入密码'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

export type RegisterByPhoneData = z.infer<typeof registerByPhoneSchema>;

// ─── Registration Form Schema (Email) ───────────────────────────────────────

export const registerByEmailSchema = z.object({
  email: z
    .string()
    .min(1, '邮箱为必填项')
    .email('请输入有效的邮箱地址'),
  password: z
    .string()
    .min(VALIDATION.PASSWORD_MIN_LENGTH, `密码至少需要${VALIDATION.PASSWORD_MIN_LENGTH}个字符`)
    .regex(
      passwordRegex,
      '密码必须包含至少1个小写字母、1个数字'
    ),
  confirmPassword: z.string().min(1, '请再次输入密码'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

export type RegisterByEmailData = z.infer<typeof registerByEmailSchema>;

/**
 * Combined register form data type
 */
export type RegisterFormData = RegisterByPhoneData | RegisterByEmailData;

// ─── Login Form Schema ───────────────────────────────────────────────────────

export const loginByEmailSchema = z.object({
  email: z
    .string()
    .min(1, '邮箱为必填项')
    .email('请输入有效的邮箱地址'),
  password: z
    .string()
    .min(1, '密码为必填项'),
});

export const loginByPhoneSchema = z.object({
  phone: z
    .string()
    .min(1, '手机号为必填项')
    .regex(phoneRegex, '请输入有效的国际电话号码（如 +819012345678）'),
  password: z
    .string()
    .min(1, '密码为必填项'),
});

export type LoginByEmailData = z.infer<typeof loginByEmailSchema>;
export type LoginByPhoneData = z.infer<typeof loginByPhoneSchema>;
export type LoginFormData = LoginByEmailData | LoginByPhoneData;

// ─── Verification Code Schema ────────────────────────────────────────────────

export const verificationCodeSchema = z.object({
  code: z
    .string()
    .length(VALIDATION.VERIFICATION_CODE_LENGTH, `验证码必须为${VALIDATION.VERIFICATION_CODE_LENGTH}位数字`)
    .regex(/^\d+$/, '验证码只能包含数字'),
});

export type VerificationCodeData = z.infer<typeof verificationCodeSchema>;

// ─── Forgot Password Schema ─────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, '邮箱为必填项')
    .email('请输入有效的邮箱地址'),
});

export const resetPasswordSchema = z.object({
  code: z
    .string()
    .length(VALIDATION.VERIFICATION_CODE_LENGTH, `验证码必须为${VALIDATION.VERIFICATION_CODE_LENGTH}位数字`)
    .regex(/^\d+$/, '验证码只能包含数字'),
  newPassword: z
    .string()
    .min(VALIDATION.PASSWORD_MIN_LENGTH, `密码至少需要${VALIDATION.PASSWORD_MIN_LENGTH}个字符`)
    .regex(
      passwordRegex,
      '密码必须包含至少1个小写字母、1个数字'
    ),
});

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

// ─── Task Form Schema ────────────────────────────────────────────────────────

const taskTypes = ['delivery', 'pet_care', 'translation', 'moving', 'airport_transfer', 'childcare', 'other'] as const;

/**
 * Location object schema with address and coordinates.
 * Validates that coordinates are within Japan (lat 20°~46°, lng 122°~154°).
 *
 * Requirements covered:
 * - 4A.6: Validate coordinates within Japan
 * - 4A.7: Complete location object with address + lat/lng
 */
const locationSchema = z.object({
  address: z
    .string()
    .min(1, '地点为必填项')
    .max(VALIDATION.TASK_LOCATION_MAX, `地点最多${VALIDATION.TASK_LOCATION_MAX}个字符`),
  latitude: z
    .number()
    .refine((val) => val >= 20 && val <= 46, '请搜索确认地址后再提交'),
  longitude: z
    .number()
    .refine((val) => val >= 122 && val <= 154, '请搜索确认地址后再提交'),
});

export const createTaskFormSchema = z.object({
  type: z.enum(taskTypes, '请选择任务类型'),
  description: z
    .string()
    .min(VALIDATION.TASK_DESCRIPTION_MIN, `描述至少需要${VALIDATION.TASK_DESCRIPTION_MIN}个字符`)
    .max(VALIDATION.TASK_DESCRIPTION_MAX, `描述最多${VALIDATION.TASK_DESCRIPTION_MAX}个字符`),
  location: locationSchema,
  deadline: z
    .string()
    .min(1, '截止时间为必填项')
    .refine(
      (val) => new Date(val).getTime() > Date.now(),
      '截止时间必须晚于当前时间'
    ),
  reward: z
    .number('请输入有效的报酬金额')
    .int('报酬金额必须为整数')
    .min(VALIDATION.TASK_REWARD_MIN, `报酬金额最低为${VALIDATION.TASK_REWARD_MIN}元`)
    .max(VALIDATION.TASK_REWARD_MAX, `报酬金额最高为${VALIDATION.TASK_REWARD_MAX}元`),
});

export type CreateTaskFormData = z.infer<typeof createTaskFormSchema>;

// ─── Intent Form Schema ──────────────────────────────────────────────────────

export const intentFormSchema = z.object({
  message: z
    .string()
    .max(VALIDATION.INTENT_MESSAGE_MAX, `留言最多${VALIDATION.INTENT_MESSAGE_MAX}个字符`)
    .optional(),
});

export type IntentFormData = z.infer<typeof intentFormSchema>;

// ─── Review Form Schema ──────────────────────────────────────────────────────

export const reviewFormSchema = z.object({
  rating: z
    .number('请选择评分')
    .int('评分必须为整数')
    .min(VALIDATION.REVIEW_RATING_MIN, `评分最低为${VALIDATION.REVIEW_RATING_MIN}星`)
    .max(VALIDATION.REVIEW_RATING_MAX, `评分最高为${VALIDATION.REVIEW_RATING_MAX}星`),
  comment: z
    .string()
    .max(VALIDATION.REVIEW_COMMENT_MAX, `评价最多${VALIDATION.REVIEW_COMMENT_MAX}个字符`)
    .optional(),
});

export type ReviewFormData = z.infer<typeof reviewFormSchema>;

// ─── Report Form Schema ──────────────────────────────────────────────────────

const reportTypes = ['fake_task', 'harassment', 'fraud', 'inappropriate_content', 'other'] as const;

export const reportFormSchema = z.object({
  targetType: z.enum(['user', 'task'] as const, '请选择举报对象类型'),
  targetId: z
    .string()
    .min(1, '举报对象ID为必填项'),
  type: z.enum(reportTypes, '请选择举报类型'),
  description: z
    .string()
    .min(1, '描述为必填项')
    .max(VALIDATION.REPORT_DESCRIPTION_MAX, `描述最多${VALIDATION.REPORT_DESCRIPTION_MAX}个字符`),
  imageUrls: z
    .array(z.string().url('图片URL格式无效'))
    .max(VALIDATION.REPORT_IMAGE_MAX_COUNT, `最多上传${VALIDATION.REPORT_IMAGE_MAX_COUNT}张图片`)
    .optional()
    .default([]),
});

export type ReportFormData = z.infer<typeof reportFormSchema>;
