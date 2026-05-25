/**
 * Global Error Boundary
 *
 * Catches unhandled rendering errors in the React component tree
 * and displays a friendly error page with a reload button.
 *
 * Requirements covered:
 * - 10.4: Display error messages with retry options
 * - Design: Global error boundary for crash recovery
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to monitoring service in production
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container} accessibilityLabel="应用错误页面">
          <Icon source="alert-circle-outline" size={64} color="#D32F2F" />
          <Text style={styles.title} accessibilityRole="header">
            应用出现了问题
          </Text>
          <Text style={styles.message} accessibilityLiveRegion="assertive">
            很抱歉，应用遇到了意外错误。请尝试重新加载。
          </Text>
          <Button
            mode="contained"
            onPress={this.handleReload}
            style={styles.reloadButton}
            accessibilityLabel="重新加载应用"
          >
            重新加载
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  reloadButton: {
    marginTop: 24,
    minWidth: 140,
  },
});

export default ErrorBoundary;
