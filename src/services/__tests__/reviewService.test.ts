/**
 * Unit Tests for Review Service
 *
 * Tests reviewService methods for submitting reviews and fetching user reviews.
 *
 * Validates:
 * - Requirement 8.3: Submit review with rating and optional comment
 * - Requirement 8.5: Fetch user's historical reviews and average rating
 */

import { reviewService } from '../reviewService';
import apiClient from '../api';

// Mock the api client
jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('ReviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitReview', () => {
    it('submits a review with rating and comment (Req 8.3)', async () => {
      const mockReview = {
        id: 'review-1',
        taskId: 'task-123',
        reviewerId: 'user-1',
        revieweeId: 'user-2',
        rating: 5,
        comment: 'Great helper!',
        createdAt: '2025-01-15T10:00:00Z',
      };
      mockApiClient.post.mockResolvedValue({ data: mockReview });

      const result = await reviewService.submitReview({
        taskId: 'task-123',
        revieweeId: 'user-2',
        rating: 5,
        comment: 'Great helper!',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/reviews', {
        taskId: 'task-123',
        revieweeId: 'user-2',
        rating: 5,
        comment: 'Great helper!',
      });
      expect(result.id).toBe('review-1');
      expect(result.rating).toBe(5);
      expect(result.comment).toBe('Great helper!');
    });

    it('submits a review without comment (Req 8.3)', async () => {
      const mockReview = {
        id: 'review-2',
        taskId: 'task-456',
        reviewerId: 'user-1',
        revieweeId: 'user-3',
        rating: 3,
        createdAt: '2025-01-15T11:00:00Z',
      };
      mockApiClient.post.mockResolvedValue({ data: mockReview });

      const result = await reviewService.submitReview({
        taskId: 'task-456',
        revieweeId: 'user-3',
        rating: 3,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/reviews', {
        taskId: 'task-456',
        revieweeId: 'user-3',
        rating: 3,
      });
      expect(result.id).toBe('review-2');
      expect(result.rating).toBe(3);
      expect(result.comment).toBeUndefined();
    });

    it('throws error when submission fails (e.g., duplicate review)', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Review already exists'));

      await expect(
        reviewService.submitReview({
          taskId: 'task-123',
          revieweeId: 'user-2',
          rating: 4,
        })
      ).rejects.toThrow('Review already exists');
    });

    it('throws error when review window has expired', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Review period expired'));

      await expect(
        reviewService.submitReview({
          taskId: 'task-old',
          revieweeId: 'user-2',
          rating: 4,
        })
      ).rejects.toThrow('Review period expired');
    });
  });

  describe('fetchUserReviews', () => {
    it('fetches user reviews with summary (Req 8.5)', async () => {
      const mockSummary = {
        averageRating: 4.5,
        totalReviews: 10,
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
      mockApiClient.get.mockResolvedValue({ data: mockSummary });

      const result = await reviewService.fetchUserReviews('user-target');

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/user-target/reviews');
      expect(result.averageRating).toBe(4.5);
      expect(result.totalReviews).toBe(10);
      expect(result.reviews).toHaveLength(2);
    });

    it('returns empty reviews for user with no reviews', async () => {
      const mockSummary = {
        averageRating: 0,
        totalReviews: 0,
        reviews: [],
      };
      mockApiClient.get.mockResolvedValue({ data: mockSummary });

      const result = await reviewService.fetchUserReviews('new-user');

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/new-user/reviews');
      expect(result.averageRating).toBe(0);
      expect(result.totalReviews).toBe(0);
      expect(result.reviews).toHaveLength(0);
    });

    it('throws error when fetch fails', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network Error'));

      await expect(
        reviewService.fetchUserReviews('user-target')
      ).rejects.toThrow('Network Error');
    });
  });
});
