/**
 * Intent List Screen
 *
 * Displays the list of helpers who expressed intent for a task.
 * Allows the task poster to select a helper with confirmation.
 * After selection, task status changes to 'in_progress'.
 *
 * Requirements covered:
 * - 6.3: Show intent list with helper details
 * - 6.4: Display helper nickname, rating, completed count, message
 * - 6.5: Select helper and update task status to in_progress
 */

import React, { useEffect, useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, Platform } from 'react-native';
import { Snackbar, Text } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TaskStackParamList } from '../../navigation/TaskStackNavigator';
import { useTaskStore } from '../../stores/taskStore';
import { useChatStore } from '../../stores/chatStore';
import { taskService } from '../../services/taskService';
import { appDialog } from '../../stores/dialogStore';
import { Intent } from '../../types/task';
import { IntentCard } from '../../components/task/IntentCard';
import { LoadingIndicator, ErrorRetry, EmptyState } from '../../components/common';

type Props = NativeStackScreenProps<TaskStackParamList, 'IntentList'>;

export default function IntentListScreen({ route, navigation }: Props) {
  const { taskId } = route.params;

  const {
    intents,
    isLoadingIntents,
    isLoading,
    error,
    fetchIntents,
    selectHelper,
    clearError,
  } = useTaskStore();

  const { fetchSessions } = useChatStore();

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    fetchIntents(taskId);
  }, [taskId, fetchIntents]);

  /**
   * Handle helper selection with confirmation dialog.
   * Requirement 6.5: Confirm before selecting a helper.
   */
  const handleSelect = useCallback(
    async (intent: Intent) => {
      const confirmed = await appDialog.confirm({
        title: '确认选择',
        message: `确定选择 ${intent.helperNickname} 作为帮手吗？选择后任务将进入进行中状态。`,
      });
      if (!confirmed) return;

      setIsSelecting(true);
      try {
        await selectHelper(taskId, intent.helperId);
        await fetchIntents(taskId);
        await fetchSessions();

        // A: locate the conversation created/existing for this task + helper
        const session = useChatStore
          .getState()
          .sessions.find(
            (s) => s.taskId === taskId && s.participantId === intent.helperId
          );

        // B: soft guidance — invite the poster to contact the helper now
        const goChat = await appDialog.confirm({
          title: '已选择帮手',
          message: `已选择 ${intent.helperNickname}，现在去和 TA 聊一下任务细节吧！`,
          confirmText: '去联系',
          cancelText: '稍后',
        });

        if (goChat && session) {
          // Cross-tab navigation: Tasks stack → Chat tab → ChatRoom
          (navigation.getParent() as any)?.navigate('Chat', {
            screen: 'ChatRoom',
            params: {
              sessionId: session.id,
              taskId: session.taskId,
              taskTitle: session.taskTitle,
              taskType: session.taskType,
            },
          });
        } else if (goChat && !session) {
          // Fallback: session not yet resolved locally — point user to 消息 tab
          setSnackbarMessage('对话已创建，请到「消息」中查看');
          setSnackbarVisible(true);
        }
      } catch {
        setSnackbarMessage('选择帮手失败，请重试');
        setSnackbarVisible(true);
      } finally {
        setIsSelecting(false);
      }
    },
    [taskId, selectHelper, fetchIntents, fetchSessions, navigation]
  );

  const handleRetry = useCallback(async () => {
    clearError();
    await fetchIntents(taskId);
  }, [taskId, fetchIntents, clearError]);

  /**
   * Start a chat with an applicant without selecting them (task stays open).
   * Creates/reuses the session on the backend, then navigates to the chat room.
   */
  const handleChat = useCallback(
    async (intent: Intent) => {
      setIsSelecting(true);
      try {
        const session = await taskService.startChatWithApplicant(taskId, intent.helperId);
        await fetchSessions();
        (navigation.getParent() as any)?.navigate('Chat', {
          screen: 'ChatRoom',
          params: {
            sessionId: session.sessionId,
            taskId: session.taskId,
            taskTitle: session.taskTitle,
            taskType: session.taskType,
          },
        });
      } catch {
        setSnackbarMessage('创建会话失败，请重试');
        setSnackbarVisible(true);
      } finally {
        setIsSelecting(false);
      }
    },
    [taskId, fetchSessions, navigation]
  );

  const handleDismissSnackbar = useCallback(() => {
    setSnackbarVisible(false);
  }, []);

  const renderIntentItem = useCallback(
    ({ item }: { item: Intent }) => (
      <IntentCard
        intent={item}
        onSelect={handleSelect}
        onChat={handleChat}
        disabled={isSelecting || isLoading}
      />
    ),
    [handleSelect, handleChat, isSelecting, isLoading]
  );

  const keyExtractor = useCallback((item: Intent) => item.id, []);

  // Loading state
  if (isLoadingIntents && intents.length === 0) {
    return (
      <View style={styles.container}>
        <LoadingIndicator
          mode="fullscreen"
          message="加载意向列表中..."
          accessibilityLabel="加载意向列表中"
        />
      </View>
    );
  }

  // Error state
  if (error && intents.length === 0) {
    return (
      <ErrorRetry
        errorMessage={error}
        onRetry={handleRetry}
        accessibilityLabel="加载意向列表失败"
      />
    );
  }

  // Empty state
  if (!isLoadingIntents && intents.length === 0) {
    return (
      <View style={styles.container} accessibilityLabel="意向列表页面">
        <EmptyState
          icon="hand-wave-outline"
          message="暂无帮手意向"
          description="还没有帮手对此任务表达意向，请耐心等待"
          accessibilityLabel="暂无帮手意向"
        />
      </View>
    );
  }

  // Pending intents count
  const pendingCount = intents.filter((i) => i.status === 'pending').length;

  return (
    <View style={styles.container} accessibilityLabel="意向列表页面">
      {/* Header summary */}
      <View style={styles.summaryBar}>
        <Text
          style={styles.summaryText}
          accessibilityLabel={`共 ${intents.length} 位帮手表达意向，${pendingCount} 位待选择`}
        >
          共 {intents.length} 位帮手表达意向
          {pendingCount > 0 && `，${pendingCount} 位待选择`}
        </Text>
      </View>

      {/* Intent list */}
      <FlatList
        data={intents}
        renderItem={renderIntentItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="帮手意向列表"
      />

      {/* Success/Error Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={handleDismissSnackbar}
        duration={3000}
        accessibilityLabel={snackbarMessage}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  summaryBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  summaryText: {
    fontSize: 14,
    color: '#616161',
  },
  listContent: {
    paddingVertical: 8,
  },
});
