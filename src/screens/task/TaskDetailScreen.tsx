/**
 * Task Detail Screen
 *
 * Displays full task details including description, location,
 * reward, deadline, and poster information.
 * Allows helpers to submit intent with optional message.
 * Supports intent withdrawal and duplicate intent detection.
 *
 * Requirements covered:
 * - 5.3: Show full task details with poster nickname and rating
 * - 6.1: "I want to help" button for submitting intent
 * - 6.2: Optional message (max 200 chars) with intent
 * - 6.5: Display poster info (nickname, rating)
 * - 6.6: Duplicate intent prevention
 * - 6.7: Hide intent button when task is not open
 * - 6.8: Intent withdrawal before being selected
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Card,
  Text,
  Button,
  TextInput,
  Dialog,
  Portal,
  Snackbar,
  Chip,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TaskStackParamList } from '../../navigation/TaskStackNavigator';
import { useTaskStore } from '../../stores/taskStore';
import { useAuthStore } from '../../stores/authStore';
import { formatReward, formatRelativeTime } from '../../utils/formatters';
import { TASK_TYPE_LABELS, VALIDATION } from '../../utils/constants';

type Props = NativeStackScreenProps<TaskStackParamList, 'TaskDetail'>;

export default function TaskDetailScreen({ route, navigation }: Props) {
  const { taskId } = route.params;

  // Store state
  const {
    currentTask,
    intents,
    isLoading,
    error,
    fetchTaskDetail,
    submitIntent,
    withdrawIntent,
    clearCurrentTask,
    clearError,
  } = useTaskStore();

  const user = useAuthStore((state) => state.user);

  // Local state
  const [intentDialogVisible, setIntentDialogVisible] = useState(false);
  const [withdrawDialogVisible, setWithdrawDialogVisible] = useState(false);
  const [intentMessage, setIntentMessage] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load task detail on mount
  useEffect(() => {
    fetchTaskDetail(taskId);
    return () => {
      clearCurrentTask();
    };
  }, [taskId, fetchTaskDetail, clearCurrentTask]);

  // Check if current user already submitted intent for this task
  const existingIntent = intents.find(
    (intent) => intent.helperId === user?.id && intent.status === 'pending'
  );
  const hasSubmittedIntent = !!existingIntent;

  // Show snackbar helper
  const showSnackbar = useCallback((message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }, []);

  // Handle intent submission
  const handleSubmitIntent = async () => {
    if (isSubmitting) return;

    // Duplicate intent check (Requirement 6.6)
    if (hasSubmittedIntent) {
      showSnackbar('您已提交过意向');
      setIntentDialogVisible(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitIntent(taskId, intentMessage.trim() || undefined);
      setIntentDialogVisible(false);
      setIntentMessage('');
      showSnackbar('意向已提交');
    } catch {
      showSnackbar('提交意向失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle intent withdrawal (Requirement 6.8)
  const handleWithdrawIntent = async () => {
    if (!existingIntent || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await withdrawIntent(taskId, existingIntent.id);
      setWithdrawDialogVisible(false);
      showSnackbar('意向已撤回');
    } catch {
      showSnackbar('撤回意向失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open intent dialog - check for duplicate first
  const handleIntentButtonPress = () => {
    if (hasSubmittedIntent) {
      // Show duplicate intent dialog with withdraw option (Requirement 6.6)
      setWithdrawDialogVisible(true);
    } else {
      setIntentDialogVisible(true);
    }
  };

  // Loading state
  if (isLoading && !currentTask) {
    return (
      <View style={styles.centerContainer} accessibilityLabel="加载中">
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>加载任务详情...</Text>
      </View>
    );
  }

  // Error state
  if (error && !currentTask) {
    return (
      <View style={styles.centerContainer} accessibilityLabel="加载失败">
        <Text style={styles.errorText}>{error}</Text>
        <Button
          mode="contained"
          onPress={() => fetchTaskDetail(taskId)}
          accessibilityLabel="重试加载"
        >
          重试
        </Button>
      </View>
    );
  }

  // No task loaded
  if (!currentTask) {
    return (
      <View style={styles.centerContainer} accessibilityLabel="任务不存在">
        <Text style={styles.errorText}>任务不存在</Text>
      </View>
    );
  }

  // Determine if intent button should be shown (Requirement 6.7)
  const showIntentButton = currentTask.status === 'open' && currentTask.posterId !== user?.id;

  return (
    <View style={styles.container} accessibilityLabel="任务详情页面">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Task Type & Status */}
        <View style={styles.headerRow} accessibilityLabel="任务类型和状态">
          <Chip
            mode="outlined"
            accessibilityLabel={`任务类型：${TASK_TYPE_LABELS[currentTask.type]}`}
          >
            {TASK_TYPE_LABELS[currentTask.type]}
          </Chip>
          <Chip
            mode="flat"
            style={[
              styles.statusChip,
              currentTask.status === 'open' && styles.statusOpen,
              currentTask.status === 'in_progress' && styles.statusInProgress,
              currentTask.status === 'completed' && styles.statusCompleted,
              currentTask.status === 'cancelled' && styles.statusCancelled,
            ]}
            accessibilityLabel={`任务状态：${getStatusLabel(currentTask.status)}`}
          >
            {getStatusLabel(currentTask.status)}
          </Chip>
        </View>

        {/* Description (Requirement 5.3) */}
        <Card style={styles.card} accessibilityLabel="任务描述">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              任务描述
            </Text>
            <Text variant="bodyLarge" style={styles.description}>
              {currentTask.description}
            </Text>
          </Card.Content>
        </Card>

        {/* Location (Requirement 5.3) */}
        <Card style={styles.card} accessibilityLabel="任务地点">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              地点
            </Text>
            <Text variant="bodyMedium">{currentTask.location.address}</Text>
            {currentTask.distance !== undefined && (
              <Text variant="bodySmall" style={styles.distanceText}>
                距您 {currentTask.distance < 1
                  ? `${Math.round(currentTask.distance * 1000)}m`
                  : `${currentTask.distance.toFixed(1)}km`}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Reward (Requirement 5.3) */}
        <Card style={styles.card} accessibilityLabel="任务报酬">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              报酬
            </Text>
            <Text variant="headlineSmall" style={styles.rewardText}>
              {formatReward(currentTask.reward)}
            </Text>
          </Card.Content>
        </Card>

        {/* Time Info (Requirement 5.3) */}
        <Card style={styles.card} accessibilityLabel="时间信息">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              时间信息
            </Text>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>
                发布时间：
              </Text>
              <Text
                variant="bodyMedium"
                accessibilityLabel={`发布时间：${formatRelativeTime(currentTask.createdAt)}`}
              >
                {formatRelativeTime(currentTask.createdAt)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>
                截止时间：
              </Text>
              <Text variant="bodyMedium">
                {new Date(currentTask.deadline).toLocaleString('zh-CN')}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Poster Info (Requirement 5.3, 6.5) */}
        <Card style={styles.card} accessibilityLabel="发布者信息">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              发布者
            </Text>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>
                昵称：
              </Text>
              <Text
                variant="bodyMedium"
                accessibilityLabel={`发布者昵称：${currentTask.posterNickname}`}
              >
                {currentTask.posterNickname}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>
                评分：
              </Text>
              <Text
                variant="bodyMedium"
                accessibilityLabel={`发布者评分：${currentTask.posterRating.toFixed(1)}分`}
              >
                ⭐ {currentTask.posterRating.toFixed(1)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Intent count info */}
        <Card style={styles.card} accessibilityLabel="意向信息">
          <Card.Content>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>
                当前意向数：
              </Text>
              <Text variant="bodyMedium">
                {currentTask.intentCount} 人
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Already submitted intent notice */}
        {hasSubmittedIntent && currentTask.status === 'open' && (
          <Card style={[styles.card, styles.intentNoticeCard]} accessibilityLabel="已提交意向提示">
            <Card.Content>
              <Text variant="bodyMedium" style={styles.intentNoticeText}>
                您已提交过意向
              </Text>
              <Button
                mode="outlined"
                onPress={() => setWithdrawDialogVisible(true)}
                style={styles.withdrawButton}
                accessibilityLabel="撤回意向"
              >
                撤回意向
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Spacer for bottom button */}
        {showIntentButton && <View style={styles.bottomSpacer} />}
      </ScrollView>

      {/* Intent Button (Requirement 6.1, 6.7) */}
      {showIntentButton && !hasSubmittedIntent && (
        <View style={styles.bottomButtonContainer}>
          <Button
            mode="contained"
            onPress={handleIntentButtonPress}
            style={styles.intentButton}
            labelStyle={styles.intentButtonLabel}
            accessibilityLabel="我想帮忙"
          >
            我想帮忙
          </Button>
        </View>
      )}

      {/* Intent Submission Dialog (Requirement 6.1, 6.2) */}
      <Portal>
        <Dialog
          visible={intentDialogVisible}
          onDismiss={() => setIntentDialogVisible(false)}
        >
          <Dialog.Title>提交意向</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogDescription}>
              您可以附带一段留言，向发布者说明您的优势或时间安排（选填）
            </Text>
            <TextInput
              mode="outlined"
              label="留言（选填）"
              value={intentMessage}
              onChangeText={setIntentMessage}
              maxLength={VALIDATION.INTENT_MESSAGE_MAX}
              multiline
              numberOfLines={3}
              style={styles.messageInput}
              accessibilityLabel="意向留言输入框"
              right={
                <TextInput.Affix
                  text={`${intentMessage.length}/${VALIDATION.INTENT_MESSAGE_MAX}`}
                />
              }
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setIntentDialogVisible(false)}
              accessibilityLabel="取消提交意向"
            >
              取消
            </Button>
            <Button
              onPress={handleSubmitIntent}
              loading={isSubmitting}
              disabled={isSubmitting}
              accessibilityLabel="确认提交意向"
            >
              提交
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Withdraw Intent Dialog (Requirement 6.6, 6.8) */}
        <Dialog
          visible={withdrawDialogVisible}
          onDismiss={() => setWithdrawDialogVisible(false)}
        >
          <Dialog.Title>您已提交过意向</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              您已对此任务提交过意向，是否要撤回？
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setWithdrawDialogVisible(false)}
              accessibilityLabel="关闭撤回对话框"
            >
              关闭
            </Button>
            <Button
              onPress={handleWithdrawIntent}
              loading={isSubmitting}
              disabled={isSubmitting}
              textColor="#d32f2f"
              accessibilityLabel="确认撤回意向"
            >
              撤回意向
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Success/Error Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        accessibilityLabel={snackbarMessage}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return '待接单';
    case 'in_progress':
      return '进行中';
    case 'completed':
      return '已完成';
    case 'cancelled':
      return '已取消';
    default:
      return status;
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusChip: {
    backgroundColor: '#e0e0e0',
  },
  statusOpen: {
    backgroundColor: '#e8f5e9',
  },
  statusInProgress: {
    backgroundColor: '#fff3e0',
  },
  statusCompleted: {
    backgroundColor: '#e3f2fd',
  },
  statusCancelled: {
    backgroundColor: '#fce4ec',
  },
  card: {
    marginBottom: 12,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  description: {
    lineHeight: 24,
  },
  distanceText: {
    marginTop: 4,
    color: '#666',
  },
  rewardText: {
    color: '#e65100',
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabel: {
    color: '#666',
  },
  intentNoticeCard: {
    backgroundColor: '#fff8e1',
  },
  intentNoticeText: {
    color: '#f57c00',
    marginBottom: 8,
  },
  withdrawButton: {
    alignSelf: 'flex-start',
  },
  bottomSpacer: {
    height: 80,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 4,
  },
  intentButton: {
    borderRadius: 8,
  },
  intentButtonLabel: {
    fontSize: 16,
    paddingVertical: 4,
  },
  dialogDescription: {
    marginBottom: 12,
    color: '#666',
  },
  messageInput: {
    marginTop: 8,
  },
});
