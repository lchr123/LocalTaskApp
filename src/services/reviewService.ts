/**
 * Review Service
 *
 * Encapsulates all review-related API calls including:
 * - Submitting a review for a completed task
 * - Fetching a user's review list and summary
 *
 * Requirements covered:
 * - 8.1: Display review entry after task completion (14-day window)
 * - 8.3: Submit review with rating and optional comment
 * - 8.5: Display user's historical reviews and average rating
 */

import apiClient from './api';
import { Review, ReviewSummary } from '../types/review';
import { API_ENDPOINTS } from '../utils/constants';
import { DEV_MOCK_AUTH } from '../config/aws-config';
import { MOCK_REVIEWS, MOCK_REVIEW_SUMMARY, mockDelay } from './mockData';

/**
 * Payload for submitting a review
 */
export interface SubmitReviewPayload {
  /** The task being reviewed */
  taskId: string;
  /** The user being reviewed */
  revieweeId: string;
  /** Rating from 1 to 5 (required) */
  rating: number;
  /** Optional text comment (max 500 characters) */
  comment?: string;
}

class ReviewService {
  /**
   * Submit a review for a completed task.
   *
   * Requirement 8.3: Save review and display success.
   * Requirement 8.1: Review can only be submitted within 14 days of task completion.
   *
   * @param payload - Review data including taskId, revieweeId, rating, and optional comment
   * @returns The created review
   */
  async submitReview(payload: SubmitReviewPayload): Promise<Review> {
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      const review: Review = {
        id: 'review-' + Date.now(),
        taskId: payload.taskId,
        reviewerId: 'user-001',
        revieweeId: payload.revieweeId,
        rating: payload.rating,
        comment: payload.comment,
        createdAt: new Date().toISOString(),
      };
      MOCK_REVIEWS.unshift(review);
      return review;
    }

    const response = await apiClient.post<Review>(
      API_ENDPOINTS.REVIEWS,
      payload
    );
    return response.data;
  }

  async fetchUserReviews(userId: string): Promise<ReviewSummary> {
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      return MOCK_REVIEW_SUMMARY;
    }

    const response = await apiClient.get<ReviewSummary>(
      API_ENDPOINTS.USER_REVIEWS(userId)
    );
    return response.data;
  }
}

export const reviewService = new ReviewService();
