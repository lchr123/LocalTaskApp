/**
 * StarRating Component
 *
 * Interactive 1-5 star rating selector using React Native Paper icons.
 * Stars are tappable and visually indicate the current selection.
 *
 * Requirements covered:
 * - 8.2: Provide 1-5 star rating (required)
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface StarRatingProps {
  /** Current rating value (0 = no selection, 1-5 = selected) */
  value: number;
  /** Callback when a star is tapped */
  onChange: (rating: number) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Size of each star icon */
  size?: number;
  /** Label displayed above the stars */
  label?: string;
  /** Error message to display below the stars */
  error?: string;
}

/**
 * StarRating
 *
 * Renders 5 tappable star icons. Filled stars indicate the current rating.
 * Includes accessibility labels for each star button.
 */
export default function StarRating({
  value,
  onChange,
  disabled = false,
  size = 40,
  label = '评分',
  error,
}: StarRatingProps) {
  const theme = useTheme();

  const handlePress = useCallback(
    (star: number) => {
      if (!disabled) {
        onChange(star);
      }
    },
    [disabled, onChange]
  );

  return (
    <View style={styles.container} accessibilityLabel={`${label}选择器`}>
      {label && (
        <Text variant="titleMedium" style={styles.label}>
          {label} <Text style={{ color: theme.colors.error }}>*</Text>
        </Text>
      )}

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= value;
          return (
            <Pressable
              key={star}
              onPress={() => handlePress(star)}
              disabled={disabled}
              accessibilityLabel={`${star}星`}
              accessibilityRole="button"
              accessibilityState={{
                selected: isFilled,
                disabled,
              }}
              accessibilityHint={`选择${star}星评分`}
              style={styles.starButton}
            >
              <MaterialCommunityIcons
                name={isFilled ? 'star' : 'star-outline'}
                size={size}
                color={isFilled ? '#FFB800' : theme.colors.outline}
              />
            </Pressable>
          );
        })}
      </View>

      {value > 0 && (
        <Text
          variant="bodySmall"
          style={styles.ratingText}
          accessibilityLabel={`当前评分${value}星`}
        >
          {value} / 5 星
        </Text>
      )}

      {error && (
        <Text
          variant="bodySmall"
          style={[styles.errorText, { color: theme.colors.error }]}
          accessibilityLabel={`评分错误：${error}`}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    marginTop: 4,
    opacity: 0.7,
  },
  errorText: {
    marginTop: 4,
  },
});
