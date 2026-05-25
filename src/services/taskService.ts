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
import { DEV_MOCK_AUTH } from '../config/aws-config';
import { MOCK_TASKS, MOCK_INTENTS, MOCK_CURRENT_USER, mockDelay } from './mockData';

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
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      let tasks = [...MOCK_TASKS];
      if (params.type) tasks = tasks.filter(t => t.type === params.type);
      if (params.minReward !== undefined) tasks = tasks.filter(t => t.reward >= params.minReward!);
      if (params.maxReward !== undefined) tasks = tasks.filter(t => t.reward <= params.maxReward!);
      tasks.sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99));
      return { tasks, page: 1, totalPages: 1, totalCount: tasks.length };
    }

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
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      const task = MOCK_TASKS.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');
      return task;
    }

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
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      const newTask: Task = {
        id: 'task-' + Date.now(),
        posterId: MOCK_CURRENT_USER.id,
        posterNickname: MOCK_CURRENT_USER.nickname,
        posterRating: MOCK_CURRENT_USER.averageRating,
        type: payload.type,
        description: payload.description,
        location: payload.location,
        reward: payload.reward,
        deadline: payload.deadline,
        status: 'open',
        intentCount: 0,
        createdAt: new Date().toISOString(),
        distance: 0,
      };
      MOCK_TASKS.unshift(newTask);
      return newTask;
    }

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
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      const intent: Intent = {
        id: 'intent-' + Date.now(),
        taskId,
        helperId: MOCK_CURRENT_USER.id,
        helperNickname: MOCK_CURRENT_USER.nickname,
        helperRating: MOCK_CURRENT_USER.averageRating,
        helperCompletedCount: MOCK_CURRENT_USER.completedTaskCount,
        message,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      if (!MOCK_INTENTS[taskId]) MOCK_INTENTS[taskId] = [];
      MOCK_INTENTS[taskId].push(intent);
      return intent;
    }

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
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      const intents = MOCK_INTENTS[taskId];
      if (intents) {
        const idx = intents.findIndex(i => i.id === intentId);
        if (idx >= 0) intents.splice(idx, 1);
      }
      return;
    }

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
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      return { intents: MOCK_INTENTS[taskId] || [] };
    }

    const response = await apiClient.get<IntentListResponse>(
      API_ENDPOINTS.TASK_INTENTS(taskId)
    );
    return response.data;
  }

  /**
   * Select a helper from the intent list.
   */
  async selectHelper(taskId: string, helperId: string): Promise<Task> {
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      const task = MOCK_TASKS.find(t => t.id === taskId);
      if (task) {
        task.status = 'in_progress';
        task.selectedHelperId = helperId;
      }
      return task!;
    }

    const response = await apiClient.post<Task>(
      API_ENDPOINTS.TASK_SELECT_HELPER(taskId),
      { helperId }
    );
    return response.data;
  }
}

export const taskService = new TaskService();
