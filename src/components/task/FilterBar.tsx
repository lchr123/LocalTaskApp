/**
 * FilterBar Component
 *
 * Compact filter/sort bar with dropdown menus for task list.
 * Displays: [类型 ▼] [排序 ▼] in a single row.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Menu, Checkbox, Divider, Text } from 'react-native-paper';
import { TaskFilter, TaskType } from '../../types/task';
import { TASK_TYPE_LABELS } from '../../utils/constants';

interface FilterBarProps {
  filter: TaskFilter;
  setFilter: (filter: Partial<TaskFilter>) => void;
}

const SORT_OPTIONS = [
  { value: 'distance', label: '距离优先' },
  { value: 'reward', label: '报酬最高' },
  { value: 'newest', label: '最新发布' },
  { value: 'deadline', label: '最紧急' },
] as const;

export default function FilterBar({ filter, setFilter }: FilterBarProps) {
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const selectedTypes = filter.type ? filter.type.split(',') : [];
  const isAllSelected = selectedTypes.length === 0;
  const typeLabel = isAllSelected
    ? '全部类型'
    : selectedTypes.length === 1
      ? TASK_TYPE_LABELS[selectedTypes[0] as TaskType] || selectedTypes[0]
      : `${selectedTypes.length}种类型`;

  const currentSort = SORT_OPTIONS.find((o) => o.value === (filter.sort || 'distance'));
  const sortLabel = currentSort?.label || '距离优先';

  const toggleType = (key: string) => {
    if (isAllSelected) {
      // Currently all selected → uncheck this one = select all others
      const allKeys = Object.keys(TASK_TYPE_LABELS);
      const newTypes = allKeys.filter((k) => k !== key);
      setFilter({ type: newTypes.join(',') });
    } else {
      let newTypes: string[];
      if (selectedTypes.includes(key)) {
        newTypes = selectedTypes.filter((t) => t !== key);
      } else {
        newTypes = [...selectedTypes, key];
      }
      // If all types are selected, reset to undefined (means all)
      const allKeys = Object.keys(TASK_TYPE_LABELS);
      if (newTypes.length === allKeys.length || newTypes.length === 0) {
        setFilter({ type: undefined });
      } else {
        setFilter({ type: newTypes.join(',') });
      }
    }
  };

  const isTypeChecked = (key: string) => {
    return isAllSelected || selectedTypes.includes(key);
  };

  return (
    <View style={styles.container}>
      {/* Type filter dropdown */}
      <Menu
        visible={typeMenuVisible}
        onDismiss={() => setTypeMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            compact
            onPress={() => setTypeMenuVisible(true)}
            icon="chevron-down"
            contentStyle={styles.buttonContent}
            style={styles.filterButton}
            labelStyle={styles.buttonLabel}
          >
            {typeLabel}
          </Button>
        }
        anchorPosition="bottom"
      >
        {(Object.entries(TASK_TYPE_LABELS) as [TaskType, string][]).map(([key, label]) => (
          <Menu.Item
            key={key}
            onPress={() => toggleType(key)}
            title={label}
            leadingIcon={isTypeChecked(key) ? 'checkbox-marked' : 'checkbox-blank-outline'}
          />
        ))}
        {selectedTypes.length > 0 && (
          <>
            <Divider />
            <Menu.Item
              onPress={() => {
                setFilter({ type: undefined });
                setTypeMenuVisible(false);
              }}
              title="清除筛选"
              leadingIcon="close"
            />
          </>
        )}
      </Menu>

      {/* Sort dropdown */}
      <Menu
        visible={sortMenuVisible}
        onDismiss={() => setSortMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            compact
            onPress={() => setSortMenuVisible(true)}
            icon="chevron-down"
            contentStyle={styles.buttonContent}
            style={styles.filterButton}
            labelStyle={styles.buttonLabel}
          >
            {sortLabel}
          </Button>
        }
        anchorPosition="bottom"
      >
        {SORT_OPTIONS.map((option) => (
          <Menu.Item
            key={option.value}
            onPress={() => {
              setFilter({ sort: option.value as TaskFilter['sort'] });
              setSortMenuVisible(false);
            }}
            title={option.label}
            leadingIcon={(filter.sort || 'distance') === option.value ? 'check' : undefined}
          />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    borderRadius: 20,
    borderColor: '#E0E0E0',
  },
  buttonContent: {
    flexDirection: 'row-reverse',
    height: 36,
  },
  buttonLabel: {
    fontSize: 13,
  },
});
