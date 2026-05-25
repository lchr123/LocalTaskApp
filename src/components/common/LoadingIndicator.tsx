import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

export interface LoadingIndicatorProps {
  /** Display mode: 'fullscreen' centers in the entire screen, 'inline' renders inline */
  mode?: 'fullscreen' | 'inline';
  /** Optional message to display below the spinner */
  message?: string;
  /** Timeout in milliseconds. If exceeded, calls onTimeout. Default: 15000 */
  timeout?: number;
  /** Callback when loading exceeds the timeout duration */
  onTimeout?: () => void;
  /** Size of the activity indicator */
  size?: 'small' | 'large';
  /** Custom accessibility label */
  accessibilityLabel?: string;
}

/**
 * LoadingIndicator component that supports fullscreen and inline modes.
 * Automatically triggers a timeout callback if loading exceeds the specified duration.
 * 
 * Validates: Requirements 10.3
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  mode = 'inline',
  message,
  timeout = 15000,
  onTimeout,
  size = 'large',
  accessibilityLabel,
}) => {
  const [isTimedOut, setIsTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeout > 0) {
      timerRef.current = setTimeout(() => {
        setIsTimedOut(true);
        onTimeout?.();
      }, timeout);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeout, onTimeout]);

  if (isTimedOut) {
    return null; // Parent component should handle timeout state via onTimeout callback
  }

  const containerStyle = mode === 'fullscreen'
    ? styles.fullscreenContainer
    : styles.inlineContainer;

  const label = accessibilityLabel || 'loading.indicator';

  return (
    <View
      style={containerStyle}
      accessibilityLabel={label}
      accessibilityRole="progressbar"
    >
      <ActivityIndicator
        animating
        size={size}
        accessibilityLabel="loading.spinner"
      />
      {message && (
        <Text
          style={styles.message}
          accessibilityLabel="loading.message"
        >
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 999,
  },
  inlineContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default LoadingIndicator;
