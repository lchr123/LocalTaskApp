/**
 * MessageBubble Component
 *
 * Renders a single chat message bubble with support for:
 * - Text and image message types
 * - Sender (right-aligned) vs received (left-aligned) layout
 * - Send status indicators: sending spinner, sent checkmark, failed with retry
 *
 * Requirements covered:
 * - 7.2: Display text messages
 * - 7.3: Display image messages
 * - 7.8: Show send status (sending/sent/failed) with retry option
 */

import React, { memo } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { ChatMessage } from '../../types/chat';
import { formatRelativeTime } from '../../utils/formatters';

export interface MessageBubbleProps {
  /** The chat message to display */
  message: ChatMessage;
  /** Whether this message was sent by the current user */
  isMine: boolean;
  /** Callback when retry button is pressed for a failed message */
  onRetry?: (messageId: string) => void;
}

/**
 * MessageBubble renders a single message in the chat room.
 * Sent messages appear on the right, received messages on the left.
 * Memoized to prevent unnecessary re-renders in FlatList.
 */
export const MessageBubble: React.FC<MessageBubbleProps> = memo(
  ({ message, isMine, onRetry }) => {
    const isImage = message.type === 'image';
    const isFailed = message.status === 'failed';
    const isSending = message.status === 'sending';
    const isSent = message.status === 'sent' || message.status === 'delivered';

    const bubbleAccessibilityLabel = isMine
      ? `我发送的${isImage ? '图片' : '文字'}消息${isFailed ? '，发送失败' : ''}`
      : `收到的${isImage ? '图片' : '文字'}消息`;

    return (
      <View
        style={[styles.container, isMine ? styles.containerMine : styles.containerOther]}
        accessibilityLabel={bubbleAccessibilityLabel}
      >
        {/* Failed retry button (shown on left of sender's bubble) */}
        {isMine && isFailed && (
          <TouchableOpacity
            onPress={() => onRetry?.(message.id)}
            style={styles.retryButton}
            accessibilityLabel="重新发送消息"
            accessibilityRole="button"
            accessibilityHint="点击重新发送失败的消息"
          >
            <IconButton
              icon="alert-circle"
              size={20}
              iconColor="#F44336"
              style={styles.retryIcon}
            />
          </TouchableOpacity>
        )}

        {/* Message bubble */}
        <View
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleOther,
            isImage && styles.bubbleImage,
          ]}
        >
          {/* Text message content */}
          {!isImage && (
            <Text
              style={[styles.messageText, isMine ? styles.textMine : styles.textOther]}
              accessibilityLabel={message.content}
            >
              {message.content}
            </Text>
          )}

          {/* Image message content */}
          {isImage && message.imageUrl && (
            <Image
              source={{ uri: message.imageUrl }}
              style={styles.messageImage}
              resizeMode="cover"
              accessibilityLabel="图片消息"
            />
          )}

          {/* Timestamp */}
          <Text
            style={[styles.timestamp, isMine ? styles.timestampMine : styles.timestampOther]}
            accessibilityLabel={`发送时间: ${formatRelativeTime(message.timestamp)}`}
          >
            {formatRelativeTime(message.timestamp)}
          </Text>
        </View>

        {/* Status indicator (shown on right of sender's bubble) */}
        {isMine && (
          <View style={styles.statusContainer} accessibilityLabel={`消息状态: ${getStatusLabel(message.status)}`}>
            {isSending && (
              <ActivityIndicator
                size={12}
                animating
                accessibilityLabel="消息发送中"
              />
            )}
            {isSent && (
              <IconButton
                icon="check"
                size={14}
                iconColor="#4CAF50"
                style={styles.statusIcon}
                accessibilityLabel="消息已发送"
              />
            )}
            {isFailed && (
              <IconButton
                icon="close"
                size={14}
                iconColor="#F44336"
                style={styles.statusIcon}
                accessibilityLabel="消息发送失败"
              />
            )}
          </View>
        )}
      </View>
    );
  }
);

MessageBubble.displayName = 'MessageBubble';

/**
 * Get a human-readable label for message status.
 */
function getStatusLabel(status: ChatMessage['status']): string {
  switch (status) {
    case 'sending':
      return '发送中';
    case 'sent':
      return '已发送';
    case 'delivered':
      return '已送达';
    case 'failed':
      return '发送失败';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  containerMine: {
    justifyContent: 'flex-end',
  },
  containerOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '70%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMine: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E0',
  },
  bubbleImage: {
    padding: 4,
    overflow: 'hidden',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  textMine: {
    color: '#212121',
  },
  textOther: {
    color: '#212121',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  timestampMine: {
    color: '#757575',
    textAlign: 'right',
  },
  timestampOther: {
    color: '#9E9E9E',
    textAlign: 'left',
  },
  statusContainer: {
    marginLeft: 4,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIcon: {
    margin: 0,
    padding: 0,
  },
  retryButton: {
    marginRight: 4,
    justifyContent: 'center',
  },
  retryIcon: {
    margin: 0,
    padding: 0,
  },
});

export default MessageBubble;
