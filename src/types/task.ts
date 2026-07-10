/**
 * The 'type' field's meaning depends on `kind`:
 * - kind='task': employment length — 'full_time' | 'part_time' | 'one_time'
 * - kind='marketplace': item category — see ITEM_CATEGORY_LABELS in constants.ts
 * Kept as a plain string (not a union) so both domains' values type-check;
 * each domain's own UI (dropdown options) is the source of truth for valid values.
 */
export type TaskType = string;
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
/**
 * Which domain this record belongs to. Both domains share the same screens,
 * store, and API — kind is a discriminator, not a separate feature.
 * 'task' = 周边任务/工作, 'marketplace' = 二手市场.
 */
export type TaskKind = 'task' | 'marketplace';
export type RewardUnit = 'once' | 'hour' | 'day' | 'month';
export type DurationUnit = 'once' | 'day' | 'week' | 'month';

export interface TaskTag {
  id: string;
  name: string;
  label_zh: string;
  category: string | null;
}

export interface Task {
  id: string;
  posterId: string;
  posterNickname: string;
  posterRating: number;
  kind: TaskKind;
  type: TaskType;
  description: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  reward: number;
  rewardUnit?: RewardUnit | null;
  deadline: string;
  status: TaskStatus;
  intentCount: number;
  selectedHelperId?: string;
  createdAt: string;
  updatedAt?: string;
  hasReview?: boolean;
  distance?: number;
  images?: string[];
  headcount?: number;
  startTime?: string | null;
  contactMethod?: string | null;
  durationHours?: number | null;
  durationUnit?: DurationUnit | null;
  posterMemo?: string | null;
  tags?: TaskTag[];
}

export interface Intent {
  id: string;
  taskId: string;
  helperId: string;
  helperNickname: string;
  helperRating: number;
  helperCompletedCount: number;
  message?: string;
  status: 'pending' | 'selected' | 'rejected' | 'withdrawn';
  createdAt: string;
}

export interface CreateTaskPayload {
  kind: TaskKind;
  type: TaskType;
  description: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  reward: number;
  deadline: string;
  rewardUnit?: RewardUnit | null;
  images?: string[];
  headcount?: number;
  startTime?: string | null;
  contactMethod?: string | null;
  durationHours?: number | null;
  durationUnit?: DurationUnit | null;
  tagIds?: string[];
}

export interface TaskFilter {
  type?: string;  // comma-separated types for multi-select filter
  minReward?: number;
  maxReward?: number;
  radius?: number;
  sort?: 'distance' | 'reward' | 'newest' | 'deadline';
  tags?: string;  // comma-separated tag ids
}
