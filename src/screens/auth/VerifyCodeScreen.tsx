/**
 * Verify Code Screen
 *
 * Implements the 6-digit verification code confirmation flow after registration.
 * Handles code expiry (10 minutes), error attempt limits (3 attempts),
 * and resend functionality (max 5 times).
 *
 * Requirements covered:
 * - 1.4: Correct verification code → complete registration and auto-login
 * - 1.7: Invalid/expired code → error prompt, allow resend (max 5 times)
 * - 1.8: 3 consecutive wrong codes → invalidate current code, prompt resend
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  Alert,
} from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useAuthStore } from '../../stores/authStore';
import { appDialog } from '../../stores/dialogStore';
import { resetToMain } from '../../navigation/navigationRef';
import { VALIDATION } from '../../utils/constants';

// ─── Constants ───────────────────────────────────────────────────────────────

const CODE_LENGTH = VALIDATION.VERIFICATION_CODE_LENGTH;
const MAX_ATTEMPTS = VALIDATION.VERIFICATION_CODE_MAX_ATTEMPTS;
const MAX_RESEND = VALIDATION.VERIFICATION_CODE_MAX_RESEND;
const EXPIRY_MINUTES = VALIDATION.VERIFICATION_CODE_EXPIRY_MINUTES;

// ─── Types ───────────────────────────────────────────────────────────────────

interface VerifyCodeScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
  route: {
    params: {
      identifier: string;
      method: 'email' | 'phone';
      password?: string;
    };
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function VerifyCodeScreen({ navigation, route }: VerifyCodeScreenProps) {
  const theme = useTheme();
  const { identifier, method, password } = route.params;
  const {
    confirmRegistration,
    resendVerificationCode,
    login,
    isLoading,
    clearError,
  } = useAuthStore();

  // Code input state - each digit stored separately for individual input boxes
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [errorAttempts, setErrorAttempts] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isCodeInvalidated, setIsCodeInvalidated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Timer for code expiry
  const [expiryTime, setExpiryTime] = useState<number>(
    Date.now() + EXPIRY_MINUTES * 60 * 1000
  );
  const [remainingSeconds, setRemainingSeconds] = useState(EXPIRY_MINUTES * 60);

  // Refs for individual digit inputs
  const inputRefs = useRef<(RNTextInput | null)[]>(Array(CODE_LENGTH).fill(null));

  // ─── Expiry Timer ────────────────────────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiryTime]);

  // ─── Resend Cooldown Timer ───────────────────────────────────────────────

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const isCodeExpired = remainingSeconds <= 0;
  const isMaxAttemptsReached = errorAttempts >= MAX_ATTEMPTS;
  const isMaxResendReached = resendCount >= MAX_RESEND;
  const fullCode = codeDigits.join('');
  const isCodeComplete = fullCode.length === CODE_LENGTH && /^\d+$/.test(fullCode);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── Reset Code State ────────────────────────────────────────────────────

  const resetCodeInput = useCallback(() => {
    setCodeDigits(Array(CODE_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  }, []);

  // ─── Handle Digit Input ──────────────────────────────────────────────────

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      // Only allow single digit
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
      // Handle backspace - move to previous input
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

  // ─── Submit Verification Code ────────────────────────────────────────────

  const handleVerify = useCallback(async () => {
    if (!isCodeComplete || isVerifying) return;

    // Check if code is expired (Requirement 1.7)
    if (isCodeExpired) {
      setServerError('验证码已过期，请重新发送验证码');
      return;
    }

    // Check if code has been invalidated due to max attempts (Requirement 1.8)
    if (isCodeInvalidated || isMaxAttemptsReached) {
      setServerError('当前验证码已失效，请重新发送验证码');
      return;
    }

    setServerError(null);
    clearError();
    setIsVerifying(true);

    try {
      // Confirm registration with Cognito
      await confirmRegistration(identifier, fullCode);

      // Auto-login after successful verification
      if (password) {
        try {
          await login(identifier, password);

          // Show profile completion guide
          const goToProfile = await appDialog.confirm({
            title: '欢迎加入 🎉',
            message: '完善个人资料可以让发布者更信任你，获得更多任务机会。',
            confirmText: '去完善',
            cancelText: '稍后再说',
          });

          resetToMain();

          if (goToProfile) {
            // Small delay to let navigation settle, then navigate to EditProfile
            setTimeout(() => {
              const { navigationRef } = require('../../navigation/navigationRef');
              if (navigationRef.isReady()) {
                navigationRef.navigate('Profile', { screen: 'EditProfile' });
              }
            }, 300);
          }
          return;
        } catch {
          // Auto-login failed, fall back to manual login
        }
      }

      // Fallback: navigate to login page
      if (Platform.OS === 'web') {
        await appDialog.alert({ title: '注册成功 🎉', message: '账号验证完成，请使用您的邮箱和密码登录。' });
        navigation.navigate('Login');
      } else {
        Alert.alert(
          '注册成功 🎉',
          '账号验证完成，请使用您的邮箱和密码登录。',
          [{ text: '去登录', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (error: unknown) {
      // Debug: log the actual error to understand its format
      console.log('[VerifyCode] error:', JSON.stringify(error, Object.getOwnPropertyNames(error as object)));
      console.log('[VerifyCode] error.message:', (error as any)?.message);
      console.log('[VerifyCode] error.name:', (error as any)?.name);

      // Check if user is already confirmed (came from re-registration flow)
      if (isAlreadyConfirmedError(error)) {
        // Try auto-login for already confirmed users
        if (password) {
          try {
            await login(identifier, password);
            if (Platform.OS === 'web') {
              await appDialog.alert({ message: '该账号已验证，已自动登录。' });
            } else {
              Alert.alert('账号已验证', '已自动登录。');
            }
            resetToMain();
            return;
          } catch {
            // Auto-login failed, fall back to manual
          }
        }

        if (Platform.OS === 'web') {
          await appDialog.alert({ message: '该账号已验证，请直接登录。' });
          navigation.navigate('Login');
        } else {
          Alert.alert(
            '账号已验证',
            '该账号已完成验证，请直接登录。',
            [{ text: '去登录', onPress: () => navigation.navigate('Login') }]
          );
        }
        return;
      }

      const newAttempts = errorAttempts + 1;
      setErrorAttempts(newAttempts);

      // Requirement 1.8: 3 consecutive wrong codes → invalidate current code
      if (newAttempts >= MAX_ATTEMPTS) {
        setIsCodeInvalidated(true);
        setServerError(
          '验证码已失效（连续3次输入错误）。请重新发送验证码。'
        );
        resetCodeInput();
      } else {
        // Requirement 1.7: show error with remaining attempts
        const remainingAttempts = MAX_ATTEMPTS - newAttempts;
        const errorMessage = mapVerifyError(error);
        setServerError(
          `${errorMessage}（剩余${remainingAttempts}次尝试机会）`
        );
      }
    } finally {
      setIsVerifying(false);
    }
  }, [
    isCodeComplete,
    isVerifying,
    isCodeExpired,
    isCodeInvalidated,
    isMaxAttemptsReached,
    identifier,
    fullCode,
    errorAttempts,
    confirmRegistration,
    clearError,
    navigation,
    resetCodeInput,
  ]);

  // ─── Resend Verification Code ────────────────────────────────────────────

  const handleResend = useCallback(async () => {
    // Requirement 1.7: max 5 resend attempts
    if (isMaxResendReached || isResending || resendCooldown > 0) return;

    setIsResending(true);
    setServerError(null);
    clearError();

    try {
      await resendVerificationCode(identifier);

      // Reset state for new code
      setResendCount((prev) => prev + 1);
      setErrorAttempts(0);
      setIsCodeInvalidated(false);
      setExpiryTime(Date.now() + EXPIRY_MINUTES * 60 * 1000);
      resetCodeInput();

      // Set cooldown (60 seconds between resends)
      setResendCooldown(60);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '发送验证码失败，请稍后重试';
      setServerError(message);
    } finally {
      setIsResending(false);
    }
  }, [
    isMaxResendReached,
    isResending,
    resendCooldown,
    identifier,
    resendVerificationCode,
    clearError,
    resetCodeInput,
  ]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.content}>
        {/* Title */}
        <Text variant="headlineMedium" style={styles.title}>
          输入验证码
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          验证码已发送至 {identifier}
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

        {/* Error Banner */}
        {serverError && (
          <View
            style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}
            accessibilityLabel="验证错误提示"
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
                (isCodeInvalidated || isMaxAttemptsReached) && {
                  borderColor: theme.colors.error,
                },
              ]}
              value={codeDigits[index]}
              onChangeText={(value) => handleDigitChange(index, value)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!isCodeInvalidated && !isMaxAttemptsReached && !isCodeExpired}
              accessibilityLabel={`验证码第${index + 1}位`}
              accessibilityHint="请输入一位数字"
            />
          ))}
        </View>

        {/* Attempt Counter */}
        {errorAttempts > 0 && !isMaxAttemptsReached && (
          <Text
            variant="bodySmall"
            style={[styles.attemptText, { color: theme.colors.error }]}
            accessibilityLabel={`已错误${errorAttempts}次，最多${MAX_ATTEMPTS}次`}
          >
            已尝试 {errorAttempts}/{MAX_ATTEMPTS} 次
          </Text>
        )}

        {/* Verify Button */}
        <Button
          mode="contained"
          onPress={handleVerify}
          loading={isVerifying || isLoading}
          disabled={
            !isCodeComplete ||
            isVerifying ||
            isLoading ||
            isCodeExpired ||
            isCodeInvalidated ||
            isMaxAttemptsReached
          }
          style={styles.verifyButton}
          contentStyle={styles.buttonContent}
          accessibilityLabel="确认验证码"
          accessibilityHint="提交验证码完成注册"
        >
          确认
        </Button>

        {/* Resend Code */}
        <View style={styles.resendContainer}>
          {isMaxResendReached ? (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.error }}
              accessibilityLabel="已达到最大重发次数"
            >
              已达到最大重发次数（{MAX_RESEND}次）
            </Text>
          ) : (
            <>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                没有收到验证码？
              </Text>
              <Button
                mode="text"
                onPress={handleResend}
                loading={isResending}
                disabled={isResending || resendCooldown > 0 || isMaxResendReached}
                compact
                accessibilityLabel={
                  resendCooldown > 0
                    ? `${resendCooldown}秒后可重新发送`
                    : '重新发送验证码'
                }
              >
                {resendCooldown > 0
                  ? `重新发送 (${resendCooldown}s)`
                  : '重新发送'}
              </Button>
            </>
          )}
        </View>

        {/* Resend Counter */}
        {resendCount > 0 && (
          <Text
            variant="bodySmall"
            style={[styles.resendCountText, { color: theme.colors.onSurfaceVariant }]}
            accessibilityLabel={`已重发${resendCount}次，最多${MAX_RESEND}次`}
          >
            已重发 {resendCount}/{MAX_RESEND} 次
          </Text>
        )}

        {/* Back to Register */}
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="返回注册页面"
        >
          返回注册
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Error Mapping ───────────────────────────────────────────────────────────

/**
 * Maps Cognito verification errors to user-friendly messages.
 */
function mapVerifyError(error: unknown): string {
  if (!(error instanceof Error)) {
    return '验证码确认失败';
  }

  const message = error.message.toLowerCase();

  if (message.includes('codemismatch') || message.includes('code mismatch')) {
    return '验证码错误';
  }

  if (message.includes('expired') || message.includes('expiredcode')) {
    return '验证码已过期';
  }

  if (message.includes('limit') || message.includes('too many')) {
    return '尝试次数过多，请稍后重试';
  }

  if (message.includes('not found') || message.includes('usernotfound')) {
    return '用户不存在，请重新注册';
  }

  return '验证码确认失败，请重试';
}

/**
 * Check if the error indicates the user is already confirmed.
 * Cognito returns: {"__type":"NotAuthorizedException","message":"User cannot be confirmed. Current status is CONFIRMED"}
 */
function isAlreadyConfirmedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('cannot be confirmed')
    || msg.includes('current status is confirmed')
    || msg.includes('already confirmed');
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 8,
    opacity: 0.7,
    textAlign: 'center',
  },
  timerContainer: {
    marginBottom: 16,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
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
  attemptText: {
    marginBottom: 16,
  },
  verifyButton: {
    width: '100%',
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  resendCountText: {
    marginBottom: 16,
  },
  backButton: {
    marginTop: 8,
  },
});
