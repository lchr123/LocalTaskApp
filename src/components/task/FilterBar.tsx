/**
 * FilterBar Component
 *
 * Compact filter/sort bar with dropdown menus for task list.
 * Displays: [类型 ▼] [排序 ▼] [标签 ▼] in a single row.
 *
 * Type and tags use a self-controlled multi-select dropdown (FilterMultiSelect)
 * that stays open across live filter refetches. Sort is single-select and uses
 * a Paper Menu (it closes on pick, which is the desired behavior).
 *
 * Toggles use setFilter(..., false) so the store does not fire its own refetch;
 * the single refetch is driven by the TaskListScreen effect watching `filter`.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Menu } from 'react-native-paper';
import { TaskFilter, TaskType, TaskTag } from '../../types/task';
import { TASK_TYPE_LABELS } from '../../utils/constants';
import { taskService } from '../../services/taskService';
import FilterMultiSelect, { FilterOption } from './FilterMultiSelect';

interface FilterBarProps {
  filter: TaskFilter;
  setFilter: (filter: Partial<TaskFilter>, refetch?: boolean) => void;
}

const SORT_OPTIONS = [
  { value: 'distance', label: '距离优先' },
  { value: 'reward', label: '报酬最高' },
  { value: 'newest', label: '最新发布' },
  { value: 'deadline', label: '最紧急' },
] as const;

const TYPE_OPTIONS: FilterOption[] = (Object.entries(TASK_TYPE_LABELS) as [TaskType, string][]).map(
  ([value, label]) => ({ value, label })
);

export default function FilterBar({ filter, setFilter }: FilterBarProps) {
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [tags, setTags] = useState<TaskTag[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await taskService.fetchTaskTags();
        if (!cancelled) setTags(list);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Type (multi-select, live apply) ─────────────────────────────────────
  const selectedTypes = filter.type ? filter.type.split(',') : [];
  const typeLabel =
    selectedTypes.length === 0
      ? '全部类型'
      : selectedTypes.length === 1
        ? TASK_TYPE_LABELS[selectedTypes[0] as TaskType] || selectedTypes[0]
        : `${selectedTypes.length}种类型`;

  const toggleType = (key: string) => {
    const allKeys = Object.keys(TASK_TYPE_LABELS);
    const isAll = selectedTypes.length === 0;
    let newTypes: string[];
    if (isAll) {
      newTypes = allKeys.filter((k) => k !== key);
    } else if (selectedTypes.includes(key)) {
      newTypes = selectedTypes.filter((t) => t !== key);
    } else {
      newTypes = [...selectedTypes, key];
    }
    if (newTypes.length === 0 || newTypes.length === allKeys.length) {
      setFilter({ type: undefined }, false);
    } else {
      setFilter({ type: newTypes.join(',') }, false);
    }
  };

  // ─── Tags (multi-select, live apply) ─────────────────────────────────────
  const selectedTags = filter.tags ? filter.tags.split(',') : [];
  const tagLabel =
    selectedTags.length === 0
      ? '全部行业'
      : selectedTags.length === 1
        ? tags.find((t) => t.id === selectedTags[0])?.label_zh || '1个行业'
        : `${selectedTags.length}个行业`;

  const tagOptions: FilterOption[] = tags
    .filter((t) => t.category === 'scene')
    .map((t) => ({ value: t.id, label: t.label_zh }));

  const toggleTag = (id: string) => {
    const next = selectedTags.includes(id)
      ? selectedTags.filter((t) => t !== id)
      : [...selectedTags, id];
    setFilter({ tags: next.length > 0 ? next.join(',') : undefined }, false);
  };

  // ─── Sort (single-select) ────────────────────────────────────────────────
  const currentSort = SORT_OPTIONS.find((o) => o.value === (filter.sort || 'distance'));
  const sortLabel = currentSort?.label || '距离优先';

  return (
    <View style={styles.container}>
      {/* Type filter (multi-select) */}
      <FilterMultiSelect
        buttonLabel={typeLabel}
        options={TYPE_OPTIONS}
        selected={selectedTypes}
        emptyMeansAll
        onToggle={toggleType}
        onClear={() => setFilter({ type: undefined }, false)}
        clearLabel="清除筛选"
      />

      {/* Tag filter (multi-select, scene/industry tags only) */}
      {tagOptions.length > 0 && (
        <FilterMultiSelect
          buttonLabel={tagLabel}
          options={tagOptions}
          selected={selectedTags}
          onToggle={toggleTag}
          onClear={() => setFilter({ tags: undefined }, false)}
          clearLabel="清除行业"
        />
      )}

      {/* Sort dropdown (single-select) */}
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
              setFilter({ sort: option.value as TaskFilter['sort'] }, false);
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
