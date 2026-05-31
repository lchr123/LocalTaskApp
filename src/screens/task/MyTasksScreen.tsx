/**
 * My Tasks Screen
 *
 * Displays tasks posted by the current user.
 * Allows navigation to task detail for managing intents and selecting helpers.
 */

import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Platform } from 'react-native';
import { Text, Card, Chip, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import apiClient from '../../services/api';
import { formatReward, formatRelativeTime } from '../../utils/formatters';
import { TASK_TYPE_LABELS } from '../../utils/constants';
import { Task } from '../../types/task';
import { useTaskStore } from '../../stores/taskStore';

function getStatusLabel(status: string): string {
  switch (status) {
    case 'open': return '待接单';
    case 'in_progress': return '进行中';
    case 'completed': return '已完成';
    case 'cancelled': return '已取消';
    default: return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'open': return '#4caf50';
    case 'in_progress': return '#ff9800';
    case 'completed': return '#2196f3';
    case 'cancelled': return '#9e9e9e';
    default: return '#9e9e9e';
  }
}

export default function MyTasksScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { refresh: refreshTaskList } = useTaskStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const fetchMyTasks = useCallback(async () => {
    try {
      const res = await apiClient.get('/tasks/mine');
      setTasks(res.data.tasks);
    } catch {
      // Ignore errors
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMyTasks();
    }, [fetchMyTasks])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchMyTasks();
  }, [fetchMyTasks]);

  const handleTaskPress = useCallback((taskId: string) => {
    (navigation as any).navigate('TaskDetail', { taskId });
  }, [navigation]);

  const handleStatusChange = useCallback(async (taskId: string, newStatus: string, label: string, skipConfirm = false) => {
    if (!skipConfirm) {
      const confirmMsg = `确定要将任务标记为「${label}」吗？`;
      if (Platform.OS === 'web') {
        if (!window.confirm(confirmMsg)) return;
      }
    }
    setUpdatingTaskId(taskId);
    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status: newStatus });
      await fetchMyTasks();
      // Also refresh the home page task list
      refreshTaskList();
    } catch {
      if (Platform.OS === 'web') {
        window.alert('操作失败，请重试');
      }
    } finally {
      setUpdatingTaskId(null);
    }
  }, [fetchMyTasks]);

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
          您还没有发布过任务
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
                {item.intentCount} 人申请 · {formatRelativeTime(item.createdAt)}
              </Text>
            </View>

            {/* Status action buttons */}
            <View style={styles.actionRow}>
              {item.status === 'open' && (
                <Button
                  mode="outlined"
                  compact
                  onPress={() => handleStatusChange(item.id, 'cancelled', '已取消')}
                  loading={updatingTaskId === item.id}
                  disabled={updatingTaskId === item.id}
                  icon="close"
                  style={styles.actionButton}
                  textColor="#f44336"
                >
                  取消任务
                </Button>
              )}
              {item.status === 'in_progress' && (
                <>
                  <Button
                    mode="contained"
                    compact
                    onPress={() => handleStatusChange(item.id, 'completed', '已完成')}
                    loading={updatingTaskId === item.id}
                    disabled={updatingTaskId === item.id}
                    icon="check"
                    style={styles.actionButton}
                    buttonColor="#4caf50"
                  >
                    标记完成
                  </Button>
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => {
                      const msg = '取消与当前接单人的匹配后，任务状态将回滚至「待接单」，重新出现在任务大厅。确定继续吗？';
                      if (Platform.OS === 'web') {
                        if (!window.confirm(msg)) return;
                      }
                      handleStatusChange(item.id, 'open', '待接单', true);
                    }}
                    disabled={updatingTaskId === item.id}
                    icon="account-remove"
                    style={styles.actionButton}
                    textColor="#ff9800"
                  >
                    取消匹配
                  </Button>
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => handleStatusChange(item.id, 'cancelled', '已取消')}
                    disabled={updatingTaskId === item.id}
                    icon="close"
                    style={styles.actionButton}
                    textColor="#f44336"
                  >
                    取消任务
                  </Button>
                </>
              )}
              {item.status === 'completed' && !item.hasReview && (
                <>
                  <Button
                    mode="contained"
                    compact
                    onPress={async () => {
                      if (item.selectedHelperId) {
                        let helperNickname = '帮手';
                        try {
                          const res = await apiClient.get(`/users/${item.selectedHelperId}`);
                          helperNickname = res.data.nickname || '帮手';
                        } catch {}
                        (navigation as any).navigate('CreateReview', {
                          taskId: item.id,
                          revieweeId: item.selectedHelperId,
                          revieweeNickname: helperNickname,
                          completedAt: item.updatedAt || item.createdAt,
                        });
                      }
                    }}
                    disabled={!item.selectedHelperId}
                    icon="star"
                    style={styles.actionButton}
                    buttonColor="#ff9800"
                  >
                    结束任务并评价
                  </Button>
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => handleStatusChange(item.id, 'in_progress', '进行中')}
                    loading={updatingTaskId === item.id}
                    disabled={updatingTaskId === item.id}
                    icon="undo"
                    style={styles.actionButton}
                  >
                    重新进行
                  </Button>
                </>
              )}
              {item.status === 'completed' && item.hasReview && (
                <Chip compact icon="check-circle" style={{ backgroundColor: '#e8f5e9' }} textStyle={{ color: '#4caf50' }}>
                  已评价
                </Chip>
              )}
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
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    borderRadius: 6,
  },
});
