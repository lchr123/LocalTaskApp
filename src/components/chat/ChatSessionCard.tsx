/**
 * ChatSessionCard Component
 *
 * Displays a chat session card showing task title, participant info,
 * latest message preview, and unread count badge.
 *
 * Requirements covered:
 * - 7.9: Organize chat sessions by task, show task title and latest message preview
 */

import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Badge, Text } from 'react-native-paper';
import { ChatSession } from '../../types/chat';
import { formatRelativeTime, truncateText } from '../../utils/formatters';

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
    const messagePreview = session.lastMessage
      ? truncateText(session.lastMessage, MESSAGE_PREVIEW_MAX_LENGTH)
      : '暂无消息';

    const timeDisplay = session.lastMessageTime
      ? formatRelativeTime(session.lastMessageTime)
      : '';

    return (
      <TouchableOpacity
        onPress={() => onPress(session)}
        activeOpacity={0.7}
        style={styles.container}
        accessibilityLabel={`聊天会话: ${session.taskTitle}, 对方: ${session.participantNickname}`}
        accessibilityRole="button"
        accessibilityHint="点击进入聊天"
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
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
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Top row: task title + time */}
          <View style={styles.topRow}>
            <Text
              style={styles.taskTitle}
              numberOfLines={1}
              accessibilityLabel={`任务: ${session.taskTitle}`}
            >
              {session.taskTitle}
            </Text>
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
        </View>
      </TouchableOpacity>
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
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    flex: 1,
    marginRight: 8,
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
