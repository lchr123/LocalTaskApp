/**
 * Unit Tests for Chat Store
 *
 * Tests chatStore state management for sessions, messages, unread counts,
 * and connection status.
 *
 * Validates:
 * - Requirement 7.4: Unread count updates on new messages
 * - Requirement 7.6: Connection status tracking
 * - Requirement 7.8: Message status management (sending → sent / failed)
 * - Requirement 7.9: Sessions organized by task
 */

import { useChatStore } from '../chatStore';
import { chatService } from '../../services/chatService';
import { ChatMessage } from '../../types/chat';

// Mock chatService
jest.mock('../../services/chatService', () => ({
  chatService: {
    fetchSessions: jest.fn(),
    fetchMessages: jest.fn(),
    sendTextMessage: jest.fn(),
    sendImageMessage: jest.fn(),
  },
}));

const mockChatService = chatService as jest.Mocked<typeof chatService>;

describe('ChatStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useChatStore.setState({
      sessions: [],
      messages: {},
      unreadCount: 0,
      connectionStatus: 'disconnected',
      isLoadingSessions: false,
      isLoadingMessages: false,
      error: null,
      messagePagination: {},
      activeSessionId: null,
    });
  });

  describe('fetchSessions', () => {
    it('loads sessions and calculates total unread count (Req 7.9)', async () => {
      const mockSessions = {
        sessions: [
          {
            id: 'session-1',
            taskId: 'task-1',
            taskTitle: 'Deliver package',
            participantId: 'user-2',
            participantNickname: 'Helper A',
            lastMessage: 'On my way!',
            lastMessageTime: '2025-01-15T10:00:00Z',
            unreadCount: 3,
          },
          {
            id: 'session-2',
            taskId: 'task-2',
            taskTitle: 'Buy groceries',
            participantId: 'user-3',
            participantNickname: 'Helper B',
            lastMessage: 'Done!',
            lastMessageTime: '2025-01-15T09:00:00Z',
            unreadCount: 1,
          },
        ],
      };
      mockChatService.fetchSessions.mockResolvedValue(mockSessions);

      await useChatStore.getState().fetchSessions();

      const state = useChatStore.getState();
      expect(state.sessions).toHaveLength(2);
      expect(state.unreadCount).toBe(4); // 3 + 1
      expect(state.isLoadingSessions).toBe(false);
    });

    it('sets error on fetch failure', async () => {
      mockChatService.fetchSessions.mockRejectedValue(new Error('Network Error'));

      await useChatStore.getState().fetchSessions();

      const state = useChatStore.getState();
      expect(state.error).toBe('Network Error');
      expect(state.isLoadingSessions).toBe(false);
    });
  });

  describe('fetchMessages', () => {
    it('loads messages for a session with pagination (Req 7.5)', async () => {
      const mockMessages = {
        messages: [
          {
            id: 'msg-1',
            sessionId: 'session-1',
            senderId: 'user-2',
            content: 'Hello',
            type: 'text' as const,
            timestamp: '2025-01-15T10:00:00Z',
            status: 'delivered' as const,
          },
        ],
        page: 1,
        totalPages: 3,
      };
      mockChatService.fetchMessages.mockResolvedValue(mockMessages);

      await useChatStore.getState().fetchMessages('session-1');

      const state = useChatStore.getState();
      expect(state.messages['session-1']).toHaveLength(1);
      expect(state.messagePagination['session-1']).toEqual({
        page: 1,
        hasMore: true,
      });
      expect(state.isLoadingMessages).toBe(false);
    });

    it('sets hasMore to false on last page', async () => {
      const mockMessages = {
        messages: [{ id: 'msg-1', sessionId: 'session-1', senderId: 'user-2', content: 'Hi', type: 'text' as const, timestamp: '2025-01-15T10:00:00Z', status: 'delivered' as const }],
        page: 3,
        totalPages: 3,
      };
      mockChatService.fetchMessages.mockResolvedValue(mockMessages);

      await useChatStore.getState().fetchMessages('session-1');

      const state = useChatStore.getState();
      expect(state.messagePagination['session-1'].hasMore).toBe(false);
    });
  });

  describe('loadMoreMessages', () => {
    it('appends older messages to existing list', async () => {
      // Set up initial state with page 1 loaded
      useChatStore.setState({
        messages: {
          'session-1': [
            { id: 'msg-1', sessionId: 'session-1', senderId: 'user-1', content: 'Recent', type: 'text', timestamp: '2025-01-15T10:00:00Z', status: 'delivered' },
          ],
        },
        messagePagination: {
          'session-1': { page: 1, hasMore: true },
        },
      });

      const mockMessages = {
        messages: [
          { id: 'msg-2', sessionId: 'session-1', senderId: 'user-2', content: 'Older', type: 'text' as const, timestamp: '2025-01-15T09:00:00Z', status: 'delivered' as const },
        ],
        page: 2,
        totalPages: 3,
      };
      mockChatService.fetchMessages.mockResolvedValue(mockMessages);

      await useChatStore.getState().loadMoreMessages('session-1');

      const state = useChatStore.getState();
      expect(state.messages['session-1']).toHaveLength(2);
      expect(state.messagePagination['session-1'].page).toBe(2);
    });

    it('does not load if no more pages', async () => {
      useChatStore.setState({
        messages: { 'session-1': [] },
        messagePagination: { 'session-1': { page: 3, hasMore: false } },
      });

      await useChatStore.getState().loadMoreMessages('session-1');

      expect(mockChatService.fetchMessages).not.toHaveBeenCalled();
    });
  });

  describe('addOptimisticMessage', () => {
    it('adds message with sending status to the front of the list (Req 7.8)', () => {
      useChatStore.setState({
        messages: { 'session-1': [] },
        sessions: [
          {
            id: 'session-1',
            taskId: 'task-1',
            taskTitle: 'Test',
            participantId: 'user-2',
            participantNickname: 'Helper',
            lastMessage: 'Old message',
            lastMessageTime: '2025-01-15T09:00:00Z',
            unreadCount: 0,
          },
        ],
      });

      const optimisticMsg: ChatMessage = {
        id: 'local-1',
        sessionId: 'session-1',
        senderId: 'user-1',
        content: 'New message',
        type: 'text',
        timestamp: '2025-01-15T10:00:00Z',
        status: 'sending',
      };

      useChatStore.getState().addOptimisticMessage('session-1', optimisticMsg);

      const state = useChatStore.getState();
      expect(state.messages['session-1'][0]).toEqual(optimisticMsg);
      expect(state.sessions[0].lastMessage).toBe('New message');
    });

    it('shows [图片] for image messages in session preview', () => {
      useChatStore.setState({
        messages: { 'session-1': [] },
        sessions: [
          {
            id: 'session-1',
            taskId: 'task-1',
            taskTitle: 'Test',
            participantId: 'user-2',
            participantNickname: 'Helper',
            lastMessage: '',
            lastMessageTime: '',
            unreadCount: 0,
          },
        ],
      });

      const imageMsg: ChatMessage = {
        id: 'local-2',
        sessionId: 'session-1',
        senderId: 'user-1',
        content: '',
        type: 'image',
        imageUrl: 'https://img.example.com/photo.jpg',
        timestamp: '2025-01-15T10:00:00Z',
        status: 'sending',
      };

      useChatStore.getState().addOptimisticMessage('session-1', imageMsg);

      const state = useChatStore.getState();
      expect(state.sessions[0].lastMessage).toBe('[图片]');
    });
  });

  describe('handleMessageAck', () => {
    it('updates message status from sending to sent (Req 7.8)', () => {
      useChatStore.setState({
        messages: {
          'session-1': [
            { id: 'local-1', sessionId: 'session-1', senderId: 'user-1', content: 'Hello', type: 'text', timestamp: '2025-01-15T10:00:00Z', status: 'sending' },
          ],
        },
      });

      useChatStore.getState().handleMessageAck('local-1', 'server-msg-1');

      const state = useChatStore.getState();
      expect(state.messages['session-1'][0].id).toBe('server-msg-1');
      expect(state.messages['session-1'][0].status).toBe('sent');
    });
  });

  describe('handleMessageError', () => {
    it('updates message status to failed (Req 7.8)', () => {
      useChatStore.setState({
        messages: {
          'session-1': [
            { id: 'local-1', sessionId: 'session-1', senderId: 'user-1', content: 'Hello', type: 'text', timestamp: '2025-01-15T10:00:00Z', status: 'sending' },
          ],
        },
      });

      useChatStore.getState().handleMessageError('local-1', 'Send failed');

      const state = useChatStore.getState();
      expect(state.messages['session-1'][0].status).toBe('failed');
    });
  });

  describe('handleIncomingMessage', () => {
    it('adds incoming message and increments unread when not active (Req 7.4)', () => {
      useChatStore.setState({
        messages: { 'session-1': [] },
        sessions: [
          {
            id: 'session-1',
            taskId: 'task-1',
            taskTitle: 'Test',
            participantId: 'user-2',
            participantNickname: 'Helper',
            lastMessage: '',
            lastMessageTime: '',
            unreadCount: 0,
          },
        ],
        unreadCount: 0,
        activeSessionId: null, // Not viewing this session
      });

      const incomingMsg: ChatMessage = {
        id: 'msg-new',
        sessionId: 'session-1',
        senderId: 'user-2',
        content: 'Hey!',
        type: 'text',
        timestamp: '2025-01-15T10:00:00Z',
        status: 'delivered',
      };

      useChatStore.getState().handleIncomingMessage(incomingMsg);

      const state = useChatStore.getState();
      expect(state.messages['session-1'][0]).toEqual(incomingMsg);
      expect(state.sessions[0].unreadCount).toBe(1);
      expect(state.unreadCount).toBe(1);
    });

    it('does not increment unread when session is active', () => {
      useChatStore.setState({
        messages: { 'session-1': [] },
        sessions: [
          {
            id: 'session-1',
            taskId: 'task-1',
            taskTitle: 'Test',
            participantId: 'user-2',
            participantNickname: 'Helper',
            lastMessage: '',
            lastMessageTime: '',
            unreadCount: 0,
          },
        ],
        unreadCount: 0,
        activeSessionId: 'session-1', // Currently viewing this session
      });

      const incomingMsg: ChatMessage = {
        id: 'msg-new',
        sessionId: 'session-1',
        senderId: 'user-2',
        content: 'Hey!',
        type: 'text',
        timestamp: '2025-01-15T10:00:00Z',
        status: 'delivered',
      };

      useChatStore.getState().handleIncomingMessage(incomingMsg);

      const state = useChatStore.getState();
      expect(state.sessions[0].unreadCount).toBe(0);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('setConnectionStatus', () => {
    it('updates connection status (Req 7.6)', () => {
      useChatStore.getState().setConnectionStatus('connected');
      expect(useChatStore.getState().connectionStatus).toBe('connected');

      useChatStore.getState().setConnectionStatus('reconnecting');
      expect(useChatStore.getState().connectionStatus).toBe('reconnecting');
    });
  });

  describe('markSessionAsRead', () => {
    it('resets session unread count and updates total', () => {
      useChatStore.setState({
        sessions: [
          {
            id: 'session-1',
            taskId: 'task-1',
            taskTitle: 'Test',
            participantId: 'user-2',
            participantNickname: 'Helper',
            lastMessage: 'Hi',
            lastMessageTime: '2025-01-15T10:00:00Z',
            unreadCount: 5,
          },
        ],
        unreadCount: 5,
      });

      useChatStore.getState().markSessionAsRead('session-1');

      const state = useChatStore.getState();
      expect(state.sessions[0].unreadCount).toBe(0);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('retryMessage', () => {
    it('resets failed message to sending and re-sends via WebSocket (Req 7.8)', () => {
      useChatStore.setState({
        messages: {
          'session-1': [
            { id: 'local-1', sessionId: 'session-1', senderId: 'user-1', content: 'Retry me', type: 'text', timestamp: '2025-01-15T10:00:00Z', status: 'failed' },
          ],
        },
      });

      useChatStore.getState().retryMessage('session-1', 'local-1');

      const state = useChatStore.getState();
      expect(state.messages['session-1'][0].status).toBe('sending');
      expect(mockChatService.sendTextMessage).toHaveBeenCalledWith('session-1', 'Retry me', 'local-1');
    });

    it('retries image messages correctly', () => {
      useChatStore.setState({
        messages: {
          'session-1': [
            { id: 'local-2', sessionId: 'session-1', senderId: 'user-1', content: '', type: 'image', imageUrl: 'https://img.example.com/photo.jpg', timestamp: '2025-01-15T10:00:00Z', status: 'failed' },
          ],
        },
      });

      useChatStore.getState().retryMessage('session-1', 'local-2');

      const state = useChatStore.getState();
      expect(state.messages['session-1'][0].status).toBe('sending');
      expect(mockChatService.sendImageMessage).toHaveBeenCalledWith('session-1', 'https://img.example.com/photo.jpg', 'local-2');
    });

    it('does nothing for non-failed messages', () => {
      useChatStore.setState({
        messages: {
          'session-1': [
            { id: 'local-1', sessionId: 'session-1', senderId: 'user-1', content: 'Sent', type: 'text', timestamp: '2025-01-15T10:00:00Z', status: 'sent' },
          ],
        },
      });

      useChatStore.getState().retryMessage('session-1', 'local-1');

      expect(mockChatService.sendTextMessage).not.toHaveBeenCalled();
    });
  });

  describe('setActiveSession', () => {
    it('sets the active session ID', () => {
      useChatStore.getState().setActiveSession('session-1');
      expect(useChatStore.getState().activeSessionId).toBe('session-1');

      useChatStore.getState().setActiveSession(null);
      expect(useChatStore.getState().activeSessionId).toBeNull();
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useChatStore.setState({ error: 'Some error' });
      useChatStore.getState().clearError();
      expect(useChatStore.getState().error).toBeNull();
    });
  });
});
