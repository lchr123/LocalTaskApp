/**
 * Unit Tests for Task Service
 *
 * Tests taskService methods for task CRUD, intent operations, and helper selection.
 *
 * Validates:
 * - Requirement 4.1, 4.3: Task creation
 * - Requirement 5.1: Fetch nearby tasks
 * - Requirement 6.1: Submit intent
 * - Requirement 6.5: Select helper
 * - Requirement 6.8: Withdraw intent
 */

import { taskService } from '../taskService';
import apiClient from '../api';

// Mock the api client
jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('TaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchTasks', () => {
    it('fetches tasks with location and default params (Req 5.1)', async () => {
      const mockResponse = {
        data: {
          tasks: [{ id: 'task-1', type: 'delivery', description: 'Test task' }],
          page: 1,
          totalPages: 3,
          totalCount: 50,
        },
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await taskService.fetchTasks({
        lat: 35.6762,
        lng: 139.6503,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/tasks', {
        params: {
          lat: 35.6762,
          lng: 139.6503,
          radius: 10,
          page: 1,
          pageSize: 20,
        },
      });
      expect(result.tasks).toHaveLength(1);
      expect(result.totalPages).toBe(3);
    });

    it('passes filter parameters when provided (Req 5.5)', async () => {
      const mockResponse = {
        data: {
          tasks: [],
          page: 1,
          totalPages: 0,
          totalCount: 0,
        },
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      await taskService.fetchTasks({
        lat: 35.6762,
        lng: 139.6503,
        radius: 5,
        type: 'delivery',
        minReward: 100,
        maxReward: 500,
        page: 2,
        pageSize: 10,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/tasks', {
        params: {
          lat: 35.6762,
          lng: 139.6503,
          radius: 5,
          type: 'delivery',
          minReward: 100,
          maxReward: 500,
          page: 2,
          pageSize: 10,
        },
      });
    });

    it('throws error when API call fails', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network Error'));

      await expect(
        taskService.fetchTasks({ lat: 35.6762, lng: 139.6503 })
      ).rejects.toThrow('Network Error');
    });
  });

  describe('fetchTaskDetail', () => {
    it('fetches task detail by ID (Req 5.3)', async () => {
      const mockTask = {
        id: 'task-123',
        type: 'delivery',
        description: 'Deliver a package',
        status: 'open',
      };
      mockApiClient.get.mockResolvedValue({ data: mockTask });

      const result = await taskService.fetchTaskDetail('task-123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/tasks/task-123');
      expect(result.id).toBe('task-123');
    });

    it('throws error when task not found', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Not Found'));

      await expect(
        taskService.fetchTaskDetail('nonexistent')
      ).rejects.toThrow('Not Found');
    });
  });

  describe('createTask', () => {
    it('creates a task with valid payload (Req 4.1, 4.3)', async () => {
      const payload = {
        type: 'delivery' as const,
        description: 'Please deliver this document to the office',
        location: {
          address: '東京都渋谷区',
          latitude: 35.6580,
          longitude: 139.7016,
        },
        reward: 500,
        deadline: '2025-01-20T18:00:00Z',
      };

      const mockCreatedTask = { id: 'new-task-1', ...payload, status: 'open' };
      mockApiClient.post.mockResolvedValue({ data: mockCreatedTask });

      const result = await taskService.createTask(payload);

      expect(mockApiClient.post).toHaveBeenCalledWith('/tasks', payload);
      expect(result.id).toBe('new-task-1');
      expect(result.status).toBe('open');
    });

    it('throws error when creation fails', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Validation Error'));

      await expect(
        taskService.createTask({
          type: 'delivery',
          description: 'Short',
          location: { address: 'Test', latitude: 0, longitude: 0 },
          reward: 100,
          deadline: '2025-01-20T18:00:00Z',
        })
      ).rejects.toThrow('Validation Error');
    });
  });

  describe('submitIntent', () => {
    it('submits intent with message (Req 6.1, 6.2)', async () => {
      const mockIntent = {
        id: 'intent-1',
        taskId: 'task-123',
        helperId: 'user-456',
        status: 'pending',
        message: 'I can help with this!',
      };
      mockApiClient.post.mockResolvedValue({ data: mockIntent });

      const result = await taskService.submitIntent('task-123', 'I can help with this!');

      expect(mockApiClient.post).toHaveBeenCalledWith('/tasks/task-123/intents', {
        message: 'I can help with this!',
      });
      expect(result.id).toBe('intent-1');
      expect(result.status).toBe('pending');
    });

    it('submits intent without message', async () => {
      const mockIntent = {
        id: 'intent-2',
        taskId: 'task-123',
        helperId: 'user-789',
        status: 'pending',
      };
      mockApiClient.post.mockResolvedValue({ data: mockIntent });

      const result = await taskService.submitIntent('task-123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/tasks/task-123/intents', {
        message: undefined,
      });
      expect(result.id).toBe('intent-2');
    });

    it('throws error on duplicate intent (Req 6.6)', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Intent already exists'));

      await expect(
        taskService.submitIntent('task-123', 'Duplicate')
      ).rejects.toThrow('Intent already exists');
    });
  });

  describe('withdrawIntent', () => {
    it('withdraws an intent (Req 6.8)', async () => {
      mockApiClient.delete.mockResolvedValue({ data: {} });

      await taskService.withdrawIntent('task-123', 'intent-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/tasks/task-123/intents/intent-1'
      );
    });

    it('throws error when withdrawal fails', async () => {
      mockApiClient.delete.mockRejectedValue(new Error('Not Found'));

      await expect(
        taskService.withdrawIntent('task-123', 'nonexistent')
      ).rejects.toThrow('Not Found');
    });
  });

  describe('fetchIntents', () => {
    it('fetches intent list for a task (Req 6.3, 6.4)', async () => {
      const mockIntents = {
        intents: [
          {
            id: 'intent-1',
            helperId: 'user-1',
            helperNickname: 'Helper A',
            helperRating: 4.5,
            helperCompletedCount: 12,
            message: 'Available now',
            status: 'pending',
          },
          {
            id: 'intent-2',
            helperId: 'user-2',
            helperNickname: 'Helper B',
            helperRating: 4.8,
            helperCompletedCount: 25,
            status: 'pending',
          },
        ],
      };
      mockApiClient.get.mockResolvedValue({ data: mockIntents });

      const result = await taskService.fetchIntents('task-123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/tasks/task-123/intents');
      expect(result.intents).toHaveLength(2);
    });
  });

  describe('selectHelper', () => {
    it('selects a helper and returns updated task (Req 6.5)', async () => {
      const mockUpdatedTask = {
        id: 'task-123',
        status: 'in_progress',
        selectedHelperId: 'user-1',
      };
      mockApiClient.post.mockResolvedValue({ data: mockUpdatedTask });

      const result = await taskService.selectHelper('task-123', 'user-1');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/tasks/task-123/select-helper',
        { helperId: 'user-1' }
      );
      expect(result.status).toBe('in_progress');
      expect(result.selectedHelperId).toBe('user-1');
    });

    it('throws error when selection fails', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Task not in open state'));

      await expect(
        taskService.selectHelper('task-123', 'user-1')
      ).rejects.toThrow('Task not in open state');
    });
  });
});
