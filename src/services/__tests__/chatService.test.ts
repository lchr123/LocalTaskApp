/**
 * Unit Tests for Chat Service
 *
 * Tests chatService methods for WebSocket connection, messaging, and auto-reconnect.
 *
 * Validates:
 * - Requirement 7.4: Real-time message delivery via WebSocket
 * - Requirement 7.6: Auto-reconnect with exponential backoff (max 5 attempts, 3s base)
 * - Requirement 7.8: Message send/receive and failure handling
 */

import { chatService } from '../chatService';
import apiClient from '../api';

// Mock the api client
jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Mock CloseEvent for Node.js test environment
class CloseEvent extends Event {
  constructor(type: string) {
    super(type);
  }
}
(global as unknown as Record<string, unknown>).CloseEvent = CloseEvent;

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static autoOpen = true;

  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  sentMessages: string[] = [];

  constructor(public url: string) {
    // Simulate async connection (only if autoOpen is enabled)
    if (MockWebSocket.autoOpen) {
      setTimeout(() => {
        if (this.readyState === MockWebSocket.CONNECTING) {
          this.readyState = MockWebSocket.OPEN;
          if (this.onopen) {
            this.onopen(new Event('open'));
          }
        }
      }, 0);
    }
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Test helpers
  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
    }
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Store WebSocket instances for test access
let wsInstances: MockWebSocket[] = [];

(global as unknown as Record<string, unknown>).WebSocket = class extends MockWebSocket {
  constructor(url: string) {
    super(url);
    wsInstances.push(this);
  }
};

// Also set the static constants on the global WebSocket
(global as unknown as Record<string, { OPEN: number; CONNECTING: number; CLOSING: number; CLOSED: number }>).WebSocket.OPEN = 1;
(global as unknown as Record<string, { OPEN: number; CONNECTING: number; CLOSING: number; CLOSED: number }>).WebSocket.CONNECTING = 0;
(global as unknown as Record<string, { OPEN: number; CONNECTING: number; CLOSING: number; CLOSED: number }>).WebSocket.CLOSING = 2;
(global as unknown as Record<string, { OPEN: number; CONNECTING: number; CLOSING: number; CLOSED: number }>).WebSocket.CLOSED = 3;

describe('ChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    wsInstances = [];
    // Disconnect any existing connection
    chatService.disconnect();
  });

  afterEach(() => {
    jest.useRealTimers();
    chatService.disconnect();
  });

  describe('connect', () => {
    it('establishes WebSocket connection with token (Req 7.4)', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);
      chatService.connect('test-token');

      expect(wsInstances).toHaveLength(1);
      expect(wsInstances[0].url).toContain('token=test-token');
      expect(mockCallbacks.onConnectionStatusChange).toHaveBeenCalledWith('connecting');
    });

    it('notifies connected status when WebSocket opens', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);
      chatService.connect('test-token');

      // Simulate connection open
      jest.runAllTimers();

      expect(mockCallbacks.onConnectionStatusChange).toHaveBeenCalledWith('connected');
    });

    it('does not create duplicate connection if already open', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);
      chatService.connect('test-token');
      jest.runAllTimers(); // Open connection

      chatService.connect('test-token');

      // Should still only have 1 WebSocket instance
      expect(wsInstances).toHaveLength(1);
    });
  });

  describe('disconnect', () => {
    it('closes WebSocket and updates status', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);
      chatService.connect('test-token');
      jest.runAllTimers();

      chatService.disconnect();

      expect(mockCallbacks.onConnectionStatusChange).toHaveBeenCalledWith('disconnected');
    });

    it('does not trigger reconnect after manual disconnect', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);
      chatService.connect('test-token');
      jest.runAllTimers();

      chatService.disconnect();

      // Advance timers - should not reconnect
      jest.advanceTimersByTime(60000);

      // Only 1 WebSocket instance should exist (the initial one)
      expect(wsInstances).toHaveLength(1);
    });
  });

  describe('sendTextMessage', () => {
    it('sends text message through WebSocket (Req 7.2)', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);
      chatService.connect('test-token');
      jest.runAllTimers();

      chatService.sendTextMessage('session-1', 'Hello!', 'local-1');

      const sent = JSON.parse(wsInstances[0].sentMessages[0]);
      expect(sent).toEqual({
        type: 'text',
        sessionId: 'session-1',
        content: 'Hello!',
        localId: 'local-1',
      });
    });

    it('calls onMessageError when not connected', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);

      // Don't connect - try to send
      chatService.sendTextMessage('session-1', 'Hello!', 'local-1');

      expect(mockCallbacks.onMessageError).toHaveBeenCalledWith(
        'local-1',
        '网络连接已断开，请稍后重试'
      );
    });
  });

  describe('sendImageMessage', () => {
    it('sends image message through WebSocket (Req 7.3)', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);
      chatService.connect('test-token');
      jest.runAllTimers();

      chatService.sendImageMessage('session-1', 'https://img.example.com/photo.jpg', 'local-2');

      const sent = JSON.parse(wsInstances[0].sentMessages[0]);
      expect(sent).toEqual({
        type: 'image',
        sessionId: 'session-1',
        content: '',
        imageUrl: 'https://img.example.com/photo.jpg',
        localId: 'local-2',
      });
    });
  });

  describe('message handling', () => {
    it('dispatches incoming messages to callback (Req 7.4)', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);
      chatService.connect('test-token');
      jest.runAllTimers();

      const incomingMessage = {
        id: 'msg-1',
        sessionId: 'session-1',
        senderId: 'user-2',
        content: 'Hi there!',
        type: 'text',
        timestamp: '2025-01-15T10:00:00Z',
        status: 'delivered',
      };

      wsInstances[0].simulateMessage({
        type: 'message',
        message: incomingMessage,
      });

      expect(mockCallbacks.onMessage).toHaveBeenCalledWith(incomingMessage);
    });

    it('dispatches message ack to callback', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);
      chatService.connect('test-token');
      jest.runAllTimers();

      wsInstances[0].simulateMessage({
        type: 'ack',
        localId: 'local-1',
        messageId: 'server-msg-1',
      });

      expect(mockCallbacks.onMessageAck).toHaveBeenCalledWith('local-1', 'server-msg-1');
    });

    it('dispatches message error to callback (Req 7.8)', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);
      chatService.connect('test-token');
      jest.runAllTimers();

      wsInstances[0].simulateMessage({
        type: 'error',
        localId: 'local-1',
        error: 'Message too long',
      });

      expect(mockCallbacks.onMessageError).toHaveBeenCalledWith('local-1', 'Message too long');
    });

    it('ignores malformed messages gracefully', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);
      chatService.connect('test-token');
      jest.runAllTimers();

      // Simulate a malformed message (non-JSON)
      if (wsInstances[0].onmessage) {
        wsInstances[0].onmessage({ data: 'not-json' } as MessageEvent);
      }

      expect(mockCallbacks.onMessage).not.toHaveBeenCalled();
      expect(mockCallbacks.onMessageAck).not.toHaveBeenCalled();
      expect(mockCallbacks.onMessageError).not.toHaveBeenCalled();
    });
  });

  describe('auto-reconnect', () => {
    it('attempts reconnect with exponential backoff on unexpected close (Req 7.6)', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);
      chatService.connect('test-token');
      jest.runAllTimers(); // Open connection

      // Simulate unexpected close
      wsInstances[0].simulateClose();

      expect(mockCallbacks.onConnectionStatusChange).toHaveBeenCalledWith('reconnecting');

      // First reconnect after 3s (base delay)
      jest.advanceTimersByTime(3000);
      expect(wsInstances).toHaveLength(2);
    });

    it('uses exponential backoff delays: 3s, 6s, 12s, 24s, 48s (Req 7.6)', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);
      chatService.connect('test-token');
      jest.runAllTimers(); // Open connection

      // First close
      wsInstances[0].simulateClose();
      jest.advanceTimersByTime(3000); // 3s - first attempt
      expect(wsInstances).toHaveLength(2);

      // Second close
      wsInstances[1].simulateClose();
      jest.advanceTimersByTime(5999); // Not yet 6s
      expect(wsInstances).toHaveLength(2);
      jest.advanceTimersByTime(1); // Now 6s
      expect(wsInstances).toHaveLength(3);
    });

    it('stops reconnecting after max 5 attempts (Req 7.6)', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);
      chatService.connect('test-token');
      jest.runAllTimers(); // Open initial connection

      // Disable auto-open to simulate failed reconnection attempts
      MockWebSocket.autoOpen = false;

      // Close the initial connection - triggers first reconnect timer
      wsInstances[wsInstances.length - 1].simulateClose();

      // Simulate 5 failed reconnection attempts
      for (let i = 0; i < 5; i++) {
        // Advance timer to trigger the reconnect attempt
        jest.advanceTimersByTime(3000 * Math.pow(2, i));
        // The new WS was created but never opens, simulate it closing (connection failed)
        wsInstances[wsInstances.length - 1].simulateClose();
      }

      // After 5 failed attempts, no more reconnects should happen
      const countBefore = wsInstances.length;
      jest.advanceTimersByTime(200000);

      expect(wsInstances).toHaveLength(countBefore);
      expect(mockCallbacks.onConnectionStatusChange).toHaveBeenLastCalledWith('disconnected');

      // Restore auto-open for other tests
      MockWebSocket.autoOpen = true;
    });

    it('resets reconnect counter on successful connection', () => {
      const mockCallbacks = {
        onMessage: jest.fn(),
        onMessageAck: jest.fn(),
        onMessageError: jest.fn(),
        onConnectionStatusChange: jest.fn(),
      };
      chatService.setCallbacks(mockCallbacks);
      chatService.connect('test-token');
      jest.runAllTimers(); // Open connection

      // Simulate close and reconnect
      wsInstances[0].simulateClose();
      jest.advanceTimersByTime(3000);
      jest.runAllTimers(); // Open new connection

      // After successful reconnect, counter should be reset
      // So next close should use base delay (3s) again
      wsInstances[1].simulateClose();
      jest.advanceTimersByTime(3000);
      expect(wsInstances).toHaveLength(3);
    });
  });

  describe('REST API methods', () => {
    it('fetches sessions via REST API (Req 7.9)', async () => {
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
            unreadCount: 2,
          },
        ],
      };
      mockApiClient.get.mockResolvedValue({ data: mockSessions });

      const result = await chatService.fetchSessions();

      expect(mockApiClient.get).toHaveBeenCalledWith('/chat/sessions');
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].taskTitle).toBe('Deliver package');
    });

    it('fetches messages with pagination (Req 7.5)', async () => {
      const mockMessages = {
        messages: [
          {
            id: 'msg-1',
            sessionId: 'session-1',
            senderId: 'user-1',
            content: 'Hello',
            type: 'text',
            timestamp: '2025-01-15T10:00:00Z',
            status: 'delivered',
          },
        ],
        page: 1,
        totalPages: 3,
      };
      mockApiClient.get.mockResolvedValue({ data: mockMessages });

      const result = await chatService.fetchMessages('session-1', 1);

      expect(mockApiClient.get).toHaveBeenCalledWith('/chat/sessions/session-1/messages', {
        params: { page: 1, pageSize: 20 },
      });
      expect(result.messages).toHaveLength(1);
      expect(result.totalPages).toBe(3);
    });

    it('sends message via REST API fallback', async () => {
      const mockMessage = {
        id: 'msg-new',
        sessionId: 'session-1',
        senderId: 'user-1',
        content: 'Hello via API',
        type: 'text',
        timestamp: '2025-01-15T10:00:00Z',
        status: 'sent',
      };
      mockApiClient.post.mockResolvedValue({ data: mockMessage });

      const result = await chatService.sendMessageViaApi(
        'session-1',
        'Hello via API',
        'text'
      );

      expect(mockApiClient.post).toHaveBeenCalledWith('/chat/sessions/session-1/messages', {
        content: 'Hello via API',
        type: 'text',
        imageUrl: undefined,
      });
      expect(result.id).toBe('msg-new');
    });
  });
});
