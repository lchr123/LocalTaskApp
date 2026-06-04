/**
 * Login Screen
 *
 * Implements user login with two methods:
 * 1. Phone number (+81 default) + password
 * 2. Email + password
 *
 * Requirements covered:
 * - 2.1: Correct identifier+password → Cognito auth → redirect to home
 * - 2.2: Show generic login failure error (don't reveal which field is wrong)
 * - 2.3: Lock account after 5 consecutive failures for 30 minutes
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  SegmentedButtons,
  useTheme,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '../../stores/authStore';
import {
  loginByPhoneSchema,
  loginByEmailSchema,
  LoginByPhoneData,
  LoginByEmailData,
} from '../../utils/validation';
import { VALIDATION } from '../../utils/constants';
import { resetToMain } from '../../navigation/navigationRef';
import { Image } from 'react-native';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_LOGIN_ATTEMPTS = VALIDATION.LOGIN_MAX_ATTEMPTS;
const LOCKOUT_DURATION_MS = VALIDATION.LOGIN_LOCKOUT_MINUTES * 60 * 1000;

// ─── Types ───────────────────────────────────────────────────────────────────

type LoginMethod = 'phone' | 'email';

interface LoginScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

// ─── Error Message Mapping ───────────────────────────────────────────────────

/**
 * Returns a generic login failure message.
 * Requirement 2.2: never reveal whether identifier or password is incorrect.
 */
function getLoginErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return '登录失败，请检查您的账号和密码后重试';
  }

  const message = error.message.toLowerCase();

  if (message.includes('not authorized') || message.includes('incorrect')) {
    return '账号或密码错误，请重试';
  }

  if (message.includes('user') && message.includes('not') && message.includes('exist')) {
    return '账号或密码错误，请重试';
  }

  if (message.includes('not confirmed') || message.includes('unconfirmed')) {
    return '账号尚未验证，请先完成验证';
  }

  if (message.includes('too many') || message.includes('limit exceeded')) {
    return '操作过于频繁，请稍后再试';
  }

  if (message.includes('network') || message.includes('timeout')) {
    return '网络连接失败，请检查网络后重试';
  }

  return '账号或密码错误，请重试';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const theme = useTheme();
  const { login, isLoading, clearError } = useAuthStore();

  // default
  const [method, setMethod] = useState<string>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);

  const failureCountRef = useRef(0);

  // Phone login form
  const phoneForm = useForm<LoginByPhoneData>({
    resolver: zodResolver(loginByPhoneSchema),
    defaultValues: {
      phone: '+81',
      password: '',
    },
    mode: 'onSubmit',
  });

  // Email login form
  const emailForm = useForm<LoginByEmailData>({
    resolver: zodResolver(loginByEmailSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onSubmit',
  });

  const checkLockout = useCallback((): boolean => {
    if (!lockoutEndTime) return false;

    if (Date.now() < lockoutEndTime) {
      setIsLockedOut(true);
      return true;
    }

    setIsLockedOut(false);
    setLockoutEndTime(null);
    failureCountRef.current = 0;
    return false;
  }, [lockoutEndTime]);

  /**
   * Shared login handler for both methods
   */
  const handleLogin = useCallback(
    async (identifier: string, password: string) => {
      if (checkLockout()) return;

      setServerError(null);
      clearError();

      try {
        await login(identifier, password);
        failureCountRef.current = 0;
        resetToMain();
      } catch (error: unknown) {
        failureCountRef.current += 1;

        if (failureCountRef.current >= MAX_LOGIN_ATTEMPTS) {
          const endTime = Date.now() + LOCKOUT_DURATION_MS;
          setLockoutEndTime(endTime);
          setIsLockedOut(true);
          setServerError(
            `由于多次登录失败，您的账户已被临时锁定 ${VALIDATION.LOGIN_LOCKOUT_MINUTES} 分钟。请稍后再试。`
          );
          return;
        }

        setServerError(getLoginErrorMessage(error));
      }
    },
    [login, clearError, checkLockout]
  );

  const onSubmitPhone = useCallback(
    async (data: LoginByPhoneData) => {
      await handleLogin(data.phone, data.password);
    },
    [handleLogin]
  );

  const onSubmitEmail = useCallback(
    async (data: LoginByEmailData) => {
      await handleLogin(data.email, data.password);
    },
    [handleLogin]
  );

  const handleMethodChange = useCallback((value: string) => {
    setMethod(value);
    setServerError(null);
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Image
          source={require('../../../assets/favicon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text variant="headlineMedium" style={styles.title}>
          欢迎回来
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          在Locally Helper 连接生活需求与帮手，让本地互助更简单
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          ⚠️目前仅支持邮箱登录
        </Text>
        {/* <Text variant="bodyMedium" style={styles.subtitle}>
          请登录您的账号
        </Text> */}

        {/* Method Selector */}
        <SegmentedButtons
          value={method}
          onValueChange={handleMethodChange}
          buttons={[
            { value: 'phone', label: '手机号', icon: 'phone', disabled: true },
            { value: 'email', label: '邮箱', icon: 'email' },
          ]}
          style={styles.segmentedButtons}
        />

        {/* Lockout Banner */}
        {isLockedOut && (
          <View
            style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}
            accessibilityLabel="账户锁定提示"
            accessibilityRole="alert"
          >
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onErrorContainer }}
            >
              由于多次登录失败，您的账户已被临时锁定 {VALIDATION.LOGIN_LOCKOUT_MINUTES} 分钟。请稍后再试。
            </Text>
          </View>
        )}

        {/* Server Error Banner */}
        {serverError && !isLockedOut && (
          <View
            style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}
            accessibilityLabel="登录错误提示"
            accessibilityRole="alert"
          >
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onErrorContainer }}
            >
              {serverError}
            </Text>
          </View>
        )}

        {/* Phone Login Form */}
        {method === 'phone' && (
          <>
            <Controller
              control={phoneForm.control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.fieldContainer}>
                  <TextInput
                    label="手机号"
                    placeholder="+819012345678"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="outlined"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    error={!!phoneForm.formState.errors.phone}
                    disabled={isLockedOut || isLoading}
                    left={<TextInput.Icon icon="phone" />}
                    accessibilityLabel="手机号输入框"
                    accessibilityHint="请输入注册时使用的手机号"
                  />
                  <Text variant="bodySmall" style={{ color: '#757575', marginTop: 4 }}>
                    日本号码格式：+81 + 10位数字（去掉开头的0）
                  </Text>
                  {phoneForm.formState.errors.phone && (
                    <Text
                      variant="bodySmall"
                      style={[styles.fieldError, { color: theme.colors.error }]}
                    >
                      {phoneForm.formState.errors.phone.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={phoneForm.control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.fieldContainer}>
                  <TextInput
                    label="密码"
                    placeholder="请输入密码"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    error={!!phoneForm.formState.errors.password}
                    disabled={isLockedOut || isLoading}
                    left={<TextInput.Icon icon="lock" />}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
                        onPress={togglePasswordVisibility}
                        accessibilityLabel={showPassword ? '隐藏密码' : '显示密码'}
                      />
                    }
                    accessibilityLabel="密码输入框"
                  />
                  {phoneForm.formState.errors.password && (
                    <Text
                      variant="bodySmall"
                      style={[styles.fieldError, { color: theme.colors.error }]}
                    >
                      {phoneForm.formState.errors.password.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </>
        )}

        {/* Email Login Form */}
        {method === 'email' && (
          <>
            <Controller
              control={emailForm.control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.fieldContainer}>
                  <TextInput
                    label="邮箱"
                    placeholder="example@email.com"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    error={!!emailForm.formState.errors.email}
                    disabled={isLockedOut || isLoading}
                    left={<TextInput.Icon icon="email" />}
                    accessibilityLabel="邮箱输入框"
                    accessibilityHint="请输入注册时使用的邮箱"
                  />
                  {emailForm.formState.errors.email && (
                    <Text
                      variant="bodySmall"
                      style={[styles.fieldError, { color: theme.colors.error }]}
                    >
                      {emailForm.formState.errors.email.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={emailForm.control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.fieldContainer}>
                  <TextInput
                    label="密码"
                    placeholder="请输入密码"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    error={!!emailForm.formState.errors.password}
                    disabled={isLockedOut || isLoading}
                    left={<TextInput.Icon icon="lock" />}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
                        onPress={togglePasswordVisibility}
                        accessibilityLabel={showPassword ? '隐藏密码' : '显示密码'}
                      />
                    }
                    accessibilityLabel="密码输入框"
                  />
                  {emailForm.formState.errors.password && (
                    <Text
                      variant="bodySmall"
                      style={[styles.fieldError, { color: theme.colors.error }]}
                    >
                      {emailForm.formState.errors.password.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </>
        )}

        {/* Forgot Password Link */}
        <View style={styles.forgotPasswordContainer}>
          <Button
            mode="text"
            onPress={() => navigation.navigate('ForgotPassword')}
            compact
            disabled={isLoading}
            accessibilityLabel="忘记密码"
            accessibilityHint="前往重置密码页面"
          >
            忘记密码？
          </Button>
        </View>

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={
            method === 'phone'
              ? phoneForm.handleSubmit(onSubmitPhone)
              : emailForm.handleSubmit(onSubmitEmail)
          }
          loading={isLoading}
          disabled={isLoading || isLockedOut}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
          accessibilityLabel="登录按钮"
          accessibilityHint="提交登录信息"
        >
          登录
        </Button>

        {/* Navigate to Register */}
        <View style={styles.registerLinkContainer}>
          <Text variant="bodyMedium">还没有账号？</Text>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Register')}
            compact
            disabled={isLoading}
            accessibilityLabel="前往注册页面"
          >
            去注册
          </Button>
        </View>

        {/* Back to Main (browse without login) */}
        <Button
          mode="text"
          onPress={() => (navigation as any).navigate('Main')}
          compact
          icon="arrow-left"
          style={{ marginTop: 8 }}
          accessibilityLabel="返回首页"
        >
          先逛逛
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 12,
  },
  logo: {
    width: 72,
    height: 72,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 16,
    opacity: 0.7,
  },
  segmentedButtons: {
    marginBottom: 20,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  fieldError: {
    marginTop: 4,
    marginLeft: 12,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  submitButton: {
    marginBottom: 16,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  registerLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
