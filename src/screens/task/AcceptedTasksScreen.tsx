/**
 * Accepted Tasks Screen
 *
 * Displays tasks that the current user has accepted as a helper.
 * Shows different status indicators for each task state.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, useTheme, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../services/api';
import { formatReward, formatRelativeTime } from '../../utils/formatters';
import { TASK_TYPE_LABELS } from '../../utils/constants';
import { Task } from '../../types/task';

function getStatusLabel(status: string): string {
  switch (status) {
    case 'open': return '待确认';
    case 'in_progress': return '进行中';
    case 'completed': return '已完成';
    case 'cancelled': return '已取消';
    default: return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'open': return '#ff9800';
    case 'in_progress': return '#2196f3';
    case 'completed': return '#4caf50';
    case 'cancelled': return '#9e9e9e';
    default: return '#9e9e9e';
  }
}

export default function AcceptedTasksScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAcceptedTasks = useCallback(async () => {
    try {
      const res = await apiClient.get('/tasks/accepted');
      setTasks(res.data.tasks);
    } catch {
      // Ignore errors
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAcceptedTasks();
  }, [fetchAcceptedTasks]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAcceptedTasks();
  }, [fetchAcceptedTasks]);

  const handleTaskPress = useCallback((taskId: string) => {
    (navigation as any).navigate('TaskDetail', { taskId });
  }, [navigation]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge" style={{ opacity: 0.6 }}>
          您还没有接受过任务
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      renderItem={({ item }) => (
        <Card
          style={styles.card}
          onPress={() => handleTaskPress(item.id)}
          accessibilityLabel={`任务：${item.description.slice(0, 30)}`}
        >
          <Card.Content>
            <View style={styles.headerRow}>
              <Chip mode="outlined" compact>
                {TASK_TYPE_LABELS[item.type]}
              </Chip>
              <Chip
                compact
                style={{ backgroundColor: getStatusColor(item.status) + '20' }}
                textStyle={{ color: getStatusColor(item.status) }}
              >
                {getStatusLabel(item.status)}
              </Chip>
            </View>
            <Text variant="bodyMedium" numberOfLines={2} style={styles.description}>
              {item.description}
            </Text>
            <View style={styles.footerRow}>
              <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                {formatReward(item.reward)}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                {formatRelativeTime(item.createdAt)}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  description: {
    marginBottom: 8,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
