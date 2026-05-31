/**
 * Review List Screen
 *
 * Displays a user's reviews with two tabs:
 * - 收到的评价 (Reviews received)
 * - 我给出的 (Reviews I gave)
 *
 * Requirements covered:
 * - 8.5: Display historical reviews and average rating
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, useTheme, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../../services/api';
import { Review } from '../../types/review';
import ReviewCard from '../../components/review/ReviewCard';
import { formatRating } from '../../utils/formatters';

type ReviewListRouteParams = {
  ReviewList: {
    userId: string;
    nickname?: string;
  };
};

export default function ReviewListScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProp<ReviewListRouteParams, 'ReviewList'>>();
  const { userId, nickname } = route.params;

  const [activeTab, setActiveTab] = useState('received');
  const [receivedReviews, setReceivedReviews] = useState<Review[]>([]);
  const [givenReviews, setGivenReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const [receivedRes, givenRes] = await Promise.all([
        apiClient.get(`/users/${userId}/reviews`),
        apiClient.get(`/users/${userId}/reviews-given`),
      ]);
      setReceivedReviews(receivedRes.data.reviews || []);
      setAverageRating(receivedRes.data.averageRating || 0);
      setGivenReviews(givenRes.data.reviews || []);
    } catch {
      // Ignore errors
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const currentReviews = activeTab === 'received' ? receivedReviews : givenReviews;

  const renderReviewItem = useCallback(
    ({ item }: { item: Review }) => <ReviewCard review={item} />,
    []
  );

  const keyExtractor = useCallback((item: Review) => item.id, []);

  const renderHeader = useCallback(() => {
    if (activeTab !== 'received' || receivedReviews.length === 0) return null;

    return (
      <View style={[styles.header, { borderBottomColor: theme.colors.outlineVariant }]}>
        <View style={styles.ratingContainer}>
          <MaterialCommunityIcons name="star" size={32} color="#FFB800" />
          <Text variant="headlineMedium" style={styles.ratingValue}>
            {formatRating(averageRating)}
          </Text>
        </View>
        <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginTop: 4 }}>
          共 {receivedReviews.length} 条评价
        </Text>
      </View>
    );
  }, [activeTab, receivedReviews.length, averageRating, theme.colors]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'received', label: `收到的 (${receivedReviews.length})` },
            { value: 'given', label: `给出的 (${givenReviews.length})` },
          ]}
        />
      </View>

      {currentReviews.length === 0 ? (
        <View style={styles.center}>
          <Text variant="bodyLarge" style={{ opacity: 0.6 }}>
            {activeTab === 'received' ? '暂无收到的评价' : '暂无给出的评价'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentReviews}
          renderItem={renderReviewItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
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
});
