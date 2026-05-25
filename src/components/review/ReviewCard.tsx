/**
 * ReviewCard Component
 *
 * Displays a single review with star rating, comment text, and relative time.
 * Used in the ReviewListScreen to render each review item.
 *
 * Requirements covered:
 * - 8.5: Display historical reviews and average rating on user's profile page
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Review } from '../../types/review';
import { formatRelativeTime } from '../../utils/formatters';

export interface ReviewCardProps {
  /** The review data to display */
  review: Review;
}

/**
 * ReviewCard
 *
 * Renders a card showing:
 * - Star rating (filled stars based on rating value)
 * - Comment text (if provided)
 * - Relative time since the review was created
 */
export default function ReviewCard({ review }: ReviewCardProps) {
  const theme = useTheme();

  const relativeTime = formatRelativeTime(review.createdAt);

  return (
    <View
      style={[styles.container, { borderBottomColor: theme.colors.outlineVariant }]}
      accessibilityLabel={`评价：${review.rating}星${review.comment ? `，${review.comment}` : ''}，${relativeTime}`}
    >
      {/* Star Rating Row */}
      <View style={styles.ratingRow} accessibilityLabel={`评分${review.rating}星`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialCommunityIcons
            key={star}
            name={star <= review.rating ? 'star' : 'star-outline'}
            size={18}
            color={star <= review.rating ? '#FFB800' : theme.colors.outline}
          />
        ))}
      </View>

      {/* Comment */}
      {review.comment ? (
        <Text
          variant="bodyMedium"
          style={styles.comment}
          accessibilityLabel={`评价内容：${review.comment}`}
        >
          {review.comment}
        </Text>
      ) : (
        <Text
          variant="bodyMedium"
          style={[styles.noComment, { color: theme.colors.outline }]}
          accessibilityLabel="无文字评价"
        >
          暂无文字评价
        </Text>
      )}

      {/* Time */}
      <Text
        variant="bodySmall"
        style={[styles.time, { color: theme.colors.outline }]}
        accessibilityLabel={`评价时间：${relativeTime}`}
      >
        {relativeTime}
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 8,
  },
  comment: {
    marginBottom: 8,
    lineHeight: 22,
  },
  noComment: {
    marginBottom: 8,
    fontStyle: 'italic',
  },
  time: {
    fontSize: 12,
  },
});
