/**
 * Unit Tests for Review Store
 *
 * Tests reviewStore state management including review submission,
 * fetching user reviews, and error handling.
 *
 * Validates:
 * - Requirement 8.1: Review entry available after task completion
 * - Requirement 8.3: Submit review and display success
 * - Requirement 8.5: Display historical reviews and average rating
 */

import { useReviewStore } from '../reviewStore';
import { reviewService } from '../../services/reviewService';

// Mock the review service
jest.mock('../../services/reviewService', () => ({
  reviewService: {
    submitReview: jest.fn(),
    fetchUserReviews: jest.fn(),
  },
}));

const mockReviewService = reviewService as jest.Mocked<typeof reviewService>;

describe('ReviewStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state between tests
    useReviewStore.setState({
      reviews: [],
      averageRating: 0,
      totalReviews: 0,
      isSubmitting: false,
      isLoading: false,
      error: null,
    });
  });

  describe('submitReview', () => {
    it('submits review and updates state (Req 8.3)', async () => {
      const mockReview = {
        id: 'review-1',
        taskId: 'task-123',
        reviewerId: 'user-1',
        revieweeId: 'user-2',
        rating: 5,
        comment: 'Great job!',
        createdAt: '2025-01-15T10:00:00Z',
      };
      mockReviewService.submitReview.mockResolvedValue(mockReview);

      await useReviewStore.getState().submitReview({
        taskId: 'task-123',
        revieweeId: 'user-2',
        rating: 5,
        comment: 'Great job!',
      });

      const state = useReviewStore.getState();
      expect(state.isSubmitting).toBe(false);
      expect(state.reviews).toHaveLength(1);
      expect(state.reviews[0].id).toBe('review-1');
      expect(state.totalReviews).toBe(1);
      expect(state.error).toBeNull();
    });

    it('sets isSubmitting to true during submission', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockReviewService.submitReview.mockReturnValue(pendingPromise as Promise<never>);

      const submitPromise = useReviewStore.getState().submitReview({
        taskId: 'task-123',
        revieweeId: 'user-2',
        rating: 4,
      });

      // Check isSubmitting is true while in progress
      expect(useReviewStore.getState().isSubmitting).toBe(true);

      // Resolve the promise
      resolvePromise!({
        id: 'review-1',
        taskId: 'task-123',
        reviewerId: 'user-1',
        revieweeId: 'user-2',
        rating: 4,
        createdAt: '2025-01-15T10:00:00Z',
      });

      await submitPromise;
      expect(useReviewStore.getState().isSubmitting).toBe(false);
    });

    it('sets error on submission failure', async () => {
      mockReviewService.submitReview.mockRejectedValue(
        new Error('Review already exists')
      );

      await expect(
        useReviewStore.getState().submitReview({
          taskId: 'task-123',
          revieweeId: 'user-2',
          rating: 4,
        })
      ).rejects.toThrow('Review already exists');

      const state = useReviewStore.getState();
      expect(state.isSubmitting).toBe(false);
      expect(state.error).toBe('Review already exists');
    });

    it('prepends new review to existing reviews list', async () => {
      // Set initial state with existing reviews
      useReviewStore.setState({
        reviews: [
          {
            id: 'review-old',
            taskId: 'task-old',
            reviewerId: 'user-a',
            revieweeId: 'user-2',
            rating: 3,
            createdAt: '2025-01-10T10:00:00Z',
          },
        ],
        totalReviews: 1,
      });

      const mockReview = {
        id: 'review-new',
        taskId: 'task-new',
        reviewerId: 'user-1',
        revieweeId: 'user-2',
        rating: 5,
        comment: 'Awesome!',
        createdAt: '2025-01-15T10:00:00Z',
      };
      mockReviewService.submitReview.mockResolvedValue(mockReview);

      await useReviewStore.getState().submitReview({
        taskId: 'task-new',
        revieweeId: 'user-2',
        rating: 5,
        comment: 'Awesome!',
      });

      const state = useReviewStore.getState();
      expect(state.reviews).toHaveLength(2);
      expect(state.reviews[0].id).toBe('review-new');
      expect(state.reviews[1].id).toBe('review-old');
      expect(state.totalReviews).toBe(2);
    });
  });

  describe('fetchUserReviews', () => {
    it('fetches and sets user reviews (Req 8.5)', async () => {
      const mockSummary = {
        averageRating: 4.3,
        totalReviews: 15,
        reviews: [
          {
            id: 'review-1',
            taskId: 'task-1',
            reviewerId: 'user-a',
            revieweeId: 'user-target',
            rating: 5,
            comment: 'Excellent!',
            createdAt: '2025-01-15T10:00:00Z',
          },
          {
            id: 'review-2',
            taskId: 'task-2',
            reviewerId: 'user-b',
            revieweeId: 'user-target',
            rating: 4,
            createdAt: '2025-01-14T09:00:00Z',
          },
        ],
      };
      mockReviewService.fetchUserReviews.mockResolvedValue(mockSummary);

      await useReviewStore.getState().fetchUserReviews('user-target');

      const state = useReviewStore.getState();
      expect(state.reviews).toHaveLength(2);
      expect(state.averageRating).toBe(4.3);
      expect(state.totalReviews).toBe(15);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets isLoading to true during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockReviewService.fetchUserReviews.mockReturnValue(pendingPromise as Promise<never>);

      const fetchPromise = useReviewStore.getState().fetchUserReviews('user-target');

      expect(useReviewStore.getState().isLoading).toBe(true);

      resolvePromise!({
        averageRating: 4.0,
        totalReviews: 5,
        reviews: [],
      });

      await fetchPromise;
      expect(useReviewStore.getState().isLoading).toBe(false);
    });

    it('sets error on fetch failure', async () => {
      mockReviewService.fetchUserReviews.mockRejectedValue(
        new Error('Network Error')
      );

      await useReviewStore.getState().fetchUserReviews('user-target');

      const state = useReviewStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network Error');
    });

    it('handles user with no reviews', async () => {
      const mockSummary = {
        averageRating: 0,
        totalReviews: 0,
        reviews: [],
      };
      mockReviewService.fetchUserReviews.mockResolvedValue(mockSummary);

      await useReviewStore.getState().fetchUserReviews('new-user');

      const state = useReviewStore.getState();
      expect(state.reviews).toHaveLength(0);
      expect(state.averageRating).toBe(0);
      expect(state.totalReviews).toBe(0);
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useReviewStore.setState({ error: 'Some error' });

      useReviewStore.getState().clearError();

      expect(useReviewStore.getState().error).toBeNull();
    });
  });

  describe('reset', () => {
    it('resets store to initial state', () => {
      useReviewStore.setState({
        reviews: [
          {
            id: 'review-1',
            taskId: 'task-1',
            reviewerId: 'user-a',
            revieweeId: 'user-b',
            rating: 5,
            createdAt: '2025-01-15T10:00:00Z',
          },
        ],
        averageRating: 4.5,
        totalReviews: 10,
        isSubmitting: true,
        isLoading: true,
        error: 'Some error',
      });

      useReviewStore.getState().reset();

      const state = useReviewStore.getState();
      expect(state.reviews).toHaveLength(0);
      expect(state.averageRating).toBe(0);
      expect(state.totalReviews).toBe(0);
      expect(state.isSubmitting).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
