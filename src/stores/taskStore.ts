/**
 * Task Store (Zustand)
 *
 * Manages task-related state for the LocalTask platform.
 * Handles task list, current task detail, intents, filters, and pagination.
 *
 * Requirements covered:
 * - 4.1, 4.3: Task creation
 * - 5.1: Nearby task list with location-based queries
 * - 5.4: Pull-to-refresh
 * - 5.5: Task filtering by type and reward
 * - 6.1: Intent submission
 * - 6.5: Helper selection
 * - 6.8: Intent withdrawal
 */

import { create } from 'zustand';
import { Task, Intent, TaskFilter, CreateTaskPayload } from '../types/task';
import { taskService } from '../services/taskService';
import { locationService, UserLocation } from '../services/locationService';
import { LOCATION, PAGINATION } from '../utils/constants';
import { JpPrefecture } from '../utils/jpCities';

/**
 * Task store state interface
 */
interface TaskState {
  /** List of tasks for the current view */
  tasks: Task[];
  /** Currently viewed task detail */
  currentTask: Task | null;
  /** Intents for the current task (poster view) */
  intents: Intent[];
  /** Active filter settings */
  filter: TaskFilter;
  /** Whether a task operation is in progress */
  isLoading: boolean;
  /** Whether intents are being loaded */
  isLoadingIntents: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Current page number for pagination */
  page: number;
  /** Whether more pages are available */
  hasMore: boolean;
  /** User's current location */
  userLocation: UserLocation | null;
  /** Whether location permission was denied */
  locationDenied: boolean;
  /** Manually selected prefecture (when GPS is unavailable / overridden) */
  manualCity: JpPrefecture | null;

  // Actions

  /** Fetch tasks based on current location and filters */
  fetchTasks: () => Promise<void>;
  /** Fetch a specific task's details */
  fetchTaskDetail: (taskId: string) => Promise<void>;
  /** Create a new task */
  createTask: (payload: CreateTaskPayload) => Promise<Task>;
  /** Submit an intent for a task */
  submitIntent: (taskId: string, message?: string) => Promise<void>;
  /** Withdraw an intent */
  withdrawIntent: (taskId: string, intentId: string) => Promise<void>;
  /** Fetch intents for a task (poster view) */
  fetchIntents: (taskId: string) => Promise<void>;
  /** Select a helper for a task */
  selectHelper: (taskId: string, helperId: string) => Promise<void>;
  /** Update filter settings */
  setFilter: (filter: Partial<TaskFilter>, refetch?: boolean) => void;
  /** Load the next page of tasks */
  loadMore: () => Promise<void>;
  /** Refresh the task list (pull-to-refresh) */
  refresh: () => Promise<void>;
  /** Initialize user location */
  initLocation: () => Promise<void>;
  /** Manually set location from a selected prefecture (overrides GPS) */
  setManualLocation: (city: JpPrefecture) => void;
  /** Clear current task detail */
  clearCurrentTask: () => void;
  /** Clear error state */
  clearError: () => void;
}

/**
 * Task Store
 *
 * Central state management for task-related features.
 * Uses Zustand for lightweight, TypeScript-friendly state management.
 */
export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial state
  tasks: [],
  currentTask: null,
  intents: [],
  filter: {
    radius: LOCATION.DEFAULT_RADIUS_KM,
  },
  isLoading: false,
  isLoadingIntents: false,
  error: null,
  page: 1,
  hasMore: true,
  userLocation: null,
  locationDenied: false,
  manualCity: null,

  /**
   * Initialize user location.
   * Requests permission and gets current position.
   *
   * Requirement 5.6: Handle location permission denial.
   */
  initLocation: async () => {
    const location = await locationService.getCurrentLocation();

    if (location) {
      set({ userLocation: location, locationDenied: false, manualCity: null });
    } else {
      set({ userLocation: null, locationDenied: true });
    }
  },

  /**
   * Manually set location from a selected prefecture.
   * Used when GPS is unavailable/denied, or when the user wants to browse
   * tasks in a different region. Clears the locationDenied flag so the list
   * renders, and stores the chosen prefecture for display.
   *
   * The userLocation change triggers fetchTasks via the screen's effect.
   */
  setManualLocation: (city: JpPrefecture) => {
    set({
      userLocation: { latitude: city.latitude, longitude: city.longitude, accuracy: null },
      locationDenied: false,
      manualCity: city,
    });
  },

  /**
   * Fetch tasks based on current location and active filters.
   * Resets pagination to page 1.
   *
   * Requirement 5.1: Display tasks within radius, sorted by distance.
   */
  fetchTasks: async () => {
    const { userLocation, filter } = get();

    if (!userLocation) {
      set({ error: '无法获取位置信息，请开启定位权限', tasks: [] });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await taskService.fetchTasks({
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        radius: filter.radius ?? LOCATION.DEFAULT_RADIUS_KM,
        type: filter.type,
        minReward: filter.minReward,
        maxReward: filter.maxReward,
        sort: filter.sort,
        tags: filter.tags,
        page: 1,
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      });

      set({
        tasks: response.tasks,
        page: 1,
        hasMore: response.page < response.totalPages,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '加载任务列表失败';
      set({ isLoading: false, error: message });
    }
  },

  /**
   * Load the next page of tasks (infinite scroll).
   *
   * Requirement 5.1: Each page shows up to 20 tasks.
   */
  loadMore: async () => {
    const { userLocation, filter, page, hasMore, isLoading } = get();

    if (!userLocation || !hasMore || isLoading) {
      return;
    }

    set({ isLoading: true });

    try {
      const nextPage = page + 1;
      const response = await taskService.fetchTasks({
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        radius: filter.radius ?? LOCATION.DEFAULT_RADIUS_KM,
        type: filter.type,
        minReward: filter.minReward,
        maxReward: filter.maxReward,
        sort: filter.sort,
        tags: filter.tags,
        page: nextPage,
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      });

      set((state) => ({
        tasks: [...state.tasks, ...response.tasks],
        page: nextPage,
        hasMore: response.page < response.totalPages,
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '加载更多任务失败';
      set({ isLoading: false, error: message });
    }
  },

  /**
   * Refresh the task list (pull-to-refresh).
   * Resets to page 1 and fetches fresh data.
   *
   * Requirement 5.4: Pull-to-refresh reloads latest data within 5 seconds.
   */
  refresh: async () => {
    const { userLocation, filter } = get();

    if (!userLocation) {
      // Try to get location again
      const location = await locationService.getCurrentLocation();
      if (location) {
        set({ userLocation: location, locationDenied: false });
      } else {
        set({ error: '无法获取位置信息，请开启定位权限' });
        return;
      }
    }

    const currentLocation = get().userLocation;
    if (!currentLocation) return;

    set({ isLoading: true, error: null });

    try {
      const response = await taskService.fetchTasks({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        radius: filter.radius ?? LOCATION.DEFAULT_RADIUS_KM,
        type: filter.type,
        minReward: filter.minReward,
        maxReward: filter.maxReward,
        sort: filter.sort,
        tags: filter.tags,
        page: 1,
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      });

      set({
        tasks: response.tasks,
        page: 1,
        hasMore: response.page < response.totalPages,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '刷新任务列表失败';
      set({ isLoading: false, error: message });
    }
  },

  /**
   * Fetch a specific task's full details.
   *
   * Requirement 5.3: Display task detail with full info.
   */
  fetchTaskDetail: async (taskId: string) => {
    set({ isLoading: true, error: null });

    try {
      const task = await taskService.fetchTaskDetail(taskId);
      set({ currentTask: task, isLoading: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '加载任务详情失败';
      set({ isLoading: false, error: message });
    }
  },

  /**
   * Create a new task.
   *
   * Requirement 4.3: Create task and display success.
   */
  createTask: async (payload: CreateTaskPayload) => {
    set({ isLoading: true, error: null });

    try {
      const task = await taskService.createTask(payload);
      set((state) => ({
        tasks: [task, ...state.tasks],
        isLoading: false,
      }));
      return task;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '发布任务失败';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  /**
   * Submit an intent for a task.
   *
   * Requirement 6.1: Submit intent with optional message.
   */
  submitIntent: async (taskId: string, message?: string) => {
    set({ isLoading: true, error: null });

    try {
      const intent = await taskService.submitIntent(taskId, message);

      // Update current task's intent count if viewing the same task
      set((state) => {
        const updatedCurrentTask =
          state.currentTask?.id === taskId
            ? { ...state.currentTask, intentCount: state.currentTask.intentCount + 1 }
            : state.currentTask;

        return {
          currentTask: updatedCurrentTask,
          intents: [...state.intents, intent],
          isLoading: false,
        };
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '提交意向失败';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  /**
   * Withdraw a previously submitted intent.
   *
   * Requirement 6.8: Helper can withdraw intent before being selected.
   */
  withdrawIntent: async (taskId: string, intentId: string) => {
    set({ isLoading: true, error: null });

    try {
      await taskService.withdrawIntent(taskId, intentId);

      set((state) => {
        // Remove the withdrawn intent from the list
        const updatedIntents = state.intents.filter((i) => i.id !== intentId);

        // Update current task's intent count
        const updatedCurrentTask =
          state.currentTask?.id === taskId
            ? {
                ...state.currentTask,
                intentCount: Math.max(0, state.currentTask.intentCount - 1),
              }
            : state.currentTask;

        return {
          intents: updatedIntents,
          currentTask: updatedCurrentTask,
          isLoading: false,
        };
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '撤回意向失败';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  /**
   * Fetch intents for a task (poster view).
   *
   * Requirement 6.3, 6.4: Display intent list with helper details.
   */
  fetchIntents: async (taskId: string) => {
    set({ isLoadingIntents: true, error: null });

    try {
      const response = await taskService.fetchIntents(taskId);
      set({ intents: response.intents, isLoadingIntents: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '加载意向列表失败';
      set({ isLoadingIntents: false, error: message });
    }
  },

  /**
   * Select a helper from the intent list.
   *
   * Requirement 6.5: Select helper, update task status to in_progress.
   */
  selectHelper: async (taskId: string, helperId: string) => {
    set({ isLoading: true, error: null });

    try {
      const updatedTask = await taskService.selectHelper(taskId, helperId);

      set((state) => {
        // Update the task in the list
        const updatedTasks = state.tasks.map((t) =>
          t.id === taskId ? updatedTask : t
        );

        // Update intents: mark selected helper, reject others
        const updatedIntents = state.intents.map((intent) => ({
          ...intent,
          status: intent.helperId === helperId ? 'selected' as const : 'rejected' as const,
        }));

        return {
          tasks: updatedTasks,
          currentTask: updatedTask,
          intents: updatedIntents,
          isLoading: false,
        };
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '选择帮手失败';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  /**
   * Update filter settings and re-fetch tasks.
   *
   * Requirement 5.5: Filter by task type and reward range.
   */
  setFilter: (newFilter: Partial<TaskFilter>, refetch = true) => {
    set((state) => ({
      filter: { ...state.filter, ...newFilter },
    }));
    // Re-fetch tasks with updated filter (skipped while a multi-select menu is
    // still open; the caller fetches once when the menu closes).
    if (refetch) {
      get().fetchTasks();
    }
  },

  /**
   * Clear current task detail
   */
  clearCurrentTask: () => {
    set({ currentTask: null, intents: [] });
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },
}));
