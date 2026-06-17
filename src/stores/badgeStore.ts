/**
 * Badge Store
 *
 * Manages badge state for bottom tab icons (pending intents, unread messages).
 * Provides a refresh function that can be called from anywhere.
 */

import { create } from 'zustand';
import apiClient from '../services/api';

interface BadgeState {
  pendingIntentCount: number;
  hasUnreadMessages: boolean;
  refreshBadges: () => Promise<void>;
}

export const useBadgeStore = create<BadgeState>((set) => ({
  pendingIntentCount: 0,
  hasUnreadMessages: false,

  refreshBadges: async () => {
    try {
      const [intentsRes, unreadRes] = await Promise.all([
        apiClient.get('/tasks/mine/has-pending-intents').catch(() => ({ data: { pendingCount: 0 } })),
        apiClient.get('/chat/has-unread').catch(() => ({ data: { hasUnread: false } })),
      ]);
      set({
        pendingIntentCount: intentsRes.data.pendingCount || 0,
        hasUnreadMessages: unreadRes.data.hasUnread || false,
      });
    } catch {
      // ignore
    }
  },
}));
