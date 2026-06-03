/**
 * Chat Service
 *
 * Handles WebSocket real-time messaging and chat-related REST API calls.
 * Implements auto-reconnect with exponential backoff.
 *
 * Requirements covered:
 * - 7.4: New messages displayed within 3 seconds via WebSocket
 * - 7.6: Auto-reconnect on network disconnect (max 5 attempts, exponential backoff from 3s)
 * - 7.8: Failed messages show retry option
 */

import apiClient from './api';
import { ChatSession, ChatMessage } from '../types/chat';
import { API_ENDPOINTS, PAGINATION, TIMEOUTS } from '../utils/constants';
import { Platform } from 'react-native';

/**
 * WebSocket connection status
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * WebSocket message payload sent to server
 */
interface WsSendPayload {
  type: 'text' | 'image';
  sessionId: string;
  content: string;
  imageUrl?: string;
  localId: string;
}

/**
 * WebSocket message received from server
 */
interface WsReceivePayload {
  type: 'message' | 'ack' | 'error';
  message?: ChatMessage;
  localId?: string;
  messageId?: string;
  error?: string;
}

/**
 * Callback interface for WebSocket events
 */
export interface ChatServiceCallbacks {
  onMessage: (message: ChatMessage) => void;
  onMessageAck: (localId: string, messageId: string) => void;
  onMessageError: (localId: string, error: string) => void;
  onConnectionStatusChange: (status: ConnectionStatus) => void;
}

/**
 * Response shape for paginated message list
 */
export interface MessageListResponse {
  messages: ChatMessage[];
  page: number;
  totalPages: number;
}

/**
 * Response shape for session list
 */
export interface SessionListResponse {
  sessions: ChatSession[];
}

class ChatService {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = TIMEOUTS.WEBSOCKET_MAX_RECONNECT_ATTEMPTS;
  private reconnectBaseDelay: number = TIMEOUTS.WEBSOCKET_RECONNECT_BASE;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: ChatServiceCallbacks | null = null;
  private token: string | null = null;
  private isManualDisconnect: boolean = false;

  /**
   * Register callbacks for WebSocket events.
   * Must be called before connect().
   */
  setCallbacks(callbacks: ChatServiceCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Establish WebSocket connection to the chat server.
   *
   * Requirement 7.4: Real-time message delivery via WebSocket.
   *
   * @param token - Auth token for WebSocket authentication
   */
  connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.token = token;
    this.isManualDisconnect = false;
    this.callbacks?.onConnectionStatusChange('connecting');

    const wsBaseUrl = API_ENDPOINTS.CHAT_WS;
    // Construct full WebSocket URL from the API base URL
    const wsProtocol = __DEV__ ? 'ws' : 'wss';
    const wsHost = __DEV__
      ? (Platform.OS === 'android' ? '10.0.2.2' : 'localhost') + ':3000'
      : 'locallyhelper.com/api';
    const baseUrl = `${wsProtocol}://${wsHost}`;
    const wsUrl = `${baseUrl}${wsBaseUrl}?token=${encodeURIComponent(token)}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = this.handleOpen.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
  }

  /**
   * Disconnect WebSocket connection manually.
   * Will not trigger auto-reconnect.
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }

    this.callbacks?.onConnectionStatusChange('disconnected');
  }

  /**
   * Send a text message via WebSocket.
   *
   * Requirement 7.2: Support text messages up to 1000 characters.
   *
   * @param sessionId - Chat session ID
   * @param content - Message text content
   * @param localId - Local temporary ID for optimistic UI
   */
  sendTextMessage(sessionId: string, content: string, localId: string): void {
    const payload: WsSendPayload = {
      type: 'text',
      sessionId,
      content,
      localId,
    };
    this.send(payload);
  }

  /**
   * Send an image message via WebSocket.
   *
   * Requirement 7.3: Support JPEG/PNG images up to 10MB.
   *
   * @param sessionId - Chat session ID
   * @param imageUrl - URL of the uploaded image
   * @param localId - Local temporary ID for optimistic UI
   */
  sendImageMessage(sessionId: string, imageUrl: string, localId: string): void {
    const payload: WsSendPayload = {
      type: 'image',
      sessionId,
      content: '',
      imageUrl,
      localId,
    };
    this.send(payload);
  }

  /**
   * Fetch chat session list via REST API.
   *
   * Requirement 7.9: Sessions organized by task.
   */
  async fetchSessions(): Promise<SessionListResponse> {
    const response = await apiClient.get<SessionListResponse>(
      API_ENDPOINTS.CHAT_SESSIONS
    );
    return response.data;
  }

  /**
   * Fetch message history for a session via REST API.
   *
   * Requirement 7.5: Load history in reverse chronological order, 20 per page.
   */
  async fetchMessages(sessionId: string, page: number = 1): Promise<MessageListResponse> {
    const response = await apiClient.get<MessageListResponse>(
      API_ENDPOINTS.CHAT_MESSAGES(sessionId),
      { params: { page, pageSize: PAGINATION.CHAT_MESSAGE_PAGE_SIZE } }
    );
    return response.data;
  }

  /**
   * Send a message via REST API (fallback when WebSocket is unavailable).
   */
  async sendMessageViaApi(
    sessionId: string,
    content: string,
    type: 'text' | 'image',
    imageUrl?: string
  ): Promise<ChatMessage> {
    const response = await apiClient.post<ChatMessage>(
      API_ENDPOINTS.CHAT_MESSAGES(sessionId),
      { content, type, imageUrl }
    );
    return response.data;
  }

  /**
   * Get current connection status.
   */
  getConnectionStatus(): ConnectionStatus {
    if (!this.ws) return 'disconnected';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      default:
        return 'disconnected';
    }
  }

  /**
   * Check if WebSocket is currently connected.
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // --- Private methods ---

  /**
   * Send a payload through the WebSocket connection.
   */
  private send(payload: WsSendPayload): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      // If not connected, notify error for this message
      this.callbacks?.onMessageError(
        payload.localId,
        '网络连接已断开，请稍后重试'
      );
    }
  }

  /**
   * Handle WebSocket connection opened.
   */
  private handleOpen(): void {
    this.reconnectAttempts = 0;
    this.callbacks?.onConnectionStatusChange('connected');
  }

  /**
   * Handle incoming WebSocket message.
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data: WsReceivePayload = JSON.parse(event.data as string);

      switch (data.type) {
        case 'message':
          if (data.message) {
            this.callbacks?.onMessage(data.message);
          }
          break;
        case 'ack':
          if (data.localId && data.messageId) {
            this.callbacks?.onMessageAck(data.localId, data.messageId);
          }
          break;
        case 'error':
          if (data.localId && data.error) {
            this.callbacks?.onMessageError(data.localId, data.error);
          }
          break;
      }
    } catch {
      // Ignore malformed messages
    }
  }

  /**
   * Handle WebSocket connection closed.
   * Triggers auto-reconnect if not manually disconnected.
   *
   * Requirement 7.6: Auto-reconnect within 30 seconds of network recovery.
   */
  private handleClose(): void {
    this.ws = null;

    if (this.isManualDisconnect) {
      this.callbacks?.onConnectionStatusChange('disconnected');
      return;
    }

    this.attemptReconnect();
  }

  /**
   * Handle WebSocket error.
   */
  private handleError(): void {
    // The close event will follow, which triggers reconnect
  }

  /**
   * Attempt to reconnect with exponential backoff.
   *
   * Requirement 7.6: Auto-reconnect with exponential backoff,
   * max 5 attempts, starting at 3 seconds.
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.callbacks?.onConnectionStatusChange('disconnected');
      return;
    }

    this.callbacks?.onConnectionStatusChange('reconnecting');

    // Exponential backoff: 3s, 6s, 12s, 24s, 48s
    const delay = this.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      if (this.token && !this.isManualDisconnect) {
        this.connect(this.token);
      }
    }, delay);
  }

  /**
   * Clear any pending reconnect timer.
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const chatService = new ChatService();
