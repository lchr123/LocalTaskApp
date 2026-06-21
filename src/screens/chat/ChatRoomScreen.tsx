/**
 * Chat Room Screen
 *
 * Real-time messaging interface for task-related communication.
 * Features:
 * - Inverted FlatList for chat (newest messages at bottom)
 * - Text and image message support with send status indicators
 * - Message send status management (sending → sent / failed)
 * - Failed message retry functionality
 * - History message pagination (20 per page, scroll up to load more)
 * - Network disconnect banner
 *
 * Requirements covered:
 * - 7.1: Allow private chat between poster and helper
 * - 7.2: Support text messages up to 1000 characters
 * - 7.3: Support JPEG/PNG images up to 10MB
 * - 7.4: Display new messages within 3 seconds
 * - 7.5: Load history in reverse chronological order, 20 per page
 * - 7.6: Show network disconnect prompt, auto-reconnect
 * - 7.7: Block send and show restriction for invalid messages
 * - 7.8: Show send status with retry option for failed messages
 */

import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Text, Banner, ActivityIndicator, Chip, Icon } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { ChatStackParamList } from '../../navigation/ChatStackNavigator';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ChatMessage } from '../../types/chat';
import { TaskType } from '../../types/task';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import ImageViewerModal from '../../components/common/ImageViewerModal';
import { uploadService } from '../../services/uploadService';
import { TASK_TYPE_LABELS } from '../../utils/constants';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatRoom'>;

/**
 * Generate a unique local ID for optimistic messages.
 */
function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * ChatRoomScreen is the main chat interface where users exchange messages.
 * Uses an inverted FlatList so newest messages appear at the bottom.
 */
export default function ChatRoomScreen({ route, navigation }: Props) {
  const { sessionId, taskId, taskTitle, taskType } = route.params;
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const [viewerImage, setViewerImage] = React.useState<string | null>(null);

  // Stable empty references to avoid creating new objects on each render
  const emptyMessages: ChatMessage[] = React.useMemo(() => [], []);
  const emptyPagination = React.useMemo(() => ({ page: 1, totalPages: 1 }), []);

  // Store state - use stable references to avoid infinite loops
  const messages = useChatStore(
    useCallback((state: any) => state.messages[sessionId] ?? emptyMessages, [sessionId])
  );
  const isLoadingMessages = useChatStore((state) => state.isLoadingMessages);
  const messagePagination = useChatStore(
    useCallback((state: any) => state.messagePagination[sessionId] ?? emptyPagination, [sessionId])
  );
  const connectionStatus = useChatStore((state) => state.connectionStatus);
  const fetchMessages = useChatStore((state) => state.fetchMessages);
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);
  const addOptimisticMessage = useChatStore((state) => state.addOptimisticMessage);
  const retryMessage = useChatStore((state) => state.retryMessage);
  const setActiveSession = useChatStore((state) => state.setActiveSession);
  const markSessionAsRead = useChatStore((state) => state.markSessionAsRead);

  // Auth state for current user
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id ?? '';

  // WebSocket hook
  const { sendTextMessage, sendImageMessage, isConnected } = useWebSocket();

  // Network status
  const isDisconnected = connectionStatus !== 'connected';

  /**
   * Set active session on mount, clear on unmount.
   * Mark session as read when entering.
   */
  useEffect(() => {
    setActiveSession(sessionId);
    markSessionAsRead(sessionId);
    fetchMessages(sessionId);

    return () => {
      setActiveSession(null);
    };
  }, [sessionId, setActiveSession, markSessionAsRead, fetchMessages]);

  /**
   * Mark session as read when new messages arrive while viewing.
   */
  useEffect(() => {
    if (messages.length > 0) {
      markSessionAsRead(sessionId);
    }
  }, [messages.length, sessionId, markSessionAsRead]);

  /**
   * Handle sending a text message.
   * Creates an optimistic message and sends via WebSocket.
   *
   * Requirement 7.2: Text messages ≤1000 characters
   * Requirement 7.8: Optimistic UI with status management
   */
  const handleSendText = useCallback(
    (content: string) => {
      const localId = generateLocalId();
      const optimisticMessage: ChatMessage = {
        id: localId,
        sessionId,
        senderId: currentUserId,
        content,
        type: 'text',
        timestamp: new Date().toISOString(),
        status: 'sending',
      };

      addOptimisticMessage(sessionId, optimisticMessage);
      sendTextMessage(sessionId, content, localId);
    },
    [sessionId, currentUserId, addOptimisticMessage, sendTextMessage]
  );

  /**
   * Handle sending an image message.
   * Creates an optimistic message with local URI and sends via WebSocket.
   *
   * Requirement 7.3: JPEG/PNG images ≤10MB
   * Requirement 7.8: Optimistic UI with status management
   */
  const handleSendImage = useCallback(
    async (imageUri: string) => {
      const localId = generateLocalId();
      const optimisticMessage: ChatMessage = {
        id: localId,
        sessionId,
        senderId: currentUserId,
        content: '',
        type: 'image',
        imageUrl: imageUri,
        timestamp: new Date().toISOString(),
        status: 'sending',
      };

      addOptimisticMessage(sessionId, optimisticMessage);
      try {
        const remoteUrl = await uploadService.uploadImage({
          uri: imageUri,
          fileName: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`,
          mimeType: 'image/jpeg',
        });

        // 真正发给 websocket / 后端保存的是 S3 URL
        sendImageMessage(sessionId, remoteUrl, localId);
      } catch (error) {
        console.error('[ChatRoom] upload image failed:', error);
      }
    },
    [sessionId, currentUserId, addOptimisticMessage, sendImageMessage]
  );

  /**
   * Handle retry for a failed message.
   *
   * Requirement 7.8: Provide retry option for failed messages.
   */
  const handleRetry = useCallback(
    (messageId: string) => {
      retryMessage(sessionId, messageId);
    },
    [sessionId, retryMessage]
  );

  /**
   * Handle loading more messages when scrolling to the top.
   *
   * Requirement 7.5: Load 20 messages per page, scroll up for more.
   */
  const handleLoadMore = useCallback(() => {
    if (messagePagination?.hasMore && !isLoadingMessages) {
      loadMoreMessages(sessionId);
    }
  }, [messagePagination?.hasMore, isLoadingMessages, loadMoreMessages, sessionId]);

  /**
   * Render a single message item.
   */
  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble
        message={item}
        isMine={item.senderId === currentUserId}
        onRetry={handleRetry}
        onImagePress={(url) => setViewerImage(url)}
      />
    ),
    [currentUserId, handleRetry]
  );

  /**
   * Render the loading indicator at the top (end of inverted list).
   */
  const renderFooter = useCallback(() => {
    if (!isLoadingMessages) return null;
    return (
      <View style={styles.loadingMore} accessibilityLabel="加载更多消息">
        <ActivityIndicator size="small" animating />
        <Text style={styles.loadingMoreText}>加载中...</Text>
      </View>
    );
  }, [isLoadingMessages]);

  /**
   * Key extractor for FlatList items.
   */
  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // Show initial loading state
  if (isLoadingMessages && messages.length === 0) {
    return (
      <View style={styles.screen} accessibilityLabel="聊天室">
        <LoadingIndicator mode="inline" message="加载消息中..." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      accessibilityLabel={`聊天室: ${taskTitle}`}
    >
      {/* Network disconnect banner */}
      {isDisconnected && (
        <Banner
          visible
          icon="wifi-off"
          style={styles.disconnectBanner}
          accessibilityLabel="网络连接已断开"
        >
          <Text style={styles.disconnectText}>
            {connectionStatus === 'reconnecting'
              ? '网络连接中断，正在重连...'
              : '网络连接已断开，消息可能无法发送'}
          </Text>
        </Banner>
      )}

      {/* Task info header - tap to view task detail */}
      <TouchableOpacity
        style={styles.taskBanner}
        onPress={() => {
          navigation.dispatch(
            CommonActions.navigate({
              name: 'Home',
              params: {
                screen: 'TaskDetail',
                params: { taskId },
              },
            })
          );
        }}
        activeOpacity={0.7}
        accessibilityLabel={`查看相关任务: ${taskTitle}`}
        accessibilityHint="点击跳转到任务详情"
        accessibilityRole="button"
      >
        <View style={styles.taskBannerContent}>
          {taskType && (
            <Chip
              style={styles.taskBannerChip}
              textStyle={styles.taskBannerChipText}
              compact
            >
              {TASK_TYPE_LABELS[taskType as TaskType] || taskType}
            </Chip>
          )}
          <Text style={styles.taskBannerTitle} numberOfLines={1}>
            {taskTitle}
          </Text>
        </View>
        <Icon source="chevron-right" size={20} color="#757575" />
      </TouchableOpacity>

      {/* Message list (inverted FlatList) */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        inverted
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="消息列表"
      />

      {/* Chat input */}
      <ChatInput
        onSendText={handleSendText}
        onSendImage={handleSendImage}
        disabled={!isConnected}
      />

      {/* Full-screen image viewer */}
      <ImageViewerModal
        visible={viewerImage !== null}
        images={viewerImage ? [viewerImage] : []}
        onClose={() => setViewerImage(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  disconnectBanner: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 4,
  },
  disconnectText: {
    fontSize: 13,
    color: '#E65100',
  },
  taskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  taskBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  taskBannerChip: {
    height: 24,
    marginRight: 8,
    backgroundColor: '#E8F5E9',
  },
  taskBannerChipText: {
    fontSize: 12,
    color: '#2E7D32',
    marginVertical: 0,
    marginHorizontal: 4,
  },
  taskBannerTitle: {
    fontSize: 14,
    color: '#424242',
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingVertical: 8,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#757575',
  },
});
