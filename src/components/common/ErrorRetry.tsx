import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';

export interface ErrorRetryProps {
  /** Error message to display */
  errorMessage: string;
  /** Async function to call on retry */
  onRetry: () => Promise<void> | void;
  /** Maximum number of retry attempts allowed. Default: 3 */
  maxRetries?: number;
  /** Timeout for each retry attempt in milliseconds. Default: 15000 */
  retryTimeout?: number;
  /** Callback when all retries are exhausted */
  onRetriesExhausted?: () => void;
  /** Custom accessibility label */
  accessibilityLabel?: string;
}

export type ErrorRetryState = 'error' | 'retrying' | 'timeout' | 'exhausted';

/**
 * ErrorRetry component that displays an error message with a retry button.
 * Supports a maximum of 3 retries with a 15-second timeout per attempt.
 * 
 * Validates: Requirements 10.3, 10.4
 */
export const ErrorRetry: React.FC<ErrorRetryProps> = ({
  errorMessage,
  onRetry,
  maxRetries = 3,
  retryTimeout = 15000,
  onRetriesExhausted,
  accessibilityLabel,
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [state, setState] = useState<ErrorRetryState>('error');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      setState('exhausted');
      onRetriesExhausted?.();
      return;
    }

    setState('retrying');
    const newCount = retryCount + 1;
    setRetryCount(newCount);

    // Set up timeout
    let didTimeout = false;
    timeoutRef.current = setTimeout(() => {
      didTimeout = true;
      if (isMountedRef.current) {
        setState('timeout');
        if (newCount >= maxRetries) {
          onRetriesExhausted?.();
          setState('exhausted');
        }
      }
    }, retryTimeout);

    try {
      await onRetry();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // If retry succeeds, the parent component should handle the success state
      // by unmounting this component or updating the error state
      if (isMountedRef.current && !didTimeout) {
        setState('error'); // Reset state in case parent doesn't unmount
      }
    } catch {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (isMountedRef.current && !didTimeout) {
        if (newCount >= maxRetries) {
          setState('exhausted');
          onRetriesExhausted?.();
        } else {
          setState('error');
        }
      }
    }
  }, [retryCount, maxRetries, retryTimeout, onRetry, onRetriesExhausted]);

  const isRetrying = state === 'retrying';
  const isExhausted = state === 'exhausted';
  const isTimeout = state === 'timeout';

  const getDisplayMessage = (): string => {
    if (isTimeout) {
      return 'error.timeout';
    }
    if (isExhausted) {
      return 'error.retriesExhausted';
    }
    return errorMessage;
  };

  const getSubMessage = (): string | null => {
    if (isExhausted) {
      return 'error.checkNetwork';
    }
    if (retryCount > 0 && !isExhausted) {
      return `error.retryCount:${retryCount}/${maxRetries}`;
    }
    return null;
  };

  return (
    <View
      style={styles.container}
      accessibilityLabel={accessibilityLabel || 'error.retry.container'}
    >
      <Icon
        source="alert-circle-outline"
        size={48}
        color="#D32F2F"
      />
      <Text
        style={styles.errorMessage}
        accessibilityLabel="error.message"
        accessibilityLiveRegion="assertive"
      >
        {getDisplayMessage()}
      </Text>
      {getSubMessage() && (
        <Text
          style={styles.subMessage}
          accessibilityLabel="error.subMessage"
        >
          {getSubMessage()}
        </Text>
      )}
      {!isExhausted && (
        <Button
          mode="contained"
          onPress={handleRetry}
          loading={isRetrying}
          disabled={isRetrying}
          style={styles.retryButton}
          accessibilityLabel="error.retry.button"
        >
          {isRetrying ? 'error.retrying' : 'error.retry'}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorMessage: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  subMessage: {
    marginTop: 8,
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    minWidth: 120,
  },
});

export default ErrorRetry;
