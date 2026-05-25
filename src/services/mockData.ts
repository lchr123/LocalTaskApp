/**
 * Mock Data for Development Mode
 *
 * Provides realistic fake data for all services when DEV_MOCK_AUTH is true.
 * This allows full UI flow testing without a backend.
 */

import { Task, Intent, TaskType } from '../types/task';
import { ChatSession, ChatMessage } from '../types/chat';
import { Review, ReviewSummary } from '../types/review';
import { Report } from '../types/report';

// ─── Mock User ───────────────────────────────────────────────────────────────

export const MOCK_CURRENT_USER = {
  id: 'user-001',
  email: 'dev@test.com',
  phone: '+819012345678',
  nickname: '田中太郎',
  avatarUrl: undefined,
  averageRating: 4.7,
  completedTaskCount: 23,
  createdAt: '2024-06-01T09:00:00Z',
};

// ─── Mock Tasks ──────────────────────────────────────────────────────────────

const now = Date.now();

export const MOCK_TASKS: Task[] = [
  {
    id: 'task-001',
    posterId: 'user-002',
    posterNickname: '佐藤花子',
    posterRating: 4.8,
    type: 'delivery' as TaskType,
    description: '需要帮忙把一份文件从新宿站送到涩谷办公室，文件比较重要，请小心保管。大约需要30分钟。',
    location: { address: '東京都新宿区西新宿1-1-1', latitude: 35.6896, longitude: 139.6921 },
    reward: 2000,
    deadline: new Date(now + 3600000 * 3).toISOString(),
    status: 'open',
    intentCount: 2,
    createdAt: new Date(now - 1800000).toISOString(),
    distance: 0.8,
  },
  {
    id: 'task-002',
    posterId: 'user-003',
    posterNickname: '鈴木一郎',
    posterRating: 4.5,
    type: 'shopping' as TaskType,
    description: '帮忙去附近的便利店买几瓶水和一些零食，清单会通过聊天发送。',
    location: { address: '東京都渋谷区道玄坂2-1-1', latitude: 35.6580, longitude: 139.7016 },
    reward: 800,
    deadline: new Date(now + 3600000 * 2).toISOString(),
    status: 'open',
    intentCount: 0,
    createdAt: new Date(now - 3600000).toISOString(),
    distance: 1.2,
  },
  {
    id: 'task-003',
    posterId: 'user-004',
    posterNickname: '高橋美咲',
    posterRating: 4.9,
    type: 'dog_walking' as TaskType,
    description: '下午需要帮忙遛狗1小时，是一只温顺的柴犬。公园就在附近，狗绳和水碗都准备好了。',
    location: { address: '東京都目黒区中目黒1-1-1', latitude: 35.6440, longitude: 139.6989 },
    reward: 1500,
    deadline: new Date(now + 3600000 * 5).toISOString(),
    status: 'open',
    intentCount: 3,
    createdAt: new Date(now - 7200000).toISOString(),
    distance: 2.5,
  },
  {
    id: 'task-004',
    posterId: 'user-005',
    posterNickname: '山田健太',
    posterRating: 4.2,
    type: 'queuing' as TaskType,
    description: '新开的拉面店需要排队，预计等待1小时左右。帮忙排到后通知我，我来接替。',
    location: { address: '東京都豊島区東池袋1-1-1', latitude: 35.7295, longitude: 139.7109 },
    reward: 3000,
    deadline: new Date(now + 3600000 * 4).toISOString(),
    status: 'open',
    intentCount: 1,
    createdAt: new Date(now - 5400000).toISOString(),
    distance: 3.8,
  },
  {
    id: 'task-005',
    posterId: 'user-006',
    posterNickname: '伊藤さくら',
    posterRating: 4.6,
    type: 'pickup' as TaskType,
    description: '帮忙去快递柜取一个包裹，取件码会通过聊天发送。包裹不大，一只手就能拿。',
    location: { address: '東京都港区六本木3-1-1', latitude: 35.6627, longitude: 139.7318 },
    reward: 500,
    deadline: new Date(now + 3600000 * 6).toISOString(),
    status: 'open',
    intentCount: 0,
    createdAt: new Date(now - 900000).toISOString(),
    distance: 1.8,
  },
  {
    id: 'task-006',
    posterId: 'user-001',
    posterNickname: '田中太郎',
    posterRating: 4.7,
    type: 'delivery' as TaskType,
    description: '我发布的任务 - 帮忙送一本书到朋友家，距离不远。',
    location: { address: '東京都世田谷区三軒茶屋1-1-1', latitude: 35.6437, longitude: 139.6700 },
    reward: 1000,
    deadline: new Date(now + 3600000 * 8).toISOString(),
    status: 'in_progress',
    intentCount: 2,
    selectedHelperId: 'user-003',
    createdAt: new Date(now - 86400000).toISOString(),
    distance: 4.2,
  },
];

// ─── Mock Intents ────────────────────────────────────────────────────────────

export const MOCK_INTENTS: Record<string, Intent[]> = {
  'task-001': [
    {
      id: 'intent-001',
      taskId: 'task-001',
      helperId: 'user-007',
      helperNickname: '中村翔太',
      helperRating: 4.3,
      helperCompletedCount: 15,
      message: '我现在就在新宿站附近，可以马上出发！',
      status: 'pending',
      createdAt: new Date(now - 600000).toISOString(),
    },
    {
      id: 'intent-002',
      taskId: 'task-001',
      helperId: 'user-008',
      helperNickname: '小林優子',
      helperRating: 4.9,
      helperCompletedCount: 42,
      message: '有送文件经验，会妥善保管。',
      status: 'pending',
      createdAt: new Date(now - 300000).toISOString(),
    },
  ],
  'task-003': [
    {
      id: 'intent-003',
      taskId: 'task-003',
      helperId: 'user-009',
      helperNickname: '渡辺大輝',
      helperRating: 4.7,
      helperCompletedCount: 8,
      message: '我很喜欢狗，家里也养了一只柴犬！',
      status: 'pending',
      createdAt: new Date(now - 1200000).toISOString(),
    },
  ],
};

// ─── Mock Chat Sessions ──────────────────────────────────────────────────────

export const MOCK_CHAT_SESSIONS: ChatSession[] = [
  {
    id: 'session-001',
    taskId: 'task-006',
    taskTitle: '帮忙送一本书到朋友家',
    participantId: 'user-003',
    participantNickname: '鈴木一郎',
    participantAvatarUrl: undefined,
    lastMessage: '好的，我大概15分钟后到',
    lastMessageTime: new Date(now - 300000).toISOString(),
    unreadCount: 1,
  },
  {
    id: 'session-002',
    taskId: 'task-001',
    taskTitle: '送文件从新宿到涩谷',
    participantId: 'user-007',
    participantNickname: '中村翔太',
    participantAvatarUrl: undefined,
    lastMessage: '请问文件大概多重？',
    lastMessageTime: new Date(now - 1800000).toISOString(),
    unreadCount: 0,
  },
];

// ─── Mock Chat Messages ──────────────────────────────────────────────────────

export const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  'session-001': [
    {
      id: 'msg-001',
      sessionId: 'session-001',
      senderId: 'user-001',
      content: '你好，书在我家门口的柜子里，密码是1234',
      type: 'text',
      timestamp: new Date(now - 3600000).toISOString(),
      status: 'sent',
    },
    {
      id: 'msg-002',
      sessionId: 'session-001',
      senderId: 'user-003',
      content: '收到，我现在出发',
      type: 'text',
      timestamp: new Date(now - 3000000).toISOString(),
      status: 'sent',
    },
    {
      id: 'msg-003',
      sessionId: 'session-001',
      senderId: 'user-003',
      content: '好的，我大概15分钟后到',
      type: 'text',
      timestamp: new Date(now - 300000).toISOString(),
      status: 'sent',
    },
  ],
  'session-002': [
    {
      id: 'msg-004',
      sessionId: 'session-002',
      senderId: 'user-007',
      content: '请问文件大概多重？',
      type: 'text',
      timestamp: new Date(now - 1800000).toISOString(),
      status: 'sent',
    },
  ],
};

// ─── Mock Reviews ────────────────────────────────────────────────────────────

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'review-001',
    taskId: 'task-010',
    reviewerId: 'user-002',
    revieweeId: 'user-001',
    rating: 5,
    comment: '非常靠谱，准时送达，态度很好！',
    createdAt: new Date(now - 86400000 * 3).toISOString(),
  },
  {
    id: 'review-002',
    taskId: 'task-011',
    reviewerId: 'user-004',
    revieweeId: 'user-001',
    rating: 4,
    comment: '完成得不错，就是稍微晚了几分钟。',
    createdAt: new Date(now - 86400000 * 7).toISOString(),
  },
  {
    id: 'review-003',
    taskId: 'task-012',
    reviewerId: 'user-005',
    revieweeId: 'user-001',
    rating: 5,
    comment: '很细心，推荐！',
    createdAt: new Date(now - 86400000 * 14).toISOString(),
  },
];

export const MOCK_REVIEW_SUMMARY: ReviewSummary = {
  averageRating: 4.7,
  totalReviews: 3,
  reviews: MOCK_REVIEWS,
};

// ─── Helper: simulate delay ──────────────────────────────────────────────────

export function mockDelay(ms: number = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
