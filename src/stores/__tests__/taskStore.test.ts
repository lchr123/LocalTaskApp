/**
 * Unit Tests for Task Store
 *
 * Tests taskStore state management including task fetching, filtering,
 * pagination, intent operations, and helper selection.
 *
 * Validates:
 * - Requirement 5.1: Nearby task list with pagination
 * - Requirement 5.4: Pull-to-refresh
 * - Requirement 5.5: Task filtering
 * - Requirement 5.6: Location permission denial handling
 * - Requirement 6.1: Intent submission
 * - Requirement 6.5: Helper selection
 * - Requirement 6.8: Intent withdrawal
 */

import { useTaskStore } from '../taskStore';
import { taskService } from '../../services/taskService';
import { locationService } from '../../services/locationService';

// Mock services
jest.mock('../../services/taskService', () => ({
  taskService: {
    fetchTasks: jest.fn(),
    fetchTaskDetail: jest.fn(),
    createTask: jest.fn(),
    submitIntent: jest.fn(),
    withdrawIntent: jest.fn(),
    fetchIntents: jest.fn(),
    selectHelper: jest.fn(),
  },
}));

jest.mock('../../services/locationService', () => ({
  locationService: {
    getCurrentLocation: jest.fn(),
    requestPermission: jest.fn(),
    hasPermission: jest.fn(),
    calculateDistance: jest.fn(),
  },
}));

const mockTaskService = taskService as jest.Mocked<typeof taskService>;
const mockLocationService = locationService as jest.Mocked<typeof locationService>;

describe('TaskStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state between tests
    useTaskStore.setState({
      tasks: [],
      currentTask: null,
      intents: [],
      filter: { radius: 10 },
      isLoading: false,
      isLoadingIntents: false,
      error: null,
      page: 1,
      hasMore: true,
      userLocation: null,
      locationDenied: false,
    });
  });

  describe('initLocation', () => {
    it('sets userLocation when permission is granted (Req 5.1)', async () => {
      mockLocationService.getCurrentLocation.mockResolvedValue({
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 10,
      });

      await useTaskStore.getState().initLocation();

      const state = useTaskStore.getState();
      expect(state.userLocation).toEqual({
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 10,
      });
      expect(state.locationDenied).toBe(false);
    });

    it('sets locationDenied when permission is denied (Req 5.6)', async () => {
      mockLocationService.getCurrentLocation.mockResolvedValue(null);

      await useTaskStore.getState().initLocation();

      const state = useTaskStore.getState();
      expect(state.userLocation).toBeNull();
      expect(state.locationDenied).toBe(true);
    });
  });

  describe('fetchTasks', () => {
    it('fetches tasks when location is available (Req 5.1)', async () => {
      useTaskStore.setState({
        userLocation: { latitude: 35.6762, longitude: 139.6503, accuracy: 10 },
      });

      mockTaskService.fetchTasks.mockResolvedValue({
        tasks: [
          { id: 'task-1', type: 'delivery', description: 'Test' } as any,
          { id: 'task-2', type: 'shopping', description: 'Test 2' } as any,
        ],
        page: 1,
        totalPages: 2,
        totalCount: 30,
      });

      await useTaskStore.getState().fetchTasks();

      const state = useTaskStore.getState();
      expect(state.tasks).toHaveLength(2);
      expect(state.page).toBe(1);
      expect(state.hasMore).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error when location is not available (Req 5.6)', async () => {
      useTaskStore.setState({ userLocation: null });

      await useTaskStore.getState().fetchTasks();

      const state = useTaskStore.getState();
      expect(state.tasks).toEqual([]);
      expect(state.error).toBe('无法获取位置信息，请开启定位权限');
    });

    it('passes filter params to service (Req 5.5)', async () => {
      useTaskStore.setState({
        userLocation: { latitude: 35.6762, longitude: 139.6503, accuracy: 10 },
        filter: { type: 'delivery', minReward: 100, maxReward: 500, radius: 5 },
      });

      mockTaskService.fetchTasks.mockResolvedValue({
        tasks: [],
        page: 1,
        totalPages: 0,
        totalCount: 0,
      });

      await useTaskStore.getState().fetchTasks();

      expect(mockTaskService.fetchTasks).toHaveBeenCalledWith({
        lat: 35.6762,
        lng: 139.6503,
        radius: 5,
        type: 'delivery',
        minReward: 100,
        maxReward: 500,
        page: 1,
        pageSize: 20,
      });
    });

    it('sets hasMore to false on last page', async () => {
      useTaskStore.setState({
        userLocation: { latitude: 35.6762, longitude: 139.6503, accuracy: 10 },
      });

      mockTaskService.fetchTasks.mockResolvedValue({
        tasks: [{ id: 'task-1' } as any],
        page: 3,
        totalPages: 3,
        totalCount: 50,
      });

      await useTaskStore.getState().fetchTasks();

      expect(useTaskStore.getState().hasMore).toBe(false);
    });

    it('handles API error gracefully', async () => {
      useTaskStore.setState({
        userLocation: { latitude: 35.6762, longitude: 139.6503, accuracy: 10 },
      });

      mockTaskService.fetchTasks.mockRejectedValue(new Error('Server Error'));

      await useTaskStore.getState().fetchTasks();

      const state = useTaskStore.getState();
      expect(state.error).toBe('Server Error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('loadMore', () => {
    it('appends next page of tasks', async () => {
      useTaskStore.setState({
        userLocation: { latitude: 35.6762, longitude: 139.6503, accuracy: 10 },
        tasks: [{ id: 'task-1' } as any],
        page: 1,
        hasMore: true,
      });

      mockTaskService.fetchTasks.mockResolvedValue({
        tasks: [{ id: 'task-2' } as any],
        page: 2,
        totalPages: 3,
        totalCount: 50,
      });

      await useTaskStore.getState().loadMore();

      const state = useTaskStore.getState();
      expect(state.tasks).toHaveLength(2);
      expect(state.page).toBe(2);
      expect(state.hasMore).toBe(true);
    });

    it('does not fetch when hasMore is false', async () => {
      useTaskStore.setState({
        userLocation: { latitude: 35.6762, longitude: 139.6503, accuracy: 10 },
        hasMore: false,
      });

      await useTaskStore.getState().loadMore();

      expect(mockTaskService.fetchTasks).not.toHaveBeenCalled();
    });

    it('does not fetch when already loading', async () => {
      useTaskStore.setState({
        userLocation: { latitude: 35.6762, longitude: 139.6503, accuracy: 10 },
        hasMore: true,
        isLoading: true,
      });

      await useTaskStore.getState().loadMore();

      expect(mockTaskService.fetchTasks).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('resets to page 1 and fetches fresh data (Req 5.4)', async () => {
      useTaskStore.setState({
        userLocation: { latitude: 35.6762, longitude: 139.6503, accuracy: 10 },
        tasks: [{ id: 'old-task' } as any],
        page: 3,
      });

      mockTaskService.fetchTasks.mockResolvedValue({
        tasks: [{ id: 'fresh-task' } as any],
        page: 1,
        totalPages: 2,
        totalCount: 30,
      });

      await useTaskStore.getState().refresh();

      const state = useTaskStore.getState();
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0].id).toBe('fresh-task');
      expect(state.page).toBe(1);
    });
  });

  describe('fetchTaskDetail', () => {
    it('fetches and sets current task', async () => {
      const mockTask = {
        id: 'task-123',
        type: 'delivery',
        description: 'Full description here',
        status: 'open',
      } as any;

      mockTaskService.fetchTaskDetail.mockResolvedValue(mockTask);

      await useTaskStore.getState().fetchTaskDetail('task-123');

      const state = useTaskStore.getState();
      expect(state.currentTask).toEqual(mockTask);
      expect(state.isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockTaskService.fetchTaskDetail.mockRejectedValue(new Error('Not Found'));

      await useTaskStore.getState().fetchTaskDetail('nonexistent');

      expect(useTaskStore.getState().error).toBe('Not Found');
    });
  });

  describe('createTask', () => {
    it('creates task and prepends to list (Req 4.3)', async () => {
      useTaskStore.setState({
        tasks: [{ id: 'existing-task' } as any],
      });

      const newTask = {
        id: 'new-task',
        type: 'delivery',
        description: 'New task description',
        status: 'open',
      } as any;

      mockTaskService.createTask.mockResolvedValue(newTask);

      const result = await useTaskStore.getState().createTask({
        type: 'delivery',
        description: 'New task description',
        location: { address: 'Test', latitude: 35.6762, longitude: 139.6503 },
        reward: 500,
        deadline: '2025-01-20T18:00:00Z',
      });

      const state = useTaskStore.getState();
      expect(result.id).toBe('new-task');
      expect(state.tasks[0].id).toBe('new-task');
      expect(state.tasks).toHaveLength(2);
    });

    it('throws error on creation failure', async () => {
      mockTaskService.createTask.mockRejectedValue(new Error('Validation Error'));

      await expect(
        useTaskStore.getState().createTask({
          type: 'delivery',
          description: 'Short',
          location: { address: 'Test', latitude: 0, longitude: 0 },
          reward: 100,
          deadline: '2025-01-20T18:00:00Z',
        })
      ).rejects.toThrow('Validation Error');

      expect(useTaskStore.getState().error).toBe('Validation Error');
    });
  });

  describe('submitIntent', () => {
    it('submits intent and updates state (Req 6.1)', async () => {
      useTaskStore.setState({
        currentTask: { id: 'task-123', intentCount: 2 } as any,
        intents: [],
      });

      const mockIntent = {
        id: 'intent-1',
        taskId: 'task-123',
        helperId: 'user-1',
        status: 'pending',
        message: 'I can help!',
      } as any;

      mockTaskService.submitIntent.mockResolvedValue(mockIntent);

      await useTaskStore.getState().submitIntent('task-123', 'I can help!');

      const state = useTaskStore.getState();
      expect(state.intents).toHaveLength(1);
      expect(state.currentTask!.intentCount).toBe(3);
    });

    it('throws error on duplicate intent (Req 6.6)', async () => {
      useTaskStore.setState({
        currentTask: { id: 'task-123', intentCount: 2 } as any,
      });

      mockTaskService.submitIntent.mockRejectedValue(
        new Error('您已提交过意向')
      );

      await expect(
        useTaskStore.getState().submitIntent('task-123')
      ).rejects.toThrow('您已提交过意向');
    });
  });

  describe('withdrawIntent', () => {
    it('removes intent from state (Req 6.8)', async () => {
      useTaskStore.setState({
        currentTask: { id: 'task-123', intentCount: 3 } as any,
        intents: [
          { id: 'intent-1', taskId: 'task-123' } as any,
          { id: 'intent-2', taskId: 'task-123' } as any,
        ],
      });

      mockTaskService.withdrawIntent.mockResolvedValue(undefined);

      await useTaskStore.getState().withdrawIntent('task-123', 'intent-1');

      const state = useTaskStore.getState();
      expect(state.intents).toHaveLength(1);
      expect(state.intents[0].id).toBe('intent-2');
      expect(state.currentTask!.intentCount).toBe(2);
    });
  });

  describe('fetchIntents', () => {
    it('fetches and sets intents for a task (Req 6.3)', async () => {
      mockTaskService.fetchIntents.mockResolvedValue({
        intents: [
          { id: 'intent-1', helperNickname: 'Helper A' } as any,
          { id: 'intent-2', helperNickname: 'Helper B' } as any,
        ],
      });

      await useTaskStore.getState().fetchIntents('task-123');

      const state = useTaskStore.getState();
      expect(state.intents).toHaveLength(2);
      expect(state.isLoadingIntents).toBe(false);
    });
  });

  describe('selectHelper', () => {
    it('updates task status and intent statuses (Req 6.5)', async () => {
      useTaskStore.setState({
        tasks: [{ id: 'task-123', status: 'open' } as any],
        currentTask: { id: 'task-123', status: 'open' } as any,
        intents: [
          { id: 'intent-1', helperId: 'user-1', status: 'pending' } as any,
          { id: 'intent-2', helperId: 'user-2', status: 'pending' } as any,
        ],
      });

      const updatedTask = {
        id: 'task-123',
        status: 'in_progress',
        selectedHelperId: 'user-1',
      } as any;

      mockTaskService.selectHelper.mockResolvedValue(updatedTask);

      await useTaskStore.getState().selectHelper('task-123', 'user-1');

      const state = useTaskStore.getState();
      expect(state.currentTask!.status).toBe('in_progress');
      expect(state.intents[0].status).toBe('selected');
      expect(state.intents[1].status).toBe('rejected');
      expect(state.tasks[0].status).toBe('in_progress');
    });
  });

  describe('setFilter', () => {
    it('updates filter state (Req 5.5)', () => {
      useTaskStore.getState().setFilter({ type: 'shopping', minReward: 50 });

      const state = useTaskStore.getState();
      expect(state.filter.type).toBe('shopping');
      expect(state.filter.minReward).toBe(50);
      expect(state.filter.radius).toBe(10); // preserved from initial state
    });

    it('merges with existing filter', () => {
      useTaskStore.setState({
        filter: { type: 'delivery', radius: 10 },
      });

      useTaskStore.getState().setFilter({ maxReward: 1000 });

      const state = useTaskStore.getState();
      expect(state.filter.type).toBe('delivery');
      expect(state.filter.maxReward).toBe(1000);
    });
  });

  describe('clearCurrentTask', () => {
    it('clears current task and intents', () => {
      useTaskStore.setState({
        currentTask: { id: 'task-123' } as any,
        intents: [{ id: 'intent-1' } as any],
      });

      useTaskStore.getState().clearCurrentTask();

      const state = useTaskStore.getState();
      expect(state.currentTask).toBeNull();
      expect(state.intents).toEqual([]);
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useTaskStore.setState({ error: 'Some error' });

      useTaskStore.getState().clearError();

      expect(useTaskStore.getState().error).toBeNull();
    });
  });
});
