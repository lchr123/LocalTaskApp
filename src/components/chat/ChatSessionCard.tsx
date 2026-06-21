/**
 * ChatSessionCard Component
 *
 * Displays a chat session card showing task title, participant info,
 * latest message preview, and unread count badge.
 *
 * Requirements covered:
 * - 7.9: Organize chat sessions by task, show task title and latest message preview
 */

import React, { memo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Badge, Chip, Text } from 'react-native-paper';
import { ChatSession } from '../../types/chat';
import { formatRelativeTime, truncateText } from '../../utils/formatters';
import { TASK_TYPE_LABELS } from '../../utils/constants';
import { TaskType } from '../../types/task';
import { UserProfileDialog } from '../common/UserProfileDialog';

/** Maximum characters for message preview */
const MESSAGE_PREVIEW_MAX_LENGTH = 40;

export interface ChatSessionCardProps {
  /** Chat session data to display */
  session: ChatSession;
  /** Callback when the card is pressed */
  onPress: (session: ChatSession) => void;
}

/**
 * ChatSessionCard renders a single chat session item in the session list.
 * Memoized to prevent unnecessary re-renders in FlatList.
 */
export const ChatSessionCard: React.FC<ChatSessionCardProps> = memo(
  ({ session, onPress }) => {
    const [profileVisible, setProfileVisible] = useState(false);

    const messagePreview = session.lastMessage
      ? truncateText(session.lastMessage, MESSAGE_PREVIEW_MAX_LENGTH)
      : '暂无消息';

    const timeDisplay = session.lastMessageTime
      ? formatRelativeTime(session.lastMessageTime)
      : '';

    return (
      <View
        style={styles.container}
        accessibilityLabel={`聊天会话: ${session.taskTitle}, 对方: ${session.participantNickname}`}
      >
        {/* Avatar — tap to view participant profile */}
        <TouchableOpacity
          onPress={() => setProfileVisible(true)}
          activeOpacity={0.7}
          style={styles.avatarContainer}
          accessibilityLabel={`查看${session.participantNickname}的资料`}
          accessibilityRole="button"
          accessibilityHint="点击查看接单人详细资料"
        >
          {session.participantAvatarUrl ? (
            <Avatar.Image
              size={48}
              source={{ uri: session.participantAvatarUrl }}
              accessibilityLabel={`${session.participantNickname}的头像`}
            />
          ) : (
            <Avatar.Text
              size={48}
              label={session.participantNickname.slice(0, 1)}
              accessibilityLabel={`${session.participantNickname}的头像`}
            />
          )}
          {session.unreadCount > 0 && (
            <Badge
              style={styles.badge}
              size={18}
              accessibilityLabel={`${session.unreadCount}条未读消息`}
            >
              {session.unreadCount > 99 ? '99+' : session.unreadCount}
            </Badge>
          )}
        </TouchableOpacity>

        {/* Content — tap to enter the chat */}
        <TouchableOpacity
          onPress={() => onPress(session)}
          activeOpacity={0.7}
          style={styles.content}
          accessibilityLabel={`进入与${session.participantNickname}的聊天`}
          accessibilityRole="button"
          accessibilityHint="点击进入聊天"
        >
          {/* Top row: task type chip + task title + time */}
          <View style={styles.topRow}>
            <View style={styles.titleRow}>
              {session.taskType && (
                <Chip
                  style={styles.typeChip}
                  textStyle={styles.typeChipText}
                  compact
                  accessibilityLabel={`任务类型: ${TASK_TYPE_LABELS[session.taskType as TaskType] || session.taskType}`}
                >
                  {TASK_TYPE_LABELS[session.taskType as TaskType] || session.taskType}
                </Chip>
              )}
              <Text
                style={styles.taskTitle}
                numberOfLines={1}
                accessibilityLabel={`任务: ${session.taskTitle}`}
              >
                {session.taskTitle}
              </Text>
            </View>
            <Text
              style={styles.time}
              accessibilityLabel={`时间: ${timeDisplay}`}
            >
              {timeDisplay}
            </Text>
          </View>

          {/* Bottom row: participant name + message preview */}
          <Text
            style={styles.participantName}
            numberOfLines={1}
            accessibilityLabel={`参与者: ${session.participantNickname}`}
          >
            {session.participantNickname}
          </Text>
          <Text
            style={[
              styles.messagePreview,
              session.unreadCount > 0 && styles.messagePreviewUnread,
            ]}
            numberOfLines={1}
            accessibilityLabel={`最新消息: ${messagePreview}`}
          >
            {messagePreview}
          </Text>
        </TouchableOpacity>

        <UserProfileDialog
          visible={profileVisible}
          userId={session.participantId}
          nickname={session.participantNickname}
          onDismiss={() => setProfileVisible(false)}
        />
      </View>
    );
  }
);

ChatSessionCard.displayName = 'ChatSessionCard';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F44336',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  typeChip: {
    height: 22,
    marginRight: 6,
    backgroundColor: '#E8F5E9',
  },
  typeChipText: {
    fontSize: 11,
    lineHeight: 14,
    marginVertical: 0,
    marginHorizontal: 4,
    color: '#2E7D32',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  participantName: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 2,
  },
  messagePreview: {
    fontSize: 14,
    color: '#9E9E9E',
    lineHeight: 18,
  },
  messagePreviewUnread: {
    color: '#424242',
    fontWeight: '500',
  },
});

export default ChatSessionCard;
