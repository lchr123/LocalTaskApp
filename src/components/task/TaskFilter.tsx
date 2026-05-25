/**
 * TaskFilter Component
 *
 * Provides filtering controls for the task list.
 * Supports filtering by task type (chips) and reward range (text inputs).
 * Designed as a collapsible section that can be toggled in TaskListScreen.
 *
 * Requirements covered:
 * - 5.5: Filter by task type and reward range (0-10000元)
 */

import React, { memo, useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, Text, TextInput } from 'react-native-paper';
import { TaskType } from '../../types/task';
import { TASK_TYPE_LABELS } from '../../utils/constants';
import { useTaskStore } from '../../stores/taskStore';

/** All available task types for filtering */
const TASK_TYPES: TaskType[] = [
  'delivery',
  'shopping',
  'dog_walking',
  'queuing',
  'pickup',
];

/** Reward range limits per requirement 5.5 */
const REWARD_MIN = 0;
const REWARD_MAX = 10000;

export interface TaskFilterProps {
  /** Callback invoked after filters are applied and tasks are re-fetched */
  onFilterApplied?: () => void;
}

/**
 * TaskFilter renders filter controls for task type and reward range.
 * Integrates with the task store to update filters and trigger re-fetch.
 */
export const TaskFilter: React.FC<TaskFilterProps> = memo(({ onFilterApplied }) => {
  const { filter, setFilter, fetchTasks } = useTaskStore();

  // Local state for reward inputs (string for TextInput, parsed on apply)
  const [minRewardInput, setMinRewardInput] = useState<string>(
    filter.minReward !== undefined ? String(filter.minReward) : ''
  );
  const [maxRewardInput, setMaxRewardInput] = useState<string>(
    filter.maxReward !== undefined ? String(filter.maxReward) : ''
  );

  /**
   * Toggle a task type filter.
   * If the same type is already selected, deselect it (show all types).
   */
  const handleTypeSelect = useCallback(
    (type: TaskType) => {
      const newType = filter.type === type ? undefined : type;
      setFilter({ type: newType });
      fetchTasks();
      onFilterApplied?.();
    },
    [filter.type, setFilter, fetchTasks, onFilterApplied]
  );

  /**
   * Apply reward range filter.
   * Validates inputs and clamps to valid range before applying.
   */
  const handleApplyRewardFilter = useCallback(() => {
    const minValue = minRewardInput ? parseFloat(minRewardInput) : undefined;
    const maxValue = maxRewardInput ? parseFloat(maxRewardInput) : undefined;

    // Validate and clamp values
    const clampedMin =
      minValue !== undefined && !isNaN(minValue)
        ? Math.max(REWARD_MIN, Math.min(minValue, REWARD_MAX))
        : undefined;
    const clampedMax =
      maxValue !== undefined && !isNaN(maxValue)
        ? Math.max(REWARD_MIN, Math.min(maxValue, REWARD_MAX))
        : undefined;

    setFilter({ minReward: clampedMin, maxReward: clampedMax });
    fetchTasks();
    onFilterApplied?.();
  }, [minRewardInput, maxRewardInput, setFilter, fetchTasks, onFilterApplied]);

  /**
   * Reset all filters to default state.
   */
  const handleReset = useCallback(() => {
    setMinRewardInput('');
    setMaxRewardInput('');
    setFilter({ type: undefined, minReward: undefined, maxReward: undefined });
    fetchTasks();
    onFilterApplied?.();
  }, [setFilter, fetchTasks, onFilterApplied]);

  return (
    <View style={styles.container} accessibilityLabel="任务筛选">
      {/* Task Type Filter */}
      <Text style={styles.sectionTitle} accessibilityLabel="按任务类型筛选">
        任务类型
      </Text>
      <View style={styles.chipContainer}>
        {TASK_TYPES.map((type) => {
          const isSelected = filter.type === type;
          const label = TASK_TYPE_LABELS[type];
          return (
            <Chip
              key={type}
              selected={isSelected}
              onPress={() => handleTypeSelect(type)}
              style={[styles.chip, isSelected && styles.chipSelected]}
              textStyle={[styles.chipText, isSelected && styles.chipTextSelected]}
              showSelectedOverlay={false}
              accessibilityLabel={`筛选任务类型: ${label}${isSelected ? ', 已选中' : ''}`}
              accessibilityRole="button"
            >
              {label}
            </Chip>
          );
        })}
      </View>

      <Divider style={styles.divider} />

      {/* Reward Range Filter */}
      <Text style={styles.sectionTitle} accessibilityLabel="按报酬范围筛选">
        报酬范围（元）
      </Text>
      <View style={styles.rewardRow}>
        <TextInput
          mode="outlined"
          label="最低"
          value={minRewardInput}
          onChangeText={setMinRewardInput}
          keyboardType="numeric"
          style={styles.rewardInput}
          placeholder="0"
          accessibilityLabel="最低报酬金额"
          dense
        />
        <Text style={styles.rewardSeparator} accessibilityLabel="至">
          —
        </Text>
        <TextInput
          mode="outlined"
          label="最高"
          value={maxRewardInput}
          onChangeText={setMaxRewardInput}
          keyboardType="numeric"
          style={styles.rewardInput}
          placeholder="10000"
          accessibilityLabel="最高报酬金额"
          dense
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <Button
          mode="outlined"
          onPress={handleReset}
          style={styles.resetButton}
          accessibilityLabel="重置筛选条件"
        >
          重置
        </Button>
        <Button
          mode="contained"
          onPress={handleApplyRewardFilter}
          style={styles.applyButton}
          accessibilityLabel="应用报酬筛选"
        >
          应用
        </Button>
      </View>
    </View>
  );
});

TaskFilter.displayName = 'TaskFilter';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F5F5F5',
  },
  chipSelected: {
    backgroundColor: '#E3F2FD',
  },
  chipText: {
    fontSize: 13,
    color: '#616161',
  },
  chipTextSelected: {
    color: '#1565C0',
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  rewardSeparator: {
    fontSize: 16,
    color: '#9E9E9E',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  resetButton: {
    borderColor: '#BDBDBD',
  },
  applyButton: {
    minWidth: 80,
  },
});

export default TaskFilter;
