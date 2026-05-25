/**
 * Unit Tests for Report Service
 *
 * Tests reportService methods for submitting reports and uploading images.
 *
 * Validates:
 * - Requirement 9.3: Submit report with type and description
 * - Requirement 9.4: Upload evidence images with progress tracking
 */

import { reportService } from '../reportService';
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

describe('ReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitReport', () => {
    it('submits a report with all fields (Req 9.3)', async () => {
      const mockReport = {
        id: 'report-1',
        reporterId: 'user-1',
        targetType: 'user' as const,
        targetId: 'user-bad',
        type: 'harassment' as const,
        description: '该用户多次发送骚扰消息',
        imageUrls: ['https://example.com/img1.jpg'],
        status: 'submitted' as const,
        createdAt: '2025-01-15T10:00:00Z',
      };
      mockApiClient.post.mockResolvedValue({ data: mockReport });

      const result = await reportService.submitReport({
        targetType: 'user',
        targetId: 'user-bad',
        type: 'harassment',
        description: '该用户多次发送骚扰消息',
        imageUrls: ['https://example.com/img1.jpg'],
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/reports', {
        targetType: 'user',
        targetId: 'user-bad',
        type: 'harassment',
        description: '该用户多次发送骚扰消息',
        imageUrls: ['https://example.com/img1.jpg'],
      });
      expect(result.id).toBe('report-1');
      expect(result.status).toBe('submitted');
    });

    it('submits a report against a task (Req 9.3)', async () => {
      const mockReport = {
        id: 'report-2',
        reporterId: 'user-1',
        targetType: 'task' as const,
        targetId: 'task-fake',
        type: 'fake_task' as const,
        description: '该任务信息虚假，地址不存在',
        imageUrls: [],
        status: 'submitted' as const,
        createdAt: '2025-01-15T11:00:00Z',
      };
      mockApiClient.post.mockResolvedValue({ data: mockReport });

      const result = await reportService.submitReport({
        targetType: 'task',
        targetId: 'task-fake',
        type: 'fake_task',
        description: '该任务信息虚假，地址不存在',
        imageUrls: [],
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/reports', {
        targetType: 'task',
        targetId: 'task-fake',
        type: 'fake_task',
        description: '该任务信息虚假，地址不存在',
        imageUrls: [],
      });
      expect(result.type).toBe('fake_task');
      expect(result.targetType).toBe('task');
    });

    it('throws error when submission fails', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Network Error'));

      await expect(
        reportService.submitReport({
          targetType: 'user',
          targetId: 'user-bad',
          type: 'fraud',
          description: '欺诈行为',
          imageUrls: [],
        })
      ).rejects.toThrow('Network Error');
    });
  });

  describe('uploadImage', () => {
    it('uploads an image and returns the remote URL (Req 9.4)', async () => {
      mockApiClient.post.mockResolvedValue({
        data: { url: 'https://api.localtask.example.com/uploads/img123.jpg' },
      });

      const result = await reportService.uploadImage({
        uri: 'file:///local/image.jpg',
        fileName: 'image.jpg',
        mimeType: 'image/jpeg',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/upload/image',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
      expect(result).toBe('https://api.localtask.example.com/uploads/img123.jpg');
    });

    it('calls onProgress callback during upload', async () => {
      // Capture the onUploadProgress callback
      mockApiClient.post.mockImplementation((_url, _data, config) => {
        // Simulate progress events
        if (config?.onUploadProgress) {
          config.onUploadProgress({ loaded: 50, total: 100, bytes: 50 });
          config.onUploadProgress({ loaded: 100, total: 100, bytes: 100 });
        }
        return Promise.resolve({
          data: { url: 'https://api.localtask.example.com/uploads/img.jpg' },
        });
      });

      const onProgress = jest.fn();

      await reportService.uploadImage({
        uri: 'file:///local/image.png',
        fileName: 'image.png',
        mimeType: 'image/png',
        onProgress,
      });

      expect(onProgress).toHaveBeenCalledWith(0.5);
      expect(onProgress).toHaveBeenCalledWith(1);
    });

    it('throws error when upload fails', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Upload failed'));

      await expect(
        reportService.uploadImage({
          uri: 'file:///local/image.jpg',
          fileName: 'image.jpg',
          mimeType: 'image/jpeg',
        })
      ).rejects.toThrow('Upload failed');
    });
  });
});
