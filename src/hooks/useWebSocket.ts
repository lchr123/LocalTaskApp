/**
 * useWebSocket Hook
 *
 * Encapsulates WebSocket lifecycle management for the chat module.
 * Handles connection setup, teardown, and bridges WebSocket events
 * to the chat store.
 *
 * Requirements covered:
 * - 7.4: Real-time message delivery via WebSocket
 * - 7.6: Auto-reconnect on network disconnect
 * - 7.8: Message status management
 */

import { useEffect, useRef, useCallback } from 'react';
import { chatService, ChatServiceCallbacks, ConnectionStatus } from '../services/chatService';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { ChatMessage } from '../types/chat';

/**
 * Hook return type
 */
interface UseWebSocketReturn {
  /** Current WebSocket connection status */
  connectionStatus: ConnectionStatus;
  /** Send a text message */
  sendTextMessage: (sessionId: string, content: string, localId: string) => void;
  /** Send an image message */
  sendImageMessage: (sessionId: string, imageUrl: string, localId: string) => void;
  /** Manually reconnect */
  reconnect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** Whether the WebSocket is currently connected */
  isConnected: boolean;
}

/**
 * useWebSocket
 *
 * Manages the WebSocket connection lifecycle for chat functionality.
 * Automatically connects when the user is authenticated and disconnects
 * on unmount or when the user logs out.
 *
 * Usage:
 * ```tsx
 * const { connectionStatus, sendTextMessage, isConnected } = useWebSocket();
 * ```
 */
export function useWebSocket(): UseWebSocketReturn {
  const connectionStatus = useChatStore((state) => state.connectionStatus);
  const setConnectionStatus = useChatStore((state) => state.setConnectionStatus);
  const handleIncomingMessage = useChatStore((state) => state.handleIncomingMessage);
  const handleMessageAck = useChatStore((state) => state.handleMessageAck);
  const handleMessageError = useChatStore((state) => state.handleMessageError);

  const tokens = useAuthStore((state) => state.tokens);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const isSetup = useRef(false);

  /**
   * Set up WebSocket callbacks and connect.
   * Only runs once when the user becomes authenticated.
   */
  useEffect(() => {
    if (!isAuthenticated || !tokens?.accessToken) {
      // Disconnect if user is no longer authenticated
      if (isSetup.current) {
        chatService.disconnect();
        isSetup.current = false;
      }
      return;
    }

    // Set up callbacks that bridge WebSocket events to the store
    const callbacks: ChatServiceCallbacks = {
      onMessage: (message: ChatMessage) => {
        handleIncomingMessage(message);
      },
      onMessageAck: (localId: string, messageId: string) => {
        handleMessageAck(localId, messageId);
      },
      onMessageError: (localId: string, error: string) => {
        handleMessageError(localId, error);
      },
      onConnectionStatusChange: (status: ConnectionStatus) => {
        setConnectionStatus(status);
      },
    };

    chatService.setCallbacks(callbacks);
    chatService.connect(tokens.accessToken);
    isSetup.current = true;

    // Cleanup on unmount
    return () => {
      chatService.disconnect();
      isSetup.current = false;
    };
  }, [
    isAuthenticated,
    tokens?.accessToken,
    handleIncomingMessage,
    handleMessageAck,
    handleMessageError,
    setConnectionStatus,
  ]);

  /**
   * Send a text message via WebSocket.
   */
  const sendTextMessage = useCallback(
    (sessionId: string, content: string, localId: string) => {
      chatService.sendTextMessage(sessionId, content, localId);
    },
    []
  );

  /**
   * Send an image message via WebSocket.
   */
  const sendImageMessage = useCallback(
    (sessionId: string, imageUrl: string, localId: string) => {
      chatService.sendImageMessage(sessionId, imageUrl, localId);
    },
    []
  );

  /**
   * Manually trigger a reconnection attempt.
   */
  const reconnect = useCallback(() => {
    if (tokens?.accessToken) {
      chatService.connect(tokens.accessToken);
    }
  }, [tokens?.accessToken]);

  /**
   * Manually disconnect the WebSocket.
   */
  const disconnect = useCallback(() => {
    chatService.disconnect();
  }, []);

  return {
    connectionStatus,
    sendTextMessage,
    sendImageMessage,
    reconnect,
    disconnect,
    isConnected: connectionStatus === 'connected',
  };
}
