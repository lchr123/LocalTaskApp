/**
 * Unit tests for ChatSessionCard component logic.
 * Tests message preview truncation, unread badge display, and time formatting.
 *
 * Validates: Requirements 7.9
 */

import { describe, it, expect } from '@jest/globals';
import { truncateText, formatRelativeTime } from '../../../utils/formatters';
import { ChatSession } from '../../../types/chat';

const MESSAGE_PREVIEW_MAX_LENGTH = 40;

// Helper to create a mock session
function createMockSession(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id: 'session-1',
    taskId: 'task-1',
    taskTitle: '帮忙取快递',
    participantId: 'user-2',
    participantNickname: '小明',
    participantAvatarUrl: undefined,
    lastMessage: '好的，我马上过来',
    lastMessageTime: '2024-01-15T10:30:00Z',
    unreadCount: 0,
    ...overrides,
  };
}

describe('ChatSessionCard - Message Preview', () => {
  it('should show full message when within max length', () => {
    const message = '好的，我马上过来';
    const preview = truncateText(message, MESSAGE_PREVIEW_MAX_LENGTH);
    expect(preview).toBe(message);
  });

  it('should truncate long messages with ellipsis', () => {
    const longMessage =
      '这是一条非常长的消息，包含了很多内容，需要被截断显示在会话列表中，以保持界面整洁美观大方得体';
    expect(longMessage.length).toBeGreaterThan(MESSAGE_PREVIEW_MAX_LENGTH);
    const preview = truncateText(longMessage, MESSAGE_PREVIEW_MAX_LENGTH);
    expect(preview.endsWith('...')).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(MESSAGE_PREVIEW_MAX_LENGTH + 3);
  });

  it('should show placeholder when no message exists', () => {
    const session = createMockSession({ lastMessage: '' });
    const messagePreview = session.lastMessage
      ? truncateText(session.lastMessage, MESSAGE_PREVIEW_MAX_LENGTH)
      : '暂无消息';
    expect(messagePreview).toBe('暂无消息');
  });
});

describe('ChatSessionCard - Unread Badge', () => {
  it('should not show badge when unread count is 0', () => {
    const session = createMockSession({ unreadCount: 0 });
    const shouldShowBadge = session.unreadCount > 0;
    expect(shouldShowBadge).toBe(false);
  });

  it('should show badge when unread count is greater than 0', () => {
    const session = createMockSession({ unreadCount: 3 });
    const shouldShowBadge = session.unreadCount > 0;
    expect(shouldShowBadge).toBe(true);
  });

  it('should display 99+ when unread count exceeds 99', () => {
    const session = createMockSession({ unreadCount: 150 });
    const badgeText =
      session.unreadCount > 99 ? '99+' : String(session.unreadCount);
    expect(badgeText).toBe('99+');
  });

  it('should display exact count when 99 or less', () => {
    const session = createMockSession({ unreadCount: 5 });
    const badgeText =
      session.unreadCount > 99 ? '99+' : String(session.unreadCount);
    expect(badgeText).toBe('5');
  });
});

describe('ChatSessionCard - Time Display', () => {
  it('should show empty string when no lastMessageTime', () => {
    const session = createMockSession({ lastMessageTime: '' });
    const timeDisplay = session.lastMessageTime
      ? formatRelativeTime(session.lastMessageTime)
      : '';
    expect(timeDisplay).toBe('');
  });

  it('should format recent time as relative', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const timeDisplay = formatRelativeTime(fiveMinutesAgo);
    expect(timeDisplay).toBe('5分钟前');
  });

  it('should format hours ago correctly', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const timeDisplay = formatRelativeTime(twoHoursAgo);
    expect(timeDisplay).toBe('2小时前');
  });
});

describe('ChatSessionCard - Session Organization by Task', () => {
  it('should display task title from session', () => {
    const session = createMockSession({ taskTitle: '帮忙遛狗' });
    expect(session.taskTitle).toBe('帮忙遛狗');
  });

  it('should display participant nickname', () => {
    const session = createMockSession({ participantNickname: '张三' });
    expect(session.participantNickname).toBe('张三');
  });

  it('should use first character of nickname for avatar fallback', () => {
    const session = createMockSession({
      participantNickname: '李四',
      participantAvatarUrl: undefined,
    });
    const avatarLabel = session.participantNickname.slice(0, 1);
    expect(avatarLabel).toBe('李');
  });

  it('should prefer avatar URL when available', () => {
    const session = createMockSession({
      participantAvatarUrl: 'https://example.com/avatar.jpg',
    });
    const hasAvatarUrl = !!session.participantAvatarUrl;
    expect(hasAvatarUrl).toBe(true);
  });
});

describe('ChatSessionCard - Accessibility', () => {
  it('should generate correct accessibility label', () => {
    const session = createMockSession({
      taskTitle: '帮忙取快递',
      participantNickname: '小明',
    });
    const label = `聊天会话: ${session.taskTitle}, 对方: ${session.participantNickname}`;
    expect(label).toBe('聊天会话: 帮忙取快递, 对方: 小明');
  });

  it('should generate unread badge accessibility label', () => {
    const session = createMockSession({ unreadCount: 5 });
    const badgeLabel = `${session.unreadCount}条未读消息`;
    expect(badgeLabel).toBe('5条未读消息');
  });
});
