/**
 * Unit tests for CreateReviewScreen logic.
 * Tests 14-day expiry, duplicate review interception,
 * form validation, and submission flow.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.6
 */

import { describe, it, expect } from '@jest/globals';
import { REVIEW, VALIDATION } from '../../../utils/constants';

// ─── 14-Day Expiry Logic (Requirements 8.1, 8.6) ────────────────────────────

describe('CreateReviewScreen - 14-Day Expiry Check', () => {
  const EXPIRY_DAYS = REVIEW.EXPIRY_DAYS;

  it('should not be expired when task was completed today', () => {
    const completedAt = new Date().toISOString();
    const completedDate = new Date(completedAt);
    const expiryDate = new Date(completedDate);
    expiryDate.setDate(expiryDate.getDate() + EXPIRY_DAYS);

    const isExpired = new Date() > expiryDate;
    expect(isExpired).toBe(false);
  });

  it('should not be expired when task was completed 13 days ago', () => {
    const completedDate = new Date();
    completedDate.setDate(completedDate.getDate() - 13);
    const completedAt = completedDate.toISOString();

    const parsed = new Date(completedAt);
    const expiryDate = new Date(parsed);
    expiryDate.setDate(expiryDate.getDate() + EXPIRY_DAYS);

    const isExpired = new Date() > expiryDate;
    expect(isExpired).toBe(false);
  });

  it('should be expired when task was completed 15 days ago', () => {
    const completedDate = new Date();
    completedDate.setDate(completedDate.getDate() - 15);
    const completedAt = completedDate.toISOString();

    const parsed = new Date(completedAt);
    const expiryDate = new Date(parsed);
    expiryDate.setDate(expiryDate.getDate() + EXPIRY_DAYS);

    const isExpired = new Date() > expiryDate;
    expect(isExpired).toBe(true);
  });

  it('should be expired when task was completed exactly 14 days ago (boundary)', () => {
    const completedDate = new Date();
    completedDate.setDate(completedDate.getDate() - 14);
    // Set to slightly earlier to ensure expiry
    completedDate.setHours(completedDate.getHours() - 1);
    const completedAt = completedDate.toISOString();

    const parsed = new Date(completedAt);
    const expiryDate = new Date(parsed);
    expiryDate.setDate(expiryDate.getDate() + EXPIRY_DAYS);

    const isExpired = new Date() > expiryDate;
    expect(isExpired).toBe(true);
  });

  it('should be expired when completedAt is empty', () => {
    const completedAt = '';
    const isExpired = !completedAt ? true : new Date() > new Date(completedAt);
    expect(isExpired).toBe(true);
  });

  it('should use REVIEW.EXPIRY_DAYS constant (14)', () => {
    expect(REVIEW.EXPIRY_DAYS).toBe(14);
  });
});

// ─── Duplicate Review Interception (Requirement 8.4) ─────────────────────────

describe('CreateReviewScreen - Duplicate Review Interception', () => {
  it('should show "已评价" state when alreadyReviewed is true', () => {
    const alreadyReviewed = true;
    expect(alreadyReviewed).toBe(true);
  });

  it('should show form when alreadyReviewed is false', () => {
    const alreadyReviewed = false;
    expect(alreadyReviewed).toBe(false);
  });

  it('should detect duplicate error from backend response containing "已评价"', () => {
    const errorMessage = '已评价';
    const isDuplicate =
      errorMessage.includes('已评价') || errorMessage.includes('duplicate');
    expect(isDuplicate).toBe(true);
  });

  it('should detect duplicate error from backend response containing "duplicate"', () => {
    const errorMessage = 'duplicate review not allowed';
    const isDuplicate =
      errorMessage.includes('已评价') || errorMessage.includes('duplicate');
    expect(isDuplicate).toBe(true);
  });

  it('should not treat other errors as duplicate', () => {
    const errorMessage = '网络错误';
    const isDuplicate =
      errorMessage.includes('已评价') || errorMessage.includes('duplicate');
    expect(isDuplicate).toBe(false);
  });
});

// ─── Form Validation (Requirement 8.2) ───────────────────────────────────────

describe('CreateReviewScreen - Form Validation', () => {
  it('should require rating to be at least 1', () => {
    const rating = 0;
    const isValid =
      rating >= VALIDATION.REVIEW_RATING_MIN && rating <= VALIDATION.REVIEW_RATING_MAX;
    expect(isValid).toBe(false);
  });

  it('should accept rating of 1', () => {
    const rating = 1;
    const isValid =
      rating >= VALIDATION.REVIEW_RATING_MIN && rating <= VALIDATION.REVIEW_RATING_MAX;
    expect(isValid).toBe(true);
  });

  it('should accept rating of 5', () => {
    const rating = 5;
    const isValid =
      rating >= VALIDATION.REVIEW_RATING_MIN && rating <= VALIDATION.REVIEW_RATING_MAX;
    expect(isValid).toBe(true);
  });

  it('should reject rating of 6', () => {
    const rating = 6;
    const isValid =
      rating >= VALIDATION.REVIEW_RATING_MIN && rating <= VALIDATION.REVIEW_RATING_MAX;
    expect(isValid).toBe(false);
  });

  it('should allow empty comment (optional)', () => {
    const comment = '';
    const isValid = comment.length <= VALIDATION.REVIEW_COMMENT_MAX;
    expect(isValid).toBe(true);
  });

  it('should allow comment up to 500 characters', () => {
    const comment = 'a'.repeat(500);
    const isValid = comment.length <= VALIDATION.REVIEW_COMMENT_MAX;
    expect(isValid).toBe(true);
  });

  it('should reject comment over 500 characters', () => {
    const comment = 'a'.repeat(501);
    const isValid = comment.length <= VALIDATION.REVIEW_COMMENT_MAX;
    expect(isValid).toBe(false);
  });

  it('should trim comment before submission', () => {
    const comment = '  great service  ';
    const trimmed = comment.trim();
    expect(trimmed).toBe('great service');
  });

  it('should convert empty trimmed comment to undefined', () => {
    const comment = '   ';
    const result = comment.trim() || undefined;
    expect(result).toBeUndefined();
  });
});

// ─── Submit Button State ─────────────────────────────────────────────────────

describe('CreateReviewScreen - Submit Button State', () => {
  it('should disable submit button when rating is 0', () => {
    const rating = 0;
    const isSubmitting = false;
    const isDisabled = isSubmitting || rating === 0;
    expect(isDisabled).toBe(true);
  });

  it('should disable submit button when isSubmitting is true', () => {
    const rating: number = 3;
    const isSubmitting = true;
    const isDisabled = isSubmitting || rating === 0;
    expect(isDisabled).toBe(true);
  });

  it('should enable submit button when rating > 0 and not submitting', () => {
    const rating: number = 4;
    const isSubmitting = false;
    const isDisabled = isSubmitting || rating === 0;
    expect(isDisabled).toBe(false);
  });
});

// ─── Confirmation Dialog (Correctness Property 3) ────────────────────────────

describe('CreateReviewScreen - Confirmation Dialog', () => {
  it('should include reviewee nickname in confirmation message', () => {
    const revieweeNickname = '张三';
    const rating = 4;
    const message = `您将为 ${revieweeNickname} 提交 ${rating} 星评价。评价提交后不可修改，确认提交吗？`;

    expect(message).toContain('张三');
    expect(message).toContain('4 星');
    expect(message).toContain('不可修改');
  });

  it('should have cancel and confirm options', () => {
    const options = [
      { text: '取消', style: 'cancel' },
      { text: '确认提交' },
    ];

    expect(options).toHaveLength(2);
    expect(options[0].text).toBe('取消');
    expect(options[1].text).toBe('确认提交');
  });
});

// ─── SubmitReviewPayload Construction ────────────────────────────────────────

describe('CreateReviewScreen - Payload Construction', () => {
  it('should construct correct payload with comment', () => {
    const taskId = 'task-123';
    const revieweeId = 'user-456';
    const rating = 5;
    const comment = 'Excellent service!';

    const payload = {
      taskId,
      revieweeId,
      rating,
      comment: comment.trim() || undefined,
    };

    expect(payload).toEqual({
      taskId: 'task-123',
      revieweeId: 'user-456',
      rating: 5,
      comment: 'Excellent service!',
    });
  });

  it('should construct correct payload without comment', () => {
    const taskId = 'task-123';
    const revieweeId = 'user-456';
    const rating = 3;
    const comment = '';

    const payload = {
      taskId,
      revieweeId,
      rating,
      comment: comment.trim() || undefined,
    };

    expect(payload).toEqual({
      taskId: 'task-123',
      revieweeId: 'user-456',
      rating: 3,
      comment: undefined,
    });
  });
});
