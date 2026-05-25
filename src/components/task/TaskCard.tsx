/**
 * TaskCard Component
 *
 * Displays a summary card for a task in the task list.
 * Shows task type, description summary (≤50 chars + ellipsis),
 * location, reward, and posted time.
 *
 * Requirements covered:
 * - 5.2: Display task type, description summary, location, reward, time
 */

import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Text, Chip, Icon } from 'react-native-paper';
import { Task } from '../../types/task';
import { TASK_TYPE_LABELS } from '../../utils/constants';
import {
  truncateText,
  formatRelativeTime,
  formatReward,
  formatDistance,
} from '../../utils/formatters';

/** Maximum characters for description summary */
const DESCRIPTION_MAX_LENGTH = 50;

export interface TaskCardProps {
  /** Task data to display */
  task: Task;
  /** Callback when the card is pressed */
  onPress: (task: Task) => void;
}

/**
 * TaskCard renders a single task item in the task list.
 * Memoized to prevent unnecessary re-renders in FlatList.
 */
export const TaskCard: React.FC<TaskCardProps> = memo(({ task, onPress }) => {
  const typeLabel = TASK_TYPE_LABELS[task.type] || task.type;
  const descriptionSummary = truncateText(task.description, DESCRIPTION_MAX_LENGTH);

  return (
    <TouchableOpacity
      onPress={() => onPress(task)}
      activeOpacity={0.7}
      accessibilityLabel={`任务卡片: ${typeLabel}`}
      accessibilityRole="button"
      accessibilityHint="点击查看任务详情"
    >
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.content}>
          {/* Header: Type chip + Reward */}
          <View style={styles.header}>
            <Chip
              style={styles.typeChip}
              textStyle={styles.typeChipText}
              compact
              accessibilityLabel={`任务类型: ${typeLabel}`}
            >
              {typeLabel}
            </Chip>
            <Text
              style={styles.reward}
              accessibilityLabel={`报酬: ${formatReward(task.reward)}`}
            >
              {formatReward(task.reward)}
            </Text>
          </View>

          {/* Description summary */}
          <Text
            style={styles.description}
            numberOfLines={2}
            accessibilityLabel={`描述: ${descriptionSummary}`}
          >
            {descriptionSummary}
          </Text>

          {/* Footer: Location + Time + Distance */}
          <View style={styles.footer}>
            <View style={styles.locationRow}>
              <Icon source="map-marker-outline" size={14} color="#757575" />
              <Text
                style={styles.location}
                numberOfLines={1}
                accessibilityLabel={`地点: ${task.location.address}`}
              >
                {task.location.address}
              </Text>
            </View>
            <View style={styles.metaRow}>
              {task.distance !== undefined && (
                <Text
                  style={styles.distance}
                  accessibilityLabel={`距离: ${formatDistance(task.distance)}`}
                >
                  {formatDistance(task.distance)}
                </Text>
              )}
              <Text
                style={styles.time}
                accessibilityLabel={`发布时间: ${formatRelativeTime(task.createdAt)}`}
              >
                {formatRelativeTime(task.createdAt)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
});

TaskCard.displayName = 'TaskCard';

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
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
  typeChip: {
    backgroundColor: '#E3F2FD',
    height: 28,
  },
  typeChipText: {
    fontSize: 12,
    color: '#1565C0',
  },
  reward: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E65100',
  },
  description: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  location: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distance: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  time: {
    fontSize: 12,
    color: '#9E9E9E',
  },
});

export default TaskCard;
