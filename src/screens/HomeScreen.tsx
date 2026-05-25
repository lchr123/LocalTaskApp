/**
 * Home Screen
 *
 * Main landing page after authentication.
 * Displays an overview of nearby tasks and quick actions.
 *
 * Requirements covered:
 * - 10.1: Home tab in bottom navigation
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container} accessibilityLabel="首页">
      <Text style={styles.title}>首页</Text>
      <Text style={styles.subtitle}>欢迎使用本地即时任务平台</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
