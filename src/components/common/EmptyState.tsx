import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon, Button } from 'react-native-paper';

export interface EmptyStateProps {
  /** Icon name from Material Community Icons */
  icon?: string;
  /** Primary message to display */
  message: string;
  /** Optional secondary description text */
  description?: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Callback when action button is pressed */
  onAction?: () => void;
  /** Icon size. Default: 64 */
  iconSize?: number;
  /** Icon color. Default: '#BDBDBD' */
  iconColor?: string;
  /** Custom accessibility label */
  accessibilityLabel?: string;
}

/**
 * EmptyState component that displays a placeholder when no data is available.
 * Supports custom icon, message, description, and an optional action button.
 * 
 * Validates: Requirements 10.4
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox-outline',
  message,
  description,
  actionLabel,
  onAction,
  iconSize = 64,
  iconColor = '#BDBDBD',
  accessibilityLabel,
}) => {
  return (
    <View
      style={styles.container}
      accessibilityLabel={accessibilityLabel || 'empty.state.container'}
    >
      <Icon
        source={icon}
        size={iconSize}
        color={iconColor}
      />
      <Text
        style={styles.message}
        accessibilityLabel="empty.state.message"
      >
        {message}
      </Text>
      {description && (
        <Text
          style={styles.description}
          accessibilityLabel="empty.state.description"
        >
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          mode="outlined"
          onPress={onAction}
          style={styles.actionButton}
          accessibilityLabel="empty.state.action"
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  message: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
    textAlign: 'center',
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 24,
  },
});

export default EmptyState;
