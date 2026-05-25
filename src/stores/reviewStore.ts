/**
 * Review Store (Zustand)
 *
 * Manages review-related state for the LocalTask platform.
 * Handles review list, average rating, and submission state.
 *
 * Requirements covered:
 * - 8.1: Display review entry after task completion (14-day window)
 * - 8.3: Submit review and display success
 * - 8.5: Display user's historical reviews and average rating (1 decimal place)
 */

import { create } from 'zustand';
import { Review, ReviewSummary } from '../types/review';
import { reviewService, SubmitReviewPayload } from '../services/reviewService';

/**
 * Review store state interface
 */
interface ReviewState {
  /** List of reviews for the currently viewed user */
  reviews: Review[];
  /** Average rating for the currently viewed user (1 decimal place) */
  averageRating: number;
  /** Total number of reviews for the currently viewed user */
  totalReviews: number;
  /** Whether a review submission is in progress */
  isSubmitting: boolean;
  /** Whether reviews are being loaded */
  isLoading: boolean;
  /** Current error message, if any */
  error: string | null;

  // Actions

  /** Submit a review for a completed task */
  submitReview: (payload: SubmitReviewPayload) => Promise<void>;
  /** Fetch reviews for a specific user */
  fetchUserReviews: (userId: string) => Promise<void>;
  /** Clear error state */
  clearError: () => void;
  /** Reset store state */
  reset: () => void;
}

/**
 * Review Store
 *
 * Central state management for review-related features.
 * Uses Zustand for lightweight, TypeScript-friendly state management.
 */
export const useReviewStore = create<ReviewState>((set, get) => ({
  // Initial state
  reviews: [],
  averageRating: 0,
  totalReviews: 0,
  isSubmitting: false,
  isLoading: false,
  error: null,

  /**
   * Submit a review for a completed task.
   *
   * Requirement 8.3: Save review and display success.
   * Reviews are immutable once submitted (Correctness Property 3).
   */
  submitReview: async (payload: SubmitReviewPayload) => {
    set({ isSubmitting: true, error: null });

    try {
      const review = await reviewService.submitReview(payload);

      // Add the new review to the list if viewing the reviewee's reviews
      set((state) => ({
        reviews: [review, ...state.reviews],
        totalReviews: state.totalReviews + 1,
        isSubmitting: false,
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '提交评价失败';
      set({ isSubmitting: false, error: message });
      throw error;
    }
  },

  /**
   * Fetch reviews for a specific user.
   *
   * Requirement 8.5: Display historical reviews and average rating
   * (preserved to 1 decimal place) on user's profile page.
   */
  fetchUserReviews: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const summary: ReviewSummary = await reviewService.fetchUserReviews(userId);

      set({
        reviews: summary.reviews,
        averageRating: summary.averageRating,
        totalReviews: summary.totalReviews,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '加载评价列表失败';
      set({ isLoading: false, error: message });
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Reset store state to initial values
   */
  reset: () => {
    set({
      reviews: [],
      averageRating: 0,
      totalReviews: 0,
      isSubmitting: false,
      isLoading: false,
      error: null,
    });
  },
}));
