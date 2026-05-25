/**
 * Chat Store (Zustand)
 *
 * Manages chat-related state for the LocalTask platform.
 * Handles chat sessions, messages, unread counts, and WebSocket connection status.
 *
 * Requirements covered:
 * - 7.4: Real-time message display with unread count updates
 * - 7.6: Connection status tracking for network disconnect handling
 * - 7.8: Message status management (sending → sent / failed) with retry support
 * - 7.9: Sessions organized by task
 */

import { create } from 'zustand';
import { ChatSession, ChatMessage } from '../types/chat';
import { chatService, ConnectionStatus } from '../services/chatService';
import { PAGINATION } from '../utils/constants';

/**
 * Chat store state interface
 */
interface ChatState {
  /** List of chat sessions */
  sessions: ChatSession[];
  /** Messages indexed by session ID */
  messages: Record<string, ChatMessage[]>;
  /** Total unread message count across all sessions */
  unreadCount: number;
  /** WebSocket connection status */
  connectionStatus: ConnectionStatus;
  /** Whether sessions are being loaded */
  isLoadingSessions: boolean;
  /** Whether messages are being loaded */
  isLoadingMessages: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Pagination state per session: { sessionId: { page, hasMore } } */
  messagePagination: Record<string, { page: number; hasMore: boolean }>;
  /** Currently active session ID (user is viewing) */
  activeSessionId: string | null;

  // Actions

  /** Fetch all chat sessions */
  fetchSessions: () => Promise<void>;
  /** Fetch message history for a session */
  fetchMessages: (sessionId: string) => Promise<void>;
  /** Load more (older) messages for a session */
  loadMoreMessages: (sessionId: string) => Promise<void>;
  /** Add a local optimistic message (status: sending) */
  addOptimisticMessage: (sessionId: string, message: ChatMessage) => void;
  /** Handle message acknowledgment from server */
  handleMessageAck: (localId: string, messageId: string) => void;
  /** Handle message send failure */
  handleMessageError: (localId: string, error: string) => void;
  /** Handle incoming message from WebSocket */
  handleIncomingMessage: (message: ChatMessage) => void;
  /** Update connection status */
  setConnectionStatus: (status: ConnectionStatus) => void;
  /** Set the currently active session */
  setActiveSession: (sessionId: string | null) => void;
  /** Mark a session as read (reset unread count) */
  markSessionAsRead: (sessionId: string) => void;
  /** Retry sending a failed message */
  retryMessage: (sessionId: string, localId: string) => void;
  /** Clear error state */
  clearError: () => void;
}

/**
 * Chat Store
 *
 * Central state management for chat features.
 * Uses Zustand for lightweight, TypeScript-friendly state management.
 */
export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  sessions: [],
  messages: {},
  unreadCount: 0,
  connectionStatus: 'disconnected',
  isLoadingSessions: false,
  isLoadingMessages: false,
  error: null,
  messagePagination: {},
  activeSessionId: null,

  /**
   * Fetch all chat sessions from the server.
   *
   * Requirement 7.9: Sessions organized by task.
   */
  fetchSessions: async () => {
    set({ isLoadingSessions: true, error: null });

    try {
      const response = await chatService.fetchSessions();
      const sessions = response.sessions;

      // Calculate total unread count
      const unreadCount = sessions.reduce(
        (total, session) => total + session.unreadCount,
        0
      );

      set({
        sessions,
        unreadCount,
        isLoadingSessions: false,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '加载会话列表失败';
      set({ isLoadingSessions: false, error: message });
    }
  },

  /**
   * Fetch message history for a specific session.
   * Loads the first page (most recent messages).
   *
   * Requirement 7.5: Load history in reverse chronological order, 20 per page.
   */
  fetchMessages: async (sessionId: string) => {
    set({ isLoadingMessages: true, error: null });

    try {
      const response = await chatService.fetchMessages(sessionId, 1);

      set((state) => ({
        messages: {
          ...state.messages,
          [sessionId]: response.messages,
        },
        messagePagination: {
          ...state.messagePagination,
          [sessionId]: {
            page: 1,
            hasMore: response.page < response.totalPages,
          },
        },
        isLoadingMessages: false,
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '加载消息记录失败';
      set({ isLoadingMessages: false, error: message });
    }
  },

  /**
   * Load more (older) messages for a session.
   * Appends to existing messages for infinite scroll.
   *
   * Requirement 7.5: Support scrolling up to load more history.
   */
  loadMoreMessages: async (sessionId: string) => {
    const { messagePagination, isLoadingMessages } = get();
    const pagination = messagePagination[sessionId];

    if (!pagination?.hasMore || isLoadingMessages) {
      return;
    }

    set({ isLoadingMessages: true });

    try {
      const nextPage = pagination.page + 1;
      const response = await chatService.fetchMessages(sessionId, nextPage);

      set((state) => ({
        messages: {
          ...state.messages,
          [sessionId]: [
            ...(state.messages[sessionId] ?? []),
            ...response.messages,
          ],
        },
        messagePagination: {
          ...state.messagePagination,
          [sessionId]: {
            page: nextPage,
            hasMore: response.page < response.totalPages,
          },
        },
        isLoadingMessages: false,
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '加载更多消息失败';
      set({ isLoadingMessages: false, error: message });
    }
  },

  /**
   * Add a local optimistic message with status 'sending'.
   * Used for immediate UI feedback before server confirmation.
   *
   * Requirement 7.8: Messages show sending status immediately.
   */
  addOptimisticMessage: (sessionId: string, message: ChatMessage) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [message, ...(state.messages[sessionId] ?? [])],
      },
    }));

    // Update session's last message preview
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              lastMessage:
                message.type === 'image' ? '[图片]' : message.content,
              lastMessageTime: message.timestamp,
            }
          : session
      ),
    }));
  },

  /**
   * Handle message acknowledgment from server.
   * Updates the local message status from 'sending' to 'sent'.
   *
   * Requirement 7.8: Message status transitions.
   */
  handleMessageAck: (localId: string, messageId: string) => {
    set((state) => {
      const updatedMessages = { ...state.messages };

      for (const sessionId of Object.keys(updatedMessages)) {
        updatedMessages[sessionId] = updatedMessages[sessionId].map((msg) =>
          msg.id === localId
            ? { ...msg, id: messageId, status: 'sent' as const }
            : msg
        );
      }

      return { messages: updatedMessages };
    });
  },

  /**
   * Handle message send failure.
   * Updates the local message status to 'failed'.
   *
   * Requirement 7.8: Failed messages show retry option.
   */
  handleMessageError: (localId: string, _error: string) => {
    set((state) => {
      const updatedMessages = { ...state.messages };

      for (const sessionId of Object.keys(updatedMessages)) {
        updatedMessages[sessionId] = updatedMessages[sessionId].map((msg) =>
          msg.id === localId
            ? { ...msg, status: 'failed' as const }
            : msg
        );
      }

      return { messages: updatedMessages };
    });
  },

  /**
   * Handle incoming message from WebSocket.
   * Adds to the appropriate session and updates unread count.
   *
   * Requirement 7.4: Display new messages within 3 seconds.
   */
  handleIncomingMessage: (message: ChatMessage) => {
    const { activeSessionId } = get();

    set((state) => {
      // Add message to the session's message list
      const sessionMessages = state.messages[message.sessionId] ?? [];
      const updatedMessages = {
        ...state.messages,
        [message.sessionId]: [message, ...sessionMessages],
      };

      // Update session's last message and unread count
      const isActiveSession = activeSessionId === message.sessionId;
      const updatedSessions = state.sessions.map((session) =>
        session.id === message.sessionId
          ? {
              ...session,
              lastMessage:
                message.type === 'image' ? '[图片]' : message.content,
              lastMessageTime: message.timestamp,
              unreadCount: isActiveSession
                ? session.unreadCount
                : session.unreadCount + 1,
            }
          : session
      );

      // Update total unread count
      const unreadCount = isActiveSession
        ? state.unreadCount
        : state.unreadCount + 1;

      return {
        messages: updatedMessages,
        sessions: updatedSessions,
        unreadCount,
      };
    });
  },

  /**
   * Update WebSocket connection status.
   *
   * Requirement 7.6: Track connection status for UI feedback.
   */
  setConnectionStatus: (status: ConnectionStatus) => {
    set({ connectionStatus: status });
  },

  /**
   * Set the currently active session (user is viewing this chat).
   * Used to determine whether to increment unread count.
   */
  setActiveSession: (sessionId: string | null) => {
    set({ activeSessionId: sessionId });
  },

  /**
   * Mark a session as read (reset its unread count).
   */
  markSessionAsRead: (sessionId: string) => {
    set((state) => {
      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session) return state;

      const unreadReduction = session.unreadCount;

      return {
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, unreadCount: 0 } : s
        ),
        unreadCount: Math.max(0, state.unreadCount - unreadReduction),
      };
    });
  },

  /**
   * Retry sending a failed message.
   * Resets the message status to 'sending' and re-sends via WebSocket.
   *
   * Requirement 7.8: Provide retry option for failed messages.
   */
  retryMessage: (sessionId: string, localId: string) => {
    const { messages } = get();
    const sessionMessages = messages[sessionId] ?? [];
    const failedMessage = sessionMessages.find((msg) => msg.id === localId);

    if (!failedMessage || failedMessage.status !== 'failed') {
      return;
    }

    // Update status back to 'sending'
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: (state.messages[sessionId] ?? []).map((msg) =>
          msg.id === localId
            ? { ...msg, status: 'sending' as const }
            : msg
        ),
      },
    }));

    // Re-send via WebSocket
    if (failedMessage.type === 'image' && failedMessage.imageUrl) {
      chatService.sendImageMessage(sessionId, failedMessage.imageUrl, localId);
    } else {
      chatService.sendTextMessage(sessionId, failedMessage.content, localId);
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },
}));
