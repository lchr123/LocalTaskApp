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
import { View, ScrollView, StyleSheet, Platform, Image, TouchableOpacity } from 'react-native';
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
  IconButton,
  Menu,
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TaskStackParamList } from '../../navigation/TaskStackNavigator';
import { useTaskStore } from '../../stores/taskStore';
import { useAuthStore } from '../../stores/authStore';
import { appDialog } from '../../stores/dialogStore';
import { formatReward, formatRelativeTime, formatRating } from '../../utils/formatters';
import { TASK_TYPE_LABELS, VALIDATION } from '../../utils/constants';
import ImageViewerModal from '../../components/common/ImageViewerModal';

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
  const [menuVisible, setMenuVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Set up header right menu button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="dots-vertical"
          onPress={() => setMenuVisible(true)}
          accessibilityLabel="更多操作"
        />
      ),
    });
  }, [navigation]);

  // Load task detail and check if user already submitted intent
  useEffect(() => {
    fetchTaskDetail(taskId);
    // Check if current user has a pending intent for this task
    const checkMyIntent = async () => {
      try {
        const { default: apiClient } = await import('../../services/api');
        const res = await apiClient.get(`/tasks/${taskId}/intents/mine`);
        if (res.data.hasIntent && res.data.intent) {
          // Add to intents array so hasSubmittedIntent works
          useTaskStore.setState((state) => ({
            intents: [{ 
              id: res.data.intent.id, 
              taskId, 
              helperId: user?.id || '', 
              message: res.data.intent.message,
              status: 'pending' as const,
              createdAt: res.data.intent.created_at,
            }],
          }));
        }
      } catch {
        // 404 means no intent - that's fine
      }
    };
    if (user?.id) {
      checkMyIntent();
    }
    return () => {
      clearCurrentTask();
    };
  }, [taskId, fetchTaskDetail, clearCurrentTask, user?.id]);

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
  const isLoggedIn = !!user?.id;
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
            accessibilityLabel={`任务类型：${TASK_TYPE_LABELS[currentTask.type] || currentTask.type}`}
          >
            {TASK_TYPE_LABELS[currentTask.type] || currentTask.type}
          </Chip>
          <View style={styles.headerRightRow}>
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
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={20}
                  onPress={() => setMenuVisible(true)}
                  accessibilityLabel="更多操作"
                />
              }
            >
              <Menu.Item
                leadingIcon="alert-octagon"
                onPress={() => {
                  setMenuVisible(false);
                  if (!user?.id) {
                    appDialog.alert({ message: '请先登录后再举报' });
                    return;
                  }
                  (navigation as any).navigate('CreateReport', {
                    targetType: 'task',
                    targetId: taskId,
                    targetName: currentTask?.description?.slice(0, 30) || '任务',
                  });
                }}
                title="举报此任务"
                accessibilityLabel="举报此任务"
              />
            </Menu>
          </View>
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

        {/* Tags */}
        {currentTask.tags && currentTask.tags.length > 0 && (
          <Card style={styles.card} accessibilityLabel="任务标签">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                任务标签
              </Text>
              <View style={styles.tagsWrap}>
                {currentTask.tags.map((tag) => (
                  <Chip
                    key={tag.id}
                    style={styles.detailTagChip}
                    compact
                    accessibilityLabel={`标签：${tag.label_zh}`}
                  >
                    {tag.label_zh}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Task Images */}
        {currentTask.images && currentTask.images.length > 0 && (
          <Card style={styles.card} accessibilityLabel="任务图片">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                任务图片
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageRow}
              >
                {currentTask.images.map((url, idx) => (
                  <TouchableOpacity
                    key={`${url}-${idx}`}
                    activeOpacity={0.8}
                    onPress={() => {
                      setViewerIndex(idx);
                      setViewerVisible(true);
                    }}
                    accessibilityLabel={`任务图片 ${idx + 1}，点击放大`}
                    accessibilityRole="button"
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.taskImage}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Card.Content>
          </Card>
        )}

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
              {currentTask.rewardUnit ? (
                <Text variant="bodyMedium" style={styles.rewardUnitText}>
                  {`  / ${REWARD_UNIT_LABEL[currentTask.rewardUnit] || currentTask.rewardUnit}`}
                </Text>
              ) : null}
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
                {new Date(currentTask.deadline).toLocaleString('ja-JP', { hour12: false })}
              </Text>
            </View>
            {currentTask.startTime && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.infoLabel}>
                  预计开始：
                </Text>
                <Text variant="bodyMedium">
                  {new Date(currentTask.startTime).toLocaleString('ja-JP', { hour12: false })}
                </Text>
              </View>
            )}
            {currentTask.durationHours != null && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.infoLabel}>
                  预计时长：
                </Text>
                <Text variant="bodyMedium">
                  {currentTask.durationHours} 小时
                  {currentTask.durationUnit
                    ? ` / ${DURATION_UNIT_LABEL[currentTask.durationUnit] || currentTask.durationUnit}`
                    : ''}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Recruitment & Contact */}
        <Card style={styles.card} accessibilityLabel="招募与联系信息">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              招募与联系
            </Text>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>
                招募人数：
              </Text>
              <Text variant="bodyMedium">{currentTask.headcount ?? 1} 人</Text>
            </View>
            {currentTask.contactMethod ? (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.infoLabel}>
                  联系方式：
                </Text>
                <Text variant="bodyMedium" style={styles.contactText}>
                  {currentTask.contactMethod}
                </Text>
              </View>
            ) : null}
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
                accessibilityLabel={`发布者评分：${formatRating(currentTask.posterRating)}`}
              >
                ⭐ {formatRating(currentTask.posterRating)}
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
            {/* Poster can view intent list and select helper */}
            {currentTask.posterId === user?.id && currentTask.intentCount > 0 && (
              <Button
                mode="contained-tonal"
                onPress={() => (navigation as any).navigate('IntentList', { taskId })}
                style={{ marginTop: 12 }}
                icon="account-group"
                accessibilityLabel="查看意向列表"
              >
                查看申请人 ({currentTask.intentCount})
              </Button>
            )}
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
            onPress={async () => {
              if (!isLoggedIn) {
                await appDialog.alert({ message: '请先登录后再提交意向' });
                (navigation as any).navigate('Auth');
                return;
              }
              handleIntentButtonPress();
            }}
            style={styles.intentButton}
            labelStyle={styles.intentButtonLabel}
            accessibilityLabel={isLoggedIn ? '我想帮忙' : '帮忙前请先登录'}
          >
            {isLoggedIn ? '我想帮忙' : '帮忙前请先登录'}
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

      {/* Full-screen image viewer */}
      <ImageViewerModal
        visible={viewerVisible}
        images={currentTask.images || []}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
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

const REWARD_UNIT_LABEL: Record<string, string> = { once: '次', hour: '小时', day: '日', month: '月' };
const DURATION_UNIT_LABEL: Record<string, string> = { once: '次', day: '日', week: '周', month: '月' };

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
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  rewardUnitText: {
    color: '#999',
    fontWeight: '400',
  },
  imageRow: {
    gap: 8,
    paddingVertical: 4,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailTagChip: {
    backgroundColor: '#F1F8E9',
  },
  taskImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  contactText: {
    flex: 1,
    flexWrap: 'wrap',
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
