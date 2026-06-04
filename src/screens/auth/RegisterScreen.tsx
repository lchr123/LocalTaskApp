/**
 * Register Screen
 *
 * Implements user registration with two methods:
 * 1. Phone number (+81 default for Japan) + password
 * 2. Email + password
 *
 * User selects one method via tabs. After submission, a verification code
 * is sent to the chosen identifier.
 *
 * Requirements covered:
 * - 1.1: Display login/register entry when user is not logged in
 * - 1.2: Show registration form with phone OR email + password fields
 * - 1.3: Validate phone (Japan +81 default), email, password (security policy)
 * - 1.5: Show error when phone/email already registered
 * - 1.6: Show password requirements (8+ chars, uppercase, lowercase, digit, special char)
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  HelperText,
  SegmentedButtons,
  useTheme,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
import {
  registerByPhoneSchema,
  registerByEmailSchema,
  RegisterByPhoneData,
  RegisterByEmailData,
} from '../../utils/validation';
import { Image } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

type RegisterMethod = 'phone' | 'email';

interface RegisterScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
}

// ─── Password Strength Rules ─────────────────────────────────────────────────

interface PasswordRule {
  label: string;
  test: (value: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: '至少8个字符', test: (v) => v.length >= 8 },
  // { label: '至少1个大写字母', test: (v) => /[A-Z]/.test(v) },
  { label: '至少1个小写字母', test: (v) => /[a-z]/.test(v) },
  { label: '至少1个数字', test: (v) => /\d/.test(v) },
  // { label: '至少1个特殊字符', test: (v) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(v) },
];

// ─── Error Message Mapping ───────────────────────────────────────────────────

function mapRegistrationError(error: unknown): string {
  if (!(error instanceof Error)) {
    return '注册失败，请稍后重试';
  }

  const message = error.message.toLowerCase();

  if (message.includes('user already exists') || message.includes('usernameexists')) {
    return '该账号已被注册，请使用其他手机号/邮箱或直接登录';
  }

  if (message.includes('phone') && (message.includes('exists') || message.includes('already'))) {
    return '该手机号已被注册，请使用其他手机号';
  }

  if (message.includes('invalid') && message.includes('phone')) {
    return '手机号格式无效，请检查后重试';
  }

  if (message.includes('invalid') && message.includes('email')) {
    return '邮箱格式无效，请检查后重试';
  }

  if (message.includes('password') && message.includes('policy')) {
    return '密码不符合安全策略，请确保包含大小写字母、数字和特殊字符';
  }

  return error.message || '注册失败，请稍后重试';
}

/**
 * Check if the error indicates the user already exists in Cognito.
 */
function isUserExistsError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  const name = (error as any).name?.toLowerCase() || '';
  return msg.includes('user already exists') 
    || msg.includes('usernameexists')
    || name.includes('usernameexists')
    || msg.includes('already exists')
    || msg.includes('an account with the given');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const theme = useTheme();
  const { register: registerUser, isLoading, clearError } = useAuthStore();

  // default
  const [method, setMethod] = useState<string>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Phone registration form
  const phoneForm = useForm<RegisterByPhoneData>({
    resolver: zodResolver(registerByPhoneSchema),
    defaultValues: {
      phone: '+81',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  // Email registration form
  const emailForm = useForm<RegisterByEmailData>({
    resolver: zodResolver(registerByEmailSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const currentPassword = method === 'phone'
    ? phoneForm.watch('password')
    : emailForm.watch('password');

  /**
   * Handle method tab change
   */
  const handleMethodChange = useCallback((value: string) => {
    setMethod(value);
    setServerError(null);
  }, []);

  /**
   * Handle phone registration submission
   */
  const onSubmitPhone = useCallback(
    async (data: RegisterByPhoneData) => {
      setServerError(null);
      clearError();

      try {
        await registerUser(data.phone, data.password, 'phone');
        navigation.navigate('VerifyCode', { identifier: data.phone, method: 'phone' });
      } catch (error: unknown) {
        // Check if user already exists - try to resend verification code
        if (isUserExistsError(error)) {
          try {
            await authService.resendVerificationCode(data.phone);
            // Resend succeeded - navigate to verify page regardless of user state
            // If user is already verified, they'll get an error when entering the code
            navigation.navigate('VerifyCode', { identifier: data.phone, method: 'phone' });
          } catch {
            setServerError('该账号已注册，请直接登录');
          }
        } else {
          setServerError(mapRegistrationError(error));
        }
      }
    },
    [registerUser, navigation, clearError]
  );

  /**
   * Handle email registration submission
   */
  const onSubmitEmail = useCallback(
    async (data: RegisterByEmailData) => {
      setServerError(null);
      clearError();

      try {
        await registerUser(data.email, data.password, 'email');
        navigation.navigate('VerifyCode', { identifier: data.email, method: 'email' });
      } catch (error: unknown) {
        // Check if user already exists - try to resend verification code
        if (isUserExistsError(error)) {
          try {
            await authService.resendVerificationCode(data.email);
            navigation.navigate('VerifyCode', { identifier: data.email, method: 'email' });
          } catch {
            setServerError('该账号已注册，请直接登录');
          }
        } else {
          setServerError(mapRegistrationError(error));
        }
      }
    },
    [registerUser, navigation, clearError]
  );

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
          创建账号
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          ⚠️目前仅支持邮箱注册
        </Text>
        {/* <Text variant="bodyMedium" style={styles.subtitle}>
          选择手机号或邮箱注册
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

        {/* Server Error Banner */}
        {serverError && (
          <View
            style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}
            accessibilityLabel="注册错误提示"
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

        {/* Phone Registration Form */}
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
                    left={<TextInput.Icon icon="phone" />}
                    accessibilityLabel="手机号输入框"
                    accessibilityHint="请输入日本手机号，格式为+81开头后跟10位数字"
                  />
                  <HelperText type="error" visible={!!phoneForm.formState.errors.phone}>
                    {phoneForm.formState.errors.phone?.message}
                  </HelperText>
                  <HelperText type="info" visible={!phoneForm.formState.errors.phone}>
                    日本号码格式：+81 + 10位数字（去掉开头的0）
                  </HelperText>
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
                    autoComplete="password-new"
                    error={!!phoneForm.formState.errors.password}
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
                  <HelperText type="error" visible={!!phoneForm.formState.errors.password}>
                    {phoneForm.formState.errors.password?.message}
                  </HelperText>
                </View>
              )}
            />

            <Controller
              control={phoneForm.control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.fieldContainer}>
                  <TextInput
                    label="确认密码"
                    placeholder="请再次输入密码"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password-new"
                    error={!!phoneForm.formState.errors.confirmPassword}
                    left={<TextInput.Icon icon="lock-check" />}
                    accessibilityLabel="确认密码输入框"
                  />
                  <HelperText type="error" visible={!!phoneForm.formState.errors.confirmPassword}>
                    {phoneForm.formState.errors.confirmPassword?.message}
                  </HelperText>
                </View>
              )}
            />
          </>
        )}

        {/* Email Registration Form */}
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
                    left={<TextInput.Icon icon="email" />}
                    accessibilityLabel="邮箱输入框"
                    accessibilityHint="请输入有效的邮箱地址"
                  />
                  <HelperText type="error" visible={!!emailForm.formState.errors.email}>
                    {emailForm.formState.errors.email?.message}
                  </HelperText>
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
                    autoComplete="password-new"
                    error={!!emailForm.formState.errors.password}
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
                  <HelperText type="error" visible={!!emailForm.formState.errors.password}>
                    {emailForm.formState.errors.password?.message}
                  </HelperText>
                </View>
              )}
            />

            <Controller
              control={emailForm.control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.fieldContainer}>
                  <TextInput
                    label="确认密码"
                    placeholder="请再次输入密码"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password-new"
                    error={!!emailForm.formState.errors.confirmPassword}
                    left={<TextInput.Icon icon="lock-check" />}
                    accessibilityLabel="确认密码输入框"
                  />
                  <HelperText type="error" visible={!!emailForm.formState.errors.confirmPassword}>
                    {emailForm.formState.errors.confirmPassword?.message}
                  </HelperText>
                </View>
              )}
            />
          </>
        )}

        {/* Password Strength Indicators */}
        <View style={styles.passwordRulesContainer} accessibilityLabel="密码强度提示">
          <Text variant="labelMedium" style={styles.passwordRulesTitle}>
            密码要求：
          </Text>
          {PASSWORD_RULES.map((rule) => {
            const passed = currentPassword ? rule.test(currentPassword) : false;
            return (
              <View key={rule.label} style={styles.passwordRule}>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.passwordRuleText,
                    { color: passed ? theme.colors.primary : theme.colors.onSurfaceVariant },
                  ]}
                  accessibilityLabel={`${rule.label}${passed ? '，已满足' : '，未满足'}`}
                >
                  {passed ? '✓' : '○'} {rule.label}
                </Text>
              </View>
            );
          })}
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
          disabled={isLoading}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
          accessibilityLabel="注册按钮"
          accessibilityHint="提交注册信息"
        >
          注册
        </Button>

        {/* Navigate to Login */}
        <View style={styles.loginLinkContainer}>
          <Text variant="bodyMedium">已有账号？</Text>
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            compact
            accessibilityLabel="返回登录页面"
          >
            去登录
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logo: {
    width: 72,
    height: 72,
    alignSelf: 'center',
    marginBottom: 16,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 12,
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
    marginBottom: 4,
  },
  passwordRulesContainer: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  passwordRulesTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  passwordRule: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  passwordRuleText: {
    fontSize: 13,
  },
  submitButton: {
    marginBottom: 16,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
