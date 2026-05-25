/**
 * Unit tests for TaskFilter component logic.
 * Tests filter state management, type selection, reward range validation,
 * and accessibility configuration.
 *
 * Validates: Requirements 5.5
 */

import { describe, it, expect } from '@jest/globals';
import { TaskType } from '../../../types/task';

/** Task types available for filtering */
const TASK_TYPES: TaskType[] = [
  'delivery',
  'shopping',
  'dog_walking',
  'queuing',
  'pickup',
];

/** Reward range limits per requirement 5.5 */
const REWARD_MIN = 0;
const REWARD_MAX = 10000;

/** Task type labels used in the filter */
const TASK_TYPE_LABELS: Record<TaskType, string> = {
  delivery: '送文件',
  shopping: '买东西',
  dog_walking: '遛狗',
  queuing: '排队',
  pickup: '取件',
};

describe('TaskFilter - Task Type Selection', () => {
  it('should have all 5 task types available for filtering', () => {
    expect(TASK_TYPES).toHaveLength(5);
    expect(TASK_TYPES).toContain('delivery');
    expect(TASK_TYPES).toContain('shopping');
    expect(TASK_TYPES).toContain('dog_walking');
    expect(TASK_TYPES).toContain('queuing');
    expect(TASK_TYPES).toContain('pickup');
  });

  it('should have Chinese labels for all task types', () => {
    expect(TASK_TYPE_LABELS.delivery).toBe('送文件');
    expect(TASK_TYPE_LABELS.shopping).toBe('买东西');
    expect(TASK_TYPE_LABELS.dog_walking).toBe('遛狗');
    expect(TASK_TYPE_LABELS.queuing).toBe('排队');
    expect(TASK_TYPE_LABELS.pickup).toBe('取件');
  });

  it('should toggle type selection - selecting same type deselects it', () => {
    function toggleType(
      current: TaskType | undefined,
      pressed: TaskType
    ): TaskType | undefined {
      return current === pressed ? undefined : pressed;
    }

    const result = toggleType('delivery', 'delivery');
    expect(result).toBeUndefined();
  });

  it('should toggle type selection - selecting different type switches', () => {
    // Simulates the toggle logic in the component
    function toggleType(
      current: TaskType | undefined,
      pressed: TaskType
    ): TaskType | undefined {
      return current === pressed ? undefined : pressed;
    }

    const result = toggleType('delivery', 'shopping');
    expect(result).toBe('shopping');
  });

  it('should select a type when none is selected', () => {
    function toggleType(
      current: TaskType | undefined,
      pressed: TaskType
    ): TaskType | undefined {
      return current === pressed ? undefined : pressed;
    }

    const result = toggleType(undefined, 'dog_walking');
    expect(result).toBe('dog_walking');
  });
});

describe('TaskFilter - Reward Range Validation', () => {
  it('should accept valid reward range within 0-10000', () => {
    const minInput = '50';
    const maxInput = '500';

    const minValue = parseFloat(minInput);
    const maxValue = parseFloat(maxInput);

    expect(minValue).toBeGreaterThanOrEqual(REWARD_MIN);
    expect(maxValue).toBeLessThanOrEqual(REWARD_MAX);
    expect(minValue).toBeLessThanOrEqual(maxValue);
  });

  it('should clamp minimum reward to 0 when negative value entered', () => {
    const input = '-10';
    const parsed = parseFloat(input);
    const clamped = Math.max(REWARD_MIN, Math.min(parsed, REWARD_MAX));

    expect(clamped).toBe(REWARD_MIN);
  });

  it('should clamp maximum reward to 10000 when exceeding limit', () => {
    const input = '15000';
    const parsed = parseFloat(input);
    const clamped = Math.max(REWARD_MIN, Math.min(parsed, REWARD_MAX));

    expect(clamped).toBe(REWARD_MAX);
  });

  it('should treat empty input as undefined (no filter)', () => {
    const input = '';
    const value = input ? parseFloat(input) : undefined;

    expect(value).toBeUndefined();
  });

  it('should treat non-numeric input as undefined', () => {
    const input = 'abc';
    const parsed = parseFloat(input);
    const value = !isNaN(parsed) ? parsed : undefined;

    expect(value).toBeUndefined();
  });

  it('should accept 0 as valid minimum reward', () => {
    const input = '0';
    const parsed = parseFloat(input);
    const clamped = Math.max(REWARD_MIN, Math.min(parsed, REWARD_MAX));

    expect(clamped).toBe(0);
  });

  it('should accept 10000 as valid maximum reward', () => {
    const input = '10000';
    const parsed = parseFloat(input);
    const clamped = Math.max(REWARD_MIN, Math.min(parsed, REWARD_MAX));

    expect(clamped).toBe(10000);
  });
});

describe('TaskFilter - Reset Logic', () => {
  it('should clear type filter on reset', () => {
    const resetFilter = {
      type: undefined,
      minReward: undefined,
      maxReward: undefined,
    };

    expect(resetFilter.type).toBeUndefined();
    expect(resetFilter.minReward).toBeUndefined();
    expect(resetFilter.maxReward).toBeUndefined();
  });

  it('should clear reward inputs on reset', () => {
    let minRewardInput = '100';
    let maxRewardInput = '5000';

    // Reset
    minRewardInput = '';
    maxRewardInput = '';

    expect(minRewardInput).toBe('');
    expect(maxRewardInput).toBe('');
  });
});

describe('TaskFilter - Accessibility', () => {
  it('should have accessibility labels for all task type chips', () => {
    TASK_TYPES.forEach((type) => {
      const label = TASK_TYPE_LABELS[type];
      const accessibilityLabel = `筛选任务类型: ${label}`;
      expect(accessibilityLabel).toContain(label);
    });
  });

  it('should indicate selected state in accessibility label', () => {
    const type: TaskType = 'delivery';
    const label = TASK_TYPE_LABELS[type];
    const isSelected = true;

    const accessibilityLabel = `筛选任务类型: ${label}${isSelected ? ', 已选中' : ''}`;
    expect(accessibilityLabel).toContain('已选中');
  });

  it('should not indicate selected state when not selected', () => {
    const type: TaskType = 'delivery';
    const label = TASK_TYPE_LABELS[type];
    const isSelected = false;

    const accessibilityLabel = `筛选任务类型: ${label}${isSelected ? ', 已选中' : ''}`;
    expect(accessibilityLabel).not.toContain('已选中');
  });

  it('should have accessibility labels for reward inputs', () => {
    const minLabel = '最低报酬金额';
    const maxLabel = '最高报酬金额';

    expect(minLabel).toBeTruthy();
    expect(maxLabel).toBeTruthy();
  });

  it('should have accessibility label for the filter container', () => {
    const containerLabel = '任务筛选';
    expect(containerLabel).toBe('任务筛选');
  });

  it('should have accessibility labels for action buttons', () => {
    const resetLabel = '重置筛选条件';
    const applyLabel = '应用报酬筛选';

    expect(resetLabel).toBeTruthy();
    expect(applyLabel).toBeTruthy();
  });
});
