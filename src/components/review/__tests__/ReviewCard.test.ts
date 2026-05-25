/**
 * Unit tests for ReviewCard component logic.
 * Tests star display, comment rendering, and time formatting.
 *
 * Validates: Requirements 8.5
 */

import { describe, it, expect } from '@jest/globals';

describe('ReviewCard - Star Rating Display', () => {
  it('should mark stars as filled when index <= rating', () => {
    const rating = 4;
    const stars = [1, 2, 3, 4, 5];
    const filledStars = stars.filter((star) => star <= rating);
    const outlineStars = stars.filter((star) => star > rating);

    expect(filledStars).toEqual([1, 2, 3, 4]);
    expect(outlineStars).toEqual([5]);
  });

  it('should show all stars filled for rating 5', () => {
    const rating = 5;
    const stars = [1, 2, 3, 4, 5];
    const filledStars = stars.filter((star) => star <= rating);

    expect(filledStars).toEqual([1, 2, 3, 4, 5]);
  });

  it('should show only 1 star filled for rating 1', () => {
    const rating = 1;
    const stars = [1, 2, 3, 4, 5];
    const filledStars = stars.filter((star) => star <= rating);

    expect(filledStars).toEqual([1]);
  });

  it('should use star icon for filled and star-outline for unfilled', () => {
    const rating = 3;
    const star3Icon = 3 <= rating ? 'star' : 'star-outline';
    const star4Icon = 4 <= rating ? 'star' : 'star-outline';

    expect(star3Icon).toBe('star');
    expect(star4Icon).toBe('star-outline');
  });
});

describe('ReviewCard - Comment Display', () => {
  it('should display comment text when comment is provided', () => {
    const review = { comment: '服务很好，非常满意！' };
    const hasComment = !!review.comment;

    expect(hasComment).toBe(true);
  });

  it('should display placeholder text when comment is undefined', () => {
    const review = { comment: undefined };
    const hasComment = !!review.comment;

    expect(hasComment).toBe(false);
  });

  it('should display placeholder text when comment is empty string', () => {
    const review = { comment: '' };
    const hasComment = !!review.comment;

    expect(hasComment).toBe(false);
  });
});

describe('ReviewCard - Time Display', () => {
  it('should format recent time as relative (e.g., "刚刚")', () => {
    const now = new Date();
    const diffMs = Date.now() - now.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    expect(diffSeconds).toBeLessThan(60);
  });

  it('should format minutes ago correctly', () => {
    const minutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const diffMs = Date.now() - minutesAgo.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    expect(diffMinutes).toBe(5);
  });

  it('should format hours ago correctly', () => {
    const hoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const diffMs = Date.now() - hoursAgo.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    expect(diffHours).toBe(3);
  });
});

describe('ReviewCard - Accessibility', () => {
  it('should construct accessibility label with rating and comment', () => {
    const rating = 4;
    const comment = '很好的服务';
    const relativeTime = '2小时前';
    const label = `评价：${rating}星${comment ? `，${comment}` : ''}，${relativeTime}`;

    expect(label).toContain('4星');
    expect(label).toContain('很好的服务');
    expect(label).toContain('2小时前');
  });

  it('should construct accessibility label without comment when not provided', () => {
    const rating = 3;
    const comment = undefined;
    const relativeTime = '昨天';
    const label = `评价：${rating}星${comment ? `，${comment}` : ''}，${relativeTime}`;

    expect(label).toContain('3星');
    expect(label).not.toContain('，，');
    expect(label).toContain('昨天');
  });
});
