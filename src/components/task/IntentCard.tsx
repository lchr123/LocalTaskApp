/**
 * IntentCard Component
 *
 * Displays a helper's intent information in a card format.
 * Shows helper nickname, average rating (stars), completed task count,
 * and optional message. Includes a "选择" button for the poster to select.
 *
 * Requirements covered:
 * - 6.3: Show intent list entry with helper details
 * - 6.4: Display helper nickname, rating, completed count, message
 * - 6.5: Provide selection action for the poster
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Button, Icon } from 'react-native-paper';
import { Intent } from '../../types/task';
import { formatRating } from '../../utils/formatters';

export interface IntentCardProps {
  /** Intent data to display */
  intent: Intent;
  /** Callback when the "选择" button is pressed */
  onSelect: (intent: Intent) => void;
  /** Whether selection is disabled (e.g., already selected or loading) */
  disabled?: boolean;
}

/**
 * IntentCard renders a single helper intent in the intent list.
 * Memoized to prevent unnecessary re-renders in FlatList.
 */
export const IntentCard: React.FC<IntentCardProps> = memo(({ intent, onSelect, disabled }) => {
  const isSelected = intent.status === 'selected';
  const isRejected = intent.status === 'rejected';
  const isWithdrawn = intent.status === 'withdrawn';
  const showSelectButton = intent.status === 'pending' && !disabled;

  const getStatusLabel = (): string | null => {
    if (isSelected) return '已选择';
    if (isRejected) return '未选中';
    if (isWithdrawn) return '已撤回';
    return null;
  };

  const statusLabel = getStatusLabel();

  return (
    <Card
      style={[styles.card, isSelected && styles.selectedCard]}
      mode="elevated"
      accessibilityLabel={`帮手意向: ${intent.helperNickname}`}
    >
      <Card.Content style={styles.content}>
        {/* Header: Nickname + Status */}
        <View style={styles.header}>
          <View style={styles.nicknameRow}>
            <Icon source="account" size={20} color="#1976D2" />
            <Text
              style={styles.nickname}
              accessibilityLabel={`帮手昵称: ${intent.helperNickname}`}
            >
              {intent.helperNickname}
            </Text>
          </View>
          {statusLabel && (
            <Text
              style={[
                styles.statusBadge,
                isSelected && styles.selectedBadge,
                isRejected && styles.rejectedBadge,
                isWithdrawn && styles.withdrawnBadge,
              ]}
              accessibilityLabel={`状态: ${statusLabel}`}
            >
              {statusLabel}
            </Text>
          )}
        </View>

        {/* Rating + Completed Count */}
        <View style={styles.statsRow}>
          <View style={styles.ratingRow}>
            <Icon source="star" size={16} color="#FFB800" />
            <Text
              style={styles.ratingText}
              accessibilityLabel={`平均评分: ${formatRating(intent.helperRating)}星`}
            >
              {formatRating(intent.helperRating)}
            </Text>
          </View>
          <View style={styles.completedRow}>
            <Icon source="check-circle-outline" size={16} color="#4CAF50" />
            <Text
              style={styles.completedText}
              accessibilityLabel={`历史完成数: ${intent.helperCompletedCount}次`}
            >
              已完成 {intent.helperCompletedCount} 次
            </Text>
          </View>
        </View>

        {/* Optional Message */}
        {intent.message && (
          <View style={styles.messageContainer}>
            <Icon source="message-text-outline" size={14} color="#757575" />
            <Text
              style={styles.message}
              numberOfLines={3}
              accessibilityLabel={`留言: ${intent.message}`}
            >
              {intent.message}
            </Text>
          </View>
        )}

        {/* Select Button */}
        {showSelectButton && (
          <Button
            mode="contained"
            onPress={() => onSelect(intent)}
            style={styles.selectButton}
            accessibilityLabel={`选择帮手 ${intent.helperNickname}`}
            accessibilityHint="点击选择此帮手"
          >
            选择
          </Button>
        )}
      </Card.Content>
    </Card>
  );
});

IntentCard.displayName = 'IntentCard';

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedCard: {
    borderColor: '#4CAF50',
    borderWidth: 1.5,
  },
  content: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nickname: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  selectedBadge: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  rejectedBadge: {
    backgroundColor: '#FAFAFA',
    color: '#9E9E9E',
  },
  withdrawnBadge: {
    backgroundColor: '#FFF3E0',
    color: '#E65100',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#424242',
    fontWeight: '500',
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 13,
    color: '#616161',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  message: {
    fontSize: 13,
    color: '#616161',
    lineHeight: 18,
    flex: 1,
  },
  selectButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
});

export default IntentCard;
