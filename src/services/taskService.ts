/**
 * Task Service
 *
 * Encapsulates all task-related API calls including:
 * - Task CRUD operations
 * - Intent submission and withdrawal
 * - Helper selection
 *
 * Requirements covered:
 * - 4.1, 4.3: Create task
 * - 5.1: Get nearby tasks with location-based filtering
 * - 6.1: Submit intent
 * - 6.5: Select helper
 * - 6.8: Withdraw intent
 */

import apiClient from './api';
import { Task, Intent, CreateTaskPayload, TaskFilter } from '../types/task';
import { API_ENDPOINTS, PAGINATION, LOCATION } from '../utils/constants';

/**
 * Response shape for paginated task list
 */
export interface TaskListResponse {
  tasks: Task[];
  page: number;
  totalPages: number;
  totalCount: number;
}

/**
 * Response shape for intent list
 */
export interface IntentListResponse {
  intents: Intent[];
}

/**
 * Parameters for fetching nearby tasks
 */
export interface FetchTasksParams {
  lat: number;
  lng: number;
  radius?: number;
  type?: string;
  minReward?: number;
  maxReward?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
}

class TaskService {
  /**
   * Fetch nearby tasks based on user's location and optional filters.
   *
   * Requirement 5.1: Display tasks within 10km radius, sorted by distance.
   * Requirement 5.5: Support filtering by task type and reward range.
   */
  async fetchTasks(params: FetchTasksParams): Promise<TaskListResponse> {
    const {
      lat,
      lng,
      radius = LOCATION.DEFAULT_RADIUS_KM,
      type,
      minReward,
      maxReward,
      page = 1,
      pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
    } = params;

    const queryParams: Record<string, string | number> = {
      lat,
      lng,
      radius,
      page,
      pageSize,
    };

    if (type) {
      queryParams.type = type;
    }
    if (minReward !== undefined) {
      queryParams.minReward = minReward;
    }
    if (maxReward !== undefined) {
      queryParams.maxReward = maxReward;
    }
    if (params.sort) {
      queryParams.sort = params.sort;
    }

    const response = await apiClient.get<TaskListResponse>(
      API_ENDPOINTS.TASKS,
      { params: queryParams }
    );

    return response.data;
  }

  /**
   * Fetch a single task's full details by ID.
   *
   * Requirement 5.3: Display task detail page with full description,
   * location, reward, time, poster nickname and rating.
   */
  async fetchTaskDetail(taskId: string): Promise<Task> {
    const response = await apiClient.get<Task>(
      API_ENDPOINTS.TASK_DETAIL(taskId)
    );
    return response.data;
  }

  /**
   * Create a new task.
   *
   * Requirement 4.1, 4.3: Submit task with type, description, location,
   * deadline, and reward. All fields validated before submission.
   */
  async createTask(payload: CreateTaskPayload): Promise<Task> {
    const response = await apiClient.post<Task>(
      API_ENDPOINTS.TASKS,
      payload
    );
    return response.data;
  }

  /**
   * Submit an intent (expression of interest) for a task.
   *
   * Requirement 6.1: Helper submits intent with optional message.
   * Requirement 6.2: Optional message (max 200 chars) to explain availability.
   */
  async submitIntent(taskId: string, message?: string): Promise<Intent> {
    const response = await apiClient.post<Intent>(
      API_ENDPOINTS.TASK_INTENTS(taskId),
      { message }
    );
    return response.data;
  }

  /**
   * Withdraw a previously submitted intent.
   *
   * Requirement 6.8: Helper can withdraw intent before being selected.
   */
  async withdrawIntent(taskId: string, intentId: string): Promise<void> {
    await apiClient.delete(
      API_ENDPOINTS.TASK_INTENT_DELETE(taskId, intentId)
    );
  }

  /**
   * Get the list of intents for a task (for the task poster).
   *
   * Requirement 6.3, 6.4: Poster views intent list with helper info.
   */
  async fetchIntents(taskId: string): Promise<IntentListResponse> {
    const response = await apiClient.get<IntentListResponse>(
      API_ENDPOINTS.TASK_INTENTS(taskId)
    );
    return response.data;
  }

  /**
   * Select a helper from the intent list.
   */
  async selectHelper(taskId: string, helperId: string): Promise<Task> {
    const response = await apiClient.post<Task>(
      API_ENDPOINTS.TASK_SELECT_HELPER(taskId),
      { helperId }
    );
    return response.data;
  }

  /**
   * Update task details (description, reward, location, deadline).
   * Only allowed for tasks in 'open' status by the poster.
   */
  async updateTask(
    taskId: string,
    payload: { description?: string; reward?: number; location?: { address: string; latitude: number; longitude: number }; deadline?: string }
  ): Promise<Task> {
    const response = await apiClient.patch<Task>(
      API_ENDPOINTS.TASK_DETAIL(taskId),
      payload
    );
    return response.data;
  }
}

export const taskService = new TaskService();
