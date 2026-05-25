/**
 * Forgot Password Screen
 *
 * Implements the complete forgot password flow:
 * 1. Email input → send verification code
 * 2. Enter 6-digit verification code
 * 3. Set new password
 *
 * Verification code is valid for 10 minutes (managed by Cognito).
 *
 * Requirements covered:
 * - 2.4: Send 6-digit code to registered email, valid for 10 minutes,
 *         correct code → set new password
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  HelperText,
  useTheme,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '../../stores/authStore';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  ForgotPasswordData,
  ResetPasswordData,
} from '../../utils/validation';
import { VALIDATION } from '../../utils/constants';

// ─── Constants ───────────────────────────────────────────────────────────────

const CODE_LENGTH = VALIDATION.VERIFICATION_CODE_LENGTH;
const EXPIRY_MINUTES = VALIDATION.VERIFICATION_CODE_EXPIRY_MINUTES;

// ─── Flow Steps ──────────────────────────────────────────────────────────────

type FlowStep = 'email' | 'code' | 'newPassword';

// ─── Password Strength Rules ─────────────────────────────────────────────────

interface PasswordRule {
  label: string;
  test: (value: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: '至少8个字符', test: (v) => v.length >= 8 },
  { label: '至少1个大写字母', test: (v) => /[A-Z]/.test(v) },
  { label: '至少1个小写字母', test: (v) => /[a-z]/.test(v) },
  { label: '至少1个数字', test: (v) => /\d/.test(v) },
  { label: '至少1个特殊字符', test: (v) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(v) },
];

// ─── Error Message Mapping ───────────────────────────────────────────────────

function mapForgotPasswordError(error: unknown): string {
  if (!(error instanceof Error)) {
    return '操作失败，请稍后重试';
  }

  const message = error.message.toLowerCase();

  if (message.includes('user') && message.includes('not') && message.includes('found')) {
    return '该邮箱未注册，请检查后重试';
  }

  if (message.includes('limit') || message.includes('too many')) {
    return '操作过于频繁，请稍后再试';
  }

  if (message.includes('network') || message.includes('timeout')) {
    return '网络连接失败，请检查网络后重试';
  }

  if (message.includes('codemismatch') || message.includes('code mismatch')) {
    return '验证码错误，请重新输入';
  }

  if (message.includes('expired') || message.includes('expiredcode')) {
    return '验证码已过期，请重新发送';
  }

  if (message.includes('password') && message.includes('policy')) {
    return '密码不符合安全策略，请确保包含大小写字母、数字和特殊字符';
  }

  if (message.includes('invalid') && message.includes('password')) {
    return '密码格式无效，请检查后重试';
  }

  return error.message || '操作失败，请稍后重试';
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ForgotPasswordScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const theme = useTheme();
  const { forgotPassword, confirmForgotPassword, isLoading, clearError } = useAuthStore();

  // Flow state
  const [step, setStep] = useState<FlowStep>('email');
  const [email, setEmail] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Code input state
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expiry timer
  const [expiryTime, setExpiryTime] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Refs for code digit inputs
  const inputRefs = useRef<(RNTextInput | null)[]>(Array(CODE_LENGTH).fill(null));

  // ─── Email Form ────────────────────────────────────────────────────────────

  const emailForm = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
  });

  // ─── New Password Form ─────────────────────────────────────────────────────

  const passwordForm = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', newPassword: '' },
    mode: 'onChange',
  });

  const newPasswordValue = passwordForm.watch('newPassword');

  // ─── Expiry Timer Effect ───────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 'code' || expiryTime === 0) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [step, expiryTime]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const isCodeExpired = step === 'code' && remainingSeconds <= 0 && expiryTime > 0;
  const fullCode = codeDigits.join('');
  const isCodeComplete = fullCode.length === CODE_LENGTH && /^\d+$/.test(fullCode);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── Step 1: Send Verification Code ────────────────────────────────────────

  const handleSendCode = useCallback(
    async (data: ForgotPasswordData) => {
      setServerError(null);
      clearError();
      setIsSubmitting(true);

      try {
        await forgotPassword(data.email);
        // Success - move to code entry step
        setEmail(data.email);
        setExpiryTime(Date.now() + EXPIRY_MINUTES * 60 * 1000);
        setRemainingSeconds(EXPIRY_MINUTES * 60);
        setStep('code');
      } catch (error: unknown) {
        const friendlyMessage = mapForgotPasswordError(error);
        setServerError(friendlyMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [forgotPassword, clearError]
  );

  // ─── Step 2: Verify Code ───────────────────────────────────────────────────

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      const digit = value.replace(/[^0-9]/g, '').slice(-1);

      setCodeDigits((prev) => {
        const newDigits = [...prev];
        newDigits[index] = digit;
        return newDigits;
      });

      // Auto-advance to next input
      if (digit && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    []
  );

  const handleKeyPress = useCallback(
    (index: number, key: string) => {
      if (key === 'Backspace' && !codeDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        setCodeDigits((prev) => {
          const newDigits = [...prev];
          newDigits[index - 1] = '';
          return newDigits;
        });
      }
    },
    [codeDigits]
  );

  const handleVerifyCode = useCallback(() => {
    if (!isCodeComplete) return;

    if (isCodeExpired) {
      setServerError('验证码已过期，请重新发送');
      return;
    }

    // Move to new password step with the code
    setServerError(null);
    passwordForm.setValue('code', fullCode);
    setStep('newPassword');
  }, [isCodeComplete, isCodeExpired, fullCode, passwordForm]);

  // ─── Step 3: Set New Password ──────────────────────────────────────────────

  const handleResetPassword = useCallback(
    async (data: ResetPasswordData) => {
      setServerError(null);
      clearError();
      setIsSubmitting(true);

      try {
        await confirmForgotPassword(email, data.code, data.newPassword);
        // Success - navigate to login
        navigation.navigate('Login');
      } catch (error: unknown) {
        const friendlyMessage = mapForgotPasswordError(error);
        setServerError(friendlyMessage);

        // If code is invalid/expired, go back to code step
        const errorMsg = error instanceof Error ? error.message.toLowerCase() : '';
        if (
          errorMsg.includes('codemismatch') ||
          errorMsg.includes('code mismatch') ||
          errorMsg.includes('expired')
        ) {
          setStep('code');
          setCodeDigits(Array(CODE_LENGTH).fill(''));
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, confirmForgotPassword, clearError, navigation]
  );

  // ─── Resend Code ──────────────────────────────────────────────────────────

  const handleResendCode = useCallback(async () => {
    setServerError(null);
    clearError();
    setIsSubmitting(true);

    try {
      await forgotPassword(email);
      // Reset code state
      setCodeDigits(Array(CODE_LENGTH).fill(''));
      setExpiryTime(Date.now() + EXPIRY_MINUTES * 60 * 1000);
      setRemainingSeconds(EXPIRY_MINUTES * 60);
      inputRefs.current[0]?.focus();
    } catch (error: unknown) {
      const friendlyMessage = mapForgotPasswordError(error);
      setServerError(friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, forgotPassword, clearError]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  // ─── Render: Email Step ────────────────────────────────────────────────────

  const renderEmailStep = () => (
    <>
      <Text variant="headlineMedium" style={styles.title}>
        忘记密码
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        请输入您的注册邮箱，我们将发送验证码
      </Text>

      {/* Server Error */}
      {serverError && (
        <View
          style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}
          accessibilityLabel="错误提示"
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

      {/* Email Field */}
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
              disabled={isSubmitting || isLoading}
              left={<TextInput.Icon icon="email" />}
              accessibilityLabel="邮箱输入框"
              accessibilityHint="请输入您的注册邮箱"
            />
            <HelperText type="error" visible={!!emailForm.formState.errors.email}>
              {emailForm.formState.errors.email?.message}
            </HelperText>
          </View>
        )}
      />

      {/* Send Code Button */}
      <Button
        mode="contained"
        onPress={emailForm.handleSubmit(handleSendCode)}
        loading={isSubmitting || isLoading}
        disabled={isSubmitting || isLoading}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
        accessibilityLabel="发送验证码"
        accessibilityHint="向您的邮箱发送重置密码验证码"
      >
        发送验证码
      </Button>

      {/* Back to Login */}
      <Button
        mode="text"
        onPress={() => navigation.goBack()}
        disabled={isSubmitting || isLoading}
        style={styles.backButton}
        accessibilityLabel="返回登录页面"
      >
        返回登录
      </Button>
    </>
  );

  // ─── Render: Code Step ─────────────────────────────────────────────────────

  const renderCodeStep = () => (
    <>
      <Text variant="headlineMedium" style={styles.title}>
        输入验证码
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        验证码已发送至 {email}
      </Text>

      {/* Expiry Timer */}
      <View style={styles.timerContainer}>
        {isCodeExpired ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.error }}
            accessibilityLabel="验证码已过期"
            accessibilityRole="alert"
          >
            验证码已过期，请重新发送
          </Text>
        ) : (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
            accessibilityLabel={`验证码将在${formatTime(remainingSeconds)}后过期`}
          >
            验证码有效期：{formatTime(remainingSeconds)}
          </Text>
        )}
      </View>

      {/* Server Error */}
      {serverError && (
        <View
          style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}
          accessibilityLabel="错误提示"
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

      {/* 6-Digit Code Input */}
      <View style={styles.codeContainer} accessibilityLabel="6位验证码输入区域">
        {Array.from({ length: CODE_LENGTH }).map((_, index) => (
          <RNTextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            style={[
              styles.codeInput,
              {
                borderColor: codeDigits[index]
                  ? theme.colors.primary
                  : theme.colors.outline,
                color: theme.colors.onSurface,
              },
            ]}
            value={codeDigits[index]}
            onChangeText={(value) => handleDigitChange(index, value)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            editable={!isCodeExpired && !isSubmitting}
            accessibilityLabel={`验证码第${index + 1}位`}
            accessibilityHint="请输入一位数字"
          />
        ))}
      </View>

      {/* Verify Code Button */}
      <Button
        mode="contained"
        onPress={handleVerifyCode}
        disabled={!isCodeComplete || isCodeExpired || isSubmitting}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
        accessibilityLabel="验证"
        accessibilityHint="验证输入的验证码"
      >
        下一步
      </Button>

      {/* Resend Code */}
      <View style={styles.resendContainer}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          没有收到验证码？
        </Text>
        <Button
          mode="text"
          onPress={handleResendCode}
          loading={isSubmitting}
          disabled={isSubmitting}
          compact
          accessibilityLabel="重新发送验证码"
        >
          重新发送
        </Button>
      </View>

      {/* Back to Email Step */}
      <Button
        mode="text"
        onPress={() => {
          setStep('email');
          setServerError(null);
          setCodeDigits(Array(CODE_LENGTH).fill(''));
        }}
        disabled={isSubmitting}
        style={styles.backButton}
        accessibilityLabel="返回上一步"
      >
        返回上一步
      </Button>
    </>
  );

  // ─── Render: New Password Step ─────────────────────────────────────────────

  const renderNewPasswordStep = () => (
    <>
      <Text variant="headlineMedium" style={styles.title}>
        设置新密码
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        请输入您的新密码
      </Text>

      {/* Server Error */}
      {serverError && (
        <View
          style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}
          accessibilityLabel="错误提示"
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

      {/* New Password Field */}
      <Controller
        control={passwordForm.control}
        name="newPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.fieldContainer}>
            <TextInput
              label="新密码"
              placeholder="请输入新密码"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password-new"
              error={!!passwordForm.formState.errors.newPassword}
              disabled={isSubmitting || isLoading}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={togglePasswordVisibility}
                  accessibilityLabel={showPassword ? '隐藏密码' : '显示密码'}
                />
              }
              accessibilityLabel="新密码输入框"
              accessibilityHint="密码需至少8个字符，包含大小写字母、数字和特殊字符"
            />
            <HelperText type="error" visible={!!passwordForm.formState.errors.newPassword}>
              {passwordForm.formState.errors.newPassword?.message}
            </HelperText>
          </View>
        )}
      />

      {/* Password Strength Indicators */}
      <View style={styles.passwordRulesContainer} accessibilityLabel="密码强度提示">
        <Text variant="labelMedium" style={styles.passwordRulesTitle}>
          密码要求：
        </Text>
        {PASSWORD_RULES.map((rule) => {
          const passed = newPasswordValue ? rule.test(newPasswordValue) : false;
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
        onPress={passwordForm.handleSubmit(handleResetPassword)}
        loading={isSubmitting || isLoading}
        disabled={isSubmitting || isLoading}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
        accessibilityLabel="重置密码"
        accessibilityHint="提交新密码完成重置"
      >
        重置密码
      </Button>

      {/* Back to Code Step */}
      <Button
        mode="text"
        onPress={() => {
          setStep('code');
          setServerError(null);
        }}
        disabled={isSubmitting || isLoading}
        style={styles.backButton}
        accessibilityLabel="返回上一步"
      >
        返回上一步
      </Button>
    </>
  );

  // ─── Main Render ───────────────────────────────────────────────────────────

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
        {step === 'email' && renderEmailStep()}
        {step === 'code' && renderCodeStep()}
        {step === 'newPassword' && renderNewPasswordStep()}
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
    paddingTop: 48,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  timerContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 4,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
  submitButton: {
    marginBottom: 16,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  backButton: {
    marginTop: 8,
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
});
