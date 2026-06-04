/**
 * Chat List Screen
 *
 * Displays chat sessions organized by task dimension.
 * Shows task title, latest message preview, and unread count.
 * Supports pull-to-refresh and handles loading/error/empty states.
 *
 * Requirements covered:
 * - 7.9: Organize chat sessions by task dimension, show task title and latest message preview
 * - 10.3: Show loading indicator while fetching data
 * - 10.4: Show error with retry on failure
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useChatStore } from '../../stores/chatStore';
import { ChatSession } from '../../types/chat';
import { ChatStackParamList } from '../../navigation/ChatStackNavigator';
import { ChatSessionCard } from '../../components/chat/ChatSessionCard';
import { LoadingIndicator, ErrorRetry, EmptyState } from '../../components/common';
import { useAuthStore } from '../../stores/authStore';
import AuthRequired from '../../components/auth/AuthRequired';

type ChatListNavigationProp = NativeStackNavigationProp<
  ChatStackParamList,
  'ChatList'
>;

/**
 * ChatListScreen displays all chat sessions grouped by task.
 * Sessions are sorted by last message time (most recent first).
 */
export default function ChatListScreen() {
  const navigation = useNavigation<ChatListNavigationProp>();
  const {
    sessions,
    isLoadingSessions,
    error,
    fetchSessions,
    clearError,
  } = useChatStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isAuthenticated, tokens } = useAuthStore();
  const isLoggedIn = isAuthenticated && !!tokens;

  // Fetch sessions on mount
  useEffect(() => {
    if (isLoggedIn) {
      fetchSessions();
    }
  }, [isLoggedIn, fetchSessions]);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchSessions();
    setIsRefreshing(false);
  }, [fetchSessions]);

  /**
   * Navigate to chat room when a session is pressed
   */
  const handleSessionPress = useCallback(
    (session: ChatSession) => {
      navigation.navigate('ChatRoom', {
        sessionId: session.id,
        taskId: session.taskId,
        taskTitle: session.taskTitle,
        taskType: session.taskType,
      });
    },
    [navigation]
  );

  /**
   * Handle retry on error
   */
  const handleRetry = useCallback(async () => {
    clearError();
    await fetchSessions();
  }, [clearError, fetchSessions]);

  /**
   * Render individual session card
   */
  const renderSessionItem = useCallback(
    ({ item }: { item: ChatSession }) => (
      <ChatSessionCard session={item} onPress={handleSessionPress} />
    ),
    [handleSessionPress]
  );

  /**
   * Key extractor for FlatList
   */
  const keyExtractor = useCallback(
    (item: ChatSession) => item.id,
    []
  );

  // Sort sessions by last message time (most recent first)
  const sortedSessions = [...sessions].sort((a, b) => {
    if (!a.lastMessageTime && !b.lastMessageTime) return 0;
    if (!a.lastMessageTime) return 1;
    if (!b.lastMessageTime) return -1;
    return (
      new Date(b.lastMessageTime).getTime() -
      new Date(a.lastMessageTime).getTime()
    );
  });

  if (!isLoggedIn) {
    return (
      <View style={styles.container} accessibilityLabel="消息页面未登录">
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityLabel="消息页面标题">
            消息
          </Text>
        </View>

        <AuthRequired
          icon="chat-outline"
          title="登录后可以查看消息"
          description="登录或注册后，您可以查看聊天会话，并与任务相关用户沟通。"
        />
      </View>
    );
  }

  // Show loading state on initial load
  if (isLoadingSessions && sessions.length === 0) {
    return (
      <View style={styles.container} accessibilityLabel="消息列表加载中">
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityLabel="消息页面标题">
            消息
          </Text>
        </View>
        <LoadingIndicator mode="fullscreen" message="加载会话中..." />
      </View>
    );
  }

  // Show error state
  if (error && sessions.length === 0) {
    return (
      <View style={styles.container} accessibilityLabel="消息列表加载失败">
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityLabel="消息页面标题">
            消息
          </Text>
        </View>
        <ErrorRetry
          errorMessage={error}
          onRetry={handleRetry}
          accessibilityLabel="消息加载错误重试"
        />
      </View>
    );
  }

  // Show empty state
  if (!isLoadingSessions && sessions.length === 0) {
    return (
      <View style={styles.container} accessibilityLabel="消息列表为空">
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityLabel="消息页面标题">
            消息
          </Text>
        </View>
        <EmptyState
          icon="chat-outline"
          message="暂无聊天会话"
          description="当您参与任务后，聊天会话将显示在这里"
          accessibilityLabel="暂无聊天会话"
        />
      </View>
    );
  }

  return (
    <View style={styles.container} accessibilityLabel="消息列表">
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityLabel="消息页面标题">
          消息
        </Text>
      </View>
      <FlatList
        data={sortedSessions}
        renderItem={renderSessionItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            accessibilityLabel="下拉刷新会话列表"
          />
        }
        showsVerticalScrollIndicator={false}
        accessibilityLabel="聊天会话列表"
        accessibilityRole="list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212121',
  },
  listContent: {
    flexGrow: 1,
  },
});
