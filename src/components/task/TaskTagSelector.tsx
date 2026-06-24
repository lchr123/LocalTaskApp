/**
 * TaskTagSelector
 *
 * Multi-select chips for task tags, grouped by category.
 * Fetches the tag dictionary from the backend on mount.
 * Source of truth is `value` (array of tag ids).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, Text, ActivityIndicator } from 'react-native-paper';
import { taskService } from '../../services/taskService';
import { TaskTag } from '../../types/task';

const CATEGORY_LABELS: Record<string, string> = {
  scene: '场景',
  requirement: '要求',
  other: '其他',
};

export interface TaskTagSelectorProps {
  value: string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

export default function TaskTagSelector({ value, onChange, disabled }: TaskTagSelectorProps) {
  const [tags, setTags] = useState<TaskTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await taskService.fetchTaskTags();
        if (!cancelled) setTags(list);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, TaskTag[]> = {};
    for (const t of tags) {
      const cat = t.category || 'other';
      (map[cat] ??= []).push(t);
    }
    return map;
  }, [tags]);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ marginVertical: 12 }} accessibilityLabel="加载标签中" />;
  }

  return (
    <View style={styles.container}>
      <Text variant="labelLarge" style={styles.label}>
        任务标签（可多选）
      </Text>
      {Object.entries(grouped).map(([cat, list]) => (
        <View key={cat} style={styles.group}>
          <Text style={styles.categoryLabel}>{CATEGORY_LABELS[cat] || cat}</Text>
          <View style={styles.chips}>
            {list.map((tag) => {
              const isSelected = value.includes(tag.id);
              return (
                <Chip
                  key={tag.id}
                  selected={isSelected}
                  onPress={() => !disabled && toggle(tag.id)}
                  style={[styles.chip, isSelected && { backgroundColor: '#E3F2FD' }]}
                  textStyle={isSelected ? { color: '#1976D2' } : { color: '#666' }}
                  showSelectedCheck
                  compact
                  disabled={disabled}
                  accessibilityLabel={`标签 ${tag.label_zh}`}
                >
                  {tag.label_zh}
                </Chip>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  label: { marginBottom: 8 },
  group: { marginBottom: 10 },
  categoryLabel: { fontSize: 12, color: '#9E9E9E', marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { marginRight: 0 },
});
