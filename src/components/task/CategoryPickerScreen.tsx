/**
 * Category Picker Screen
 *
 * Shared entry screen shown before the task list / post form: lets the user
 * choose between the two top-level domains — "周边任务/工作" (task) and
 * "二手市场" (marketplace) — as two stacked large icon cards.
 *
 * Reused by both the Home tab (→ TaskList) and the Post tab (→ CreateTask);
 * only the two `onPress` callbacks differ, so this stays a single dumb
 * presentational component with no navigation/store knowledge of its own.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { TaskKind } from '../../types/task';

export interface CategoryOption {
  kind: TaskKind;
  title: string;
  description: string;
  icon: string;
  accentColor: string;
  onPress: () => void;
}

export interface CategoryPickerScreenProps {
  /** Heading shown above the two option cards. */
  heading?: string;
  options: CategoryOption[];
}

export default function CategoryPickerScreen({
  heading = '你想做什么？',
  options,
}: CategoryPickerScreenProps) {
  return (
    <View style={styles.container} accessibilityLabel="选择分类页面">
      <Text variant="titleLarge" style={styles.heading}>
        {heading}
      </Text>
      <View style={styles.optionsColumn}>
        {options.map((option) => (
          <Pressable
            key={option.kind}
            onPress={option.onPress}
            style={({ pressed }) => [
              styles.card,
              { borderColor: option.accentColor },
              pressed && styles.cardPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={option.title}
            accessibilityHint={option.description}
          >
            <View style={[styles.iconCircle, { backgroundColor: `${option.accentColor}1A` }]}>
              <Icon source={option.icon} size={40} color={option.accentColor} />
            </View>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {option.title}
            </Text>
            <Text variant="bodyMedium" style={styles.cardDescription}>
              {option.description}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  heading: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsColumn: {
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.7,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  cardDescription: {
    color: '#757575',
    textAlign: 'center',
  },
});
