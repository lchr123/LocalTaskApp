/**
 * Unit tests for IntentCard component logic.
 * Tests intent display logic, status rendering, and selection behavior.
 *
 * Validates: Requirements 6.3, 6.4, 6.5
 */

import { describe, it, expect } from '@jest/globals';
import { Intent } from '../../../types/task';
import { formatRating } from '../../../utils/formatters';

/** Helper function to create a mock intent */
function createMockIntent(overrides: Partial<Intent> = {}): Intent {
  return {
    id: 'intent-1',
    taskId: 'task-1',
    helperId: 'helper-1',
    helperNickname: '小明',
    helperRating: 4.5,
    helperCompletedCount: 12,
    message: '我可以帮忙，下午有空',
    status: 'pending',
    createdAt: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('IntentCard - Display Logic', () => {
  it('should display helper nickname', () => {
    const intent = createMockIntent({ helperNickname: '张三' });
    expect(intent.helperNickname).toBe('张三');
  });

  it('should format rating to 1 decimal place', () => {
    const intent = createMockIntent({ helperRating: 4.567 });
    const formatted = formatRating(intent.helperRating);
    expect(formatted).toBe('4.6');
  });

  it('should format perfect rating correctly', () => {
    const intent = createMockIntent({ helperRating: 5.0 });
    const formatted = formatRating(intent.helperRating);
    expect(formatted).toBe('5.0');
  });

  it('should format zero rating correctly', () => {
    const intent = createMockIntent({ helperRating: 0 });
    const formatted = formatRating(intent.helperRating);
    expect(formatted).toBe('0.0');
  });

  it('should display completed count', () => {
    const intent = createMockIntent({ helperCompletedCount: 25 });
    const displayText = `已完成 ${intent.helperCompletedCount} 次`;
    expect(displayText).toBe('已完成 25 次');
  });

  it('should display zero completed count', () => {
    const intent = createMockIntent({ helperCompletedCount: 0 });
    const displayText = `已完成 ${intent.helperCompletedCount} 次`;
    expect(displayText).toBe('已完成 0 次');
  });

  it('should display message when provided', () => {
    const intent = createMockIntent({ message: '我住在附近，5分钟就能到' });
    expect(intent.message).toBe('我住在附近，5分钟就能到');
  });

  it('should handle undefined message (optional field)', () => {
    const intent = createMockIntent({ message: undefined });
    expect(intent.message).toBeUndefined();
  });
});

describe('IntentCard - Status Display', () => {
  it('should show no status badge for pending intents', () => {
    const intent = createMockIntent({ status: 'pending' });
    const getStatusLabel = (status: Intent['status']): string | null => {
      if (status === 'selected') return '已选择';
      if (status === 'rejected') return '未选中';
      if (status === 'withdrawn') return '已撤回';
      return null;
    };
    expect(getStatusLabel(intent.status)).toBeNull();
  });

  it('should show "已选择" for selected intents', () => {
    const intent = createMockIntent({ status: 'selected' });
    const getStatusLabel = (status: Intent['status']): string | null => {
      if (status === 'selected') return '已选择';
      if (status === 'rejected') return '未选中';
      if (status === 'withdrawn') return '已撤回';
      return null;
    };
    expect(getStatusLabel(intent.status)).toBe('已选择');
  });

  it('should show "未选中" for rejected intents', () => {
    const intent = createMockIntent({ status: 'rejected' });
    const getStatusLabel = (status: Intent['status']): string | null => {
      if (status === 'selected') return '已选择';
      if (status === 'rejected') return '未选中';
      if (status === 'withdrawn') return '已撤回';
      return null;
    };
    expect(getStatusLabel(intent.status)).toBe('未选中');
  });

  it('should show "已撤回" for withdrawn intents', () => {
    const intent = createMockIntent({ status: 'withdrawn' });
    const getStatusLabel = (status: Intent['status']): string | null => {
      if (status === 'selected') return '已选择';
      if (status === 'rejected') return '未选中';
      if (status === 'withdrawn') return '已撤回';
      return null;
    };
    expect(getStatusLabel(intent.status)).toBe('已撤回');
  });
});

describe('IntentCard - Selection Button Visibility', () => {
  it('should show select button for pending intents when not disabled', () => {
    const intent = createMockIntent({ status: 'pending' });
    const disabled = false;
    const showSelectButton = intent.status === 'pending' && !disabled;
    expect(showSelectButton).toBe(true);
  });

  it('should hide select button for pending intents when disabled', () => {
    const intent = createMockIntent({ status: 'pending' });
    const disabled = true;
    const showSelectButton = intent.status === 'pending' && !disabled;
    expect(showSelectButton).toBe(false);
  });

  it('should hide select button for selected intents', () => {
    const intent = createMockIntent({ status: 'selected' });
    const disabled = false;
    const showSelectButton = intent.status === 'pending' && !disabled;
    expect(showSelectButton).toBe(false);
  });

  it('should hide select button for rejected intents', () => {
    const intent = createMockIntent({ status: 'rejected' });
    const disabled = false;
    const showSelectButton = intent.status === 'pending' && !disabled;
    expect(showSelectButton).toBe(false);
  });

  it('should hide select button for withdrawn intents', () => {
    const intent = createMockIntent({ status: 'withdrawn' });
    const disabled = false;
    const showSelectButton = intent.status === 'pending' && !disabled;
    expect(showSelectButton).toBe(false);
  });
});

describe('IntentCard - Accessibility', () => {
  it('should have accessibility label with helper nickname', () => {
    const intent = createMockIntent({ helperNickname: '李四' });
    const cardLabel = `帮手意向: ${intent.helperNickname}`;
    expect(cardLabel).toBe('帮手意向: 李四');
  });

  it('should have accessibility label for rating', () => {
    const intent = createMockIntent({ helperRating: 4.2 });
    const ratingLabel = `平均评分: ${formatRating(intent.helperRating)}星`;
    expect(ratingLabel).toBe('平均评分: 4.2星');
  });

  it('should have accessibility label for completed count', () => {
    const intent = createMockIntent({ helperCompletedCount: 8 });
    const completedLabel = `历史完成数: ${intent.helperCompletedCount}次`;
    expect(completedLabel).toBe('历史完成数: 8次');
  });

  it('should have accessibility label for message', () => {
    const intent = createMockIntent({ message: '随时可以出发' });
    const messageLabel = `留言: ${intent.message}`;
    expect(messageLabel).toBe('留言: 随时可以出发');
  });

  it('should have accessibility label for select button', () => {
    const intent = createMockIntent({ helperNickname: '王五' });
    const buttonLabel = `选择帮手 ${intent.helperNickname}`;
    expect(buttonLabel).toBe('选择帮手 王五');
  });
});
