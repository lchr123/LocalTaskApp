/**
 * User Received Reviews Screen
 *
 * Displays all reviews received by a specific user.
 * Used when viewing a helper's reviews from the intent list.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../../services/api';
import { Review } from '../../types/review';
import ReviewCard from '../../components/review/ReviewCard';
import { formatRating } from '../../utils/formatters';

type RouteParams = {
  UserReceivedReviews: {
    userId: string;
    nickname?: string;
  };
};

export default function UserReceivedReviewsScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProp<RouteParams, 'UserReceivedReviews'>>();
  const { userId, nickname } = route.params;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get(`/users/${userId}/reviews`);
        setReviews(res.data.reviews || []);
        setAverageRating(res.data.averageRating || 0);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, [userId]);

  const renderItem = useCallback(
    ({ item }: { item: Review }) => <ReviewCard review={item} />,
    []
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary header */}
      <View style={styles.header}>
        <View style={styles.ratingRow}>
          <MaterialCommunityIcons name="star" size={20} color="#FFB800" />
          <Text variant="titleMedium" style={{ fontWeight: '600' }}>
            {formatRating(averageRating)}
          </Text>
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
          {nickname ? `${nickname} 收到的评价` : '收到的评价'} · 共 {reviews.length} 条
        </Text>
      </View>

      {reviews.length === 0 ? (
        <View style={styles.center}>
          <Text variant="bodyLarge" style={{ opacity: 0.6 }}>
            暂无评价
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  list: { paddingVertical: 8 },
});
