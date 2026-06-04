/**
 * Create Review Screen
 *
 * Allows users to submit a review for a completed task.
 * Includes star rating (required), text comment (optional),
 * duplicate review interception, 14-day expiry check,
 * and confirmation dialog before submission.
 *
 * Requirements covered:
 * - 8.1: Display review entry after task completion (14-day window)
 * - 8.2: Provide 1-5 star rating (required) and text comment (optional, ≤500 chars)
 * - 8.3: Submit review and display success
 * - 8.4: Block duplicate review submission with "已评价" message
 * - 8.6: Close review entry after 14-day expiry
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text, TextInput, Button, Snackbar, useTheme } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useReviewStore } from '../../stores/reviewStore';
import { appDialog } from '../../stores/dialogStore';
import StarRating from '../../components/review/StarRating';
import { VALIDATION, REVIEW } from '../../utils/constants';

// ─── Route Params ────────────────────────────────────────────────────────────

type CreateReviewRouteParams = {
  CreateReview: {
    taskId: string;
    revieweeId: string;
    revieweeNickname: string;
    /** ISO 8601 date string when the task was completed */
    completedAt: string;
    /** Whether the user has already reviewed this task */
    alreadyReviewed?: boolean;
  };
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateReviewScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<CreateReviewRouteParams, 'CreateReview'>>();

  const { taskId, revieweeId, revieweeNickname, completedAt, alreadyReviewed } =
    route.params;

  const { submitReview, isSubmitting } = useReviewStore();

  // Form state
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Check if the 14-day review window has expired.
   * Requirement 8.1 & 8.6: Review entry available within 14 days of task completion.
   */
  const isExpired = useMemo(() => {
    if (!completedAt) return true;
    const completedDate = new Date(completedAt);
    const expiryDate = new Date(completedDate);
    expiryDate.setDate(expiryDate.getDate() + REVIEW.EXPIRY_DAYS);
    return new Date() > expiryDate;
  }, [completedAt]);

  /**
   * Validate the form before submission.
   */
  const validateForm = useCallback((): boolean => {
    if (rating < VALIDATION.REVIEW_RATING_MIN || rating > VALIDATION.REVIEW_RATING_MAX) {
      setRatingError('请选择评分（1-5星）');
      return false;
    }
    setRatingError(null);
    return true;
  }, [rating]);

  /**
   * Handle rating change from StarRating component.
   */
  const handleRatingChange = useCallback((newRating: number) => {
    setRating(newRating);
    if (ratingError) {
      setRatingError(null);
    }
  }, [ratingError]);

  /**
   * Perform the actual review submission.
   * Requirement 8.3: Save review and display success.
   * Requirement 8.4: Handle duplicate review error from backend.
   */
  const performSubmit = useCallback(async () => {
    setSubmitError(null);

    try {
      await submitReview({
        taskId,
        revieweeId,
        rating,
        comment: comment.trim() || undefined,
      });

      if (Platform.OS === 'web') {
        await appDialog.alert({ title: '成功', message: '✅ 评价提交成功！' });
        navigation.goBack();
      } else {
        setSuccessVisible(true);
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '提交评价失败';

      // Requirement 8.4: Duplicate review interception
      if (message.includes('已评价') || message.includes('duplicate')) {
        setSubmitError('您已对该任务提交过评价');
      } else {
        setSubmitError(message);
      }
    }
  }, [submitReview, taskId, revieweeId, rating, comment, navigation]);

  /**
   * Show confirmation dialog before submitting.
   * Requirement 8.3: Correctness Property 3 - reviews are immutable once submitted.
   */
  const handleSubmitPress = useCallback(async () => {
    if (!validateForm()) return;

    const confirmed = await appDialog.confirm({
      title: '确认提交评价',
      message: `您将为 ${revieweeNickname} 提交 ${rating} 星评价。评价提交后不可修改，确认提交吗？`,
      confirmText: '确认提交',
    });
    if (confirmed) {
      performSubmit();
    }
  }, [validateForm, rating, revieweeNickname, performSubmit]);

  // ─── Render: Already Reviewed ────────────────────────────────────────────

  if (alreadyReviewed) {
    return (
      <View style={styles.centeredContainer} accessibilityLabel="已评价提示页面">
        <Text variant="headlineSmall" style={styles.centeredTitle}>
          已评价
        </Text>
        <Text
          variant="bodyMedium"
          style={styles.centeredMessage}
          accessibilityLabel="您已对该任务提交过评价"
        >
          您已对该任务提交过评价，评价不可重复提交。
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="返回按钮"
        >
          返回
        </Button>
      </View>
    );
  }

  // ─── Render: Expired ─────────────────────────────────────────────────────

  if (isExpired) {
    return (
      <View style={styles.centeredContainer} accessibilityLabel="评价已过期提示页面">
        <Text variant="headlineSmall" style={styles.centeredTitle}>
          评价已关闭
        </Text>
        <Text
          variant="bodyMedium"
          style={styles.centeredMessage}
          accessibilityLabel="评价入口已过期"
        >
          该任务完成已超过 {REVIEW.EXPIRY_DAYS} 天，评价入口已关闭。
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="返回按钮"
        >
          返回
        </Button>
      </View>
    );
  }

  // ─── Render: Review Form ─────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      accessibilityLabel="提交评价页面"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text variant="headlineMedium" style={styles.title}>
          评价
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          为 {revieweeNickname} 的服务打分
        </Text>

        {/* Error Banner */}
        {submitError && (
          <View
            style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}
            accessibilityLabel="提交错误提示"
            accessibilityRole="alert"
          >
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onErrorContainer }}
            >
              {submitError}
            </Text>
          </View>
        )}

        {/* Star Rating (Required) - Requirement 8.2 */}
        <StarRating
          value={rating}
          onChange={handleRatingChange}
          disabled={isSubmitting}
          error={ratingError ?? undefined}
          label="评分"
        />

        {/* Comment Input (Optional) - Requirement 8.2 */}
        <View style={styles.commentSection}>
          <Text variant="titleMedium" style={styles.commentLabel}>
            文字评价（选填）
          </Text>
          <TextInput
            mode="outlined"
            placeholder="分享您的体验..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            maxLength={VALIDATION.REVIEW_COMMENT_MAX}
            disabled={isSubmitting}
            style={styles.commentInput}
            accessibilityLabel="文字评价输入框"
            accessibilityHint={`选填，最多${VALIDATION.REVIEW_COMMENT_MAX}个字符`}
          />
          <Text
            variant="bodySmall"
            style={styles.charCount}
            accessibilityLabel={`已输入${comment.length}个字符，最多${VALIDATION.REVIEW_COMMENT_MAX}个字符`}
          >
            {comment.length} / {VALIDATION.REVIEW_COMMENT_MAX}
          </Text>
        </View>

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmitPress}
          loading={isSubmitting}
          disabled={isSubmitting || rating === 0}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
          accessibilityLabel="提交评价按钮"
          accessibilityHint="提交前会显示确认弹窗"
        >
          提交评价
        </Button>
      </ScrollView>

      {/* Success Snackbar - Requirement 8.3 */}
      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={1500}
        style={styles.snackbar}
        accessibilityLabel="评价提交成功提示"
      >
        ✅ 评价提交成功！
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    marginBottom: 24,
    opacity: 0.7,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  commentInput: {
    minHeight: 100,
  },
  charCount: {
    marginTop: 4,
    textAlign: 'right',
    opacity: 0.6,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  snackbar: {
    marginBottom: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  centeredTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  centeredMessage: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
  },
  backButton: {
    borderRadius: 8,
    minWidth: 120,
  },
});
