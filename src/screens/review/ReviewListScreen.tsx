/**
 * Review List Screen
 *
 * Displays a user's historical reviews with average rating summary.
 * Uses FlatList for efficient rendering of the review list.
 *
 * Requirements covered:
 * - 8.5: Display historical reviews and average rating (1 decimal place) on user's profile page
 */

import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useReviewStore } from '../../stores/reviewStore';
import { Review } from '../../types/review';
import ReviewCard from '../../components/review/ReviewCard';
import { LoadingIndicator, ErrorRetry, EmptyState } from '../../components/common';
import { formatRating } from '../../utils/formatters';

// ─── Route Params ────────────────────────────────────────────────────────────

type ReviewListRouteParams = {
  ReviewList: {
    userId: string;
    nickname?: string;
  };
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReviewListScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProp<ReviewListRouteParams, 'ReviewList'>>();
  const { userId, nickname } = route.params;

  const {
    reviews,
    averageRating,
    totalReviews,
    isLoading,
    error,
    fetchUserReviews,
  } = useReviewStore();

  /**
   * Fetch reviews on mount.
   */
  useEffect(() => {
    fetchUserReviews(userId);
  }, [userId, fetchUserReviews]);

  /**
   * Handle retry on error.
   */
  const handleRetry = useCallback(async () => {
    await fetchUserReviews(userId);
  }, [userId, fetchUserReviews]);

  /**
   * Render each review item.
   */
  const renderReviewItem = useCallback(
    ({ item }: { item: Review }) => <ReviewCard review={item} />,
    []
  );

  /**
   * Key extractor for FlatList.
   */
  const keyExtractor = useCallback((item: Review) => item.id, []);

  /**
   * Render the header with average rating summary.
   * Requirement 8.5: Display average rating with 1 decimal place.
   */
  const renderHeader = useCallback(() => {
    if (totalReviews === 0) return null;

    return (
      <View
        style={[styles.header, { borderBottomColor: theme.colors.outlineVariant }]}
        accessibilityLabel={`平均评分${formatRating(averageRating)}星，共${totalReviews}条评价`}
      >
        <View style={styles.ratingContainer}>
          <MaterialCommunityIcons
            name="star"
            size={32}
            color="#FFB800"
          />
          <Text variant="headlineMedium" style={styles.ratingValue}>
            {formatRating(averageRating)}
          </Text>
        </View>
        <Text
          variant="bodyMedium"
          style={[styles.totalReviews, { color: theme.colors.outline }]}
          accessibilityLabel={`共${totalReviews}条评价`}
        >
          共 {totalReviews} 条评价
        </Text>
      </View>
    );
  }, [averageRating, totalReviews, theme.colors.outlineVariant, theme.colors.outline]);

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.container} accessibilityLabel="评价列表加载中">
        <LoadingIndicator mode="fullscreen" message="加载评价中..." />
      </View>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <View style={styles.container} accessibilityLabel="评价列表加载失败">
        <ErrorRetry
          errorMessage={error}
          onRetry={handleRetry}
          accessibilityLabel="评价加载失败，点击重试"
        />
      </View>
    );
  }

  // ─── Empty State ───────────────────────────────────────────────────────────

  if (reviews.length === 0) {
    return (
      <View style={styles.container} accessibilityLabel="暂无评价">
        <EmptyState
          icon="star-outline"
          message="暂无评价"
          description={nickname ? `${nickname} 还没有收到评价` : '该用户还没有收到评价'}
          accessibilityLabel="暂无评价空状态"
        />
      </View>
    );
  }

  // ─── Review List ───────────────────────────────────────────────────────────

  return (
    <View style={styles.container} accessibilityLabel="评价列表页面">
      <FlatList
        data={reviews}
        renderItem={renderReviewItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="评价列表"
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingValue: {
    fontWeight: 'bold',
  },
  totalReviews: {
    marginTop: 4,
  },
});
