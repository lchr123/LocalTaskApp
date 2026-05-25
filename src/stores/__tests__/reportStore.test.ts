/**
 * Unit Tests for Report Store
 *
 * Tests reportStore state management including report submission,
 * upload progress tracking, and error handling.
 *
 * Validates:
 * - Requirement 9.3: Submit report and show confirmation
 * - Requirement 9.4: Track image upload progress
 */

import { useReportStore } from '../reportStore';
import { reportService } from '../../services/reportService';

// Mock the report service
jest.mock('../../services/reportService', () => ({
  reportService: {
    submitReport: jest.fn(),
    uploadImage: jest.fn(),
  },
}));

const mockReportService = reportService as jest.Mocked<typeof reportService>;

describe('ReportStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state between tests
    useReportStore.getState().reset();
  });

  describe('submitReport', () => {
    it('submits report and updates state (Req 9.3)', async () => {
      const mockReport = {
        id: 'report-1',
        reporterId: 'user-1',
        targetType: 'user' as const,
        targetId: 'user-bad',
        type: 'harassment' as const,
        description: '骚扰行为描述',
        imageUrls: [],
        status: 'submitted' as const,
        createdAt: '2025-01-15T10:00:00Z',
      };
      mockReportService.submitReport.mockResolvedValue(mockReport);

      const result = await useReportStore.getState().submitReport({
        targetType: 'user',
        targetId: 'user-bad',
        type: 'harassment',
        description: '骚扰行为描述',
        imageUrls: [],
      });

      const state = useReportStore.getState();
      expect(state.isSubmitting).toBe(false);
      expect(state.lastSubmittedReport).toEqual(mockReport);
      expect(state.error).toBeNull();
      expect(result.id).toBe('report-1');
    });

    it('sets isSubmitting to true during submission', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockReportService.submitReport.mockReturnValue(pendingPromise as Promise<never>);

      const submitPromise = useReportStore.getState().submitReport({
        targetType: 'task',
        targetId: 'task-1',
        type: 'fake_task',
        description: '虚假任务',
        imageUrls: [],
      });

      expect(useReportStore.getState().isSubmitting).toBe(true);

      resolvePromise!({
        id: 'report-1',
        reporterId: 'user-1',
        targetType: 'task',
        targetId: 'task-1',
        type: 'fake_task',
        description: '虚假任务',
        imageUrls: [],
        status: 'submitted',
        createdAt: '2025-01-15T10:00:00Z',
      });

      await submitPromise;
      expect(useReportStore.getState().isSubmitting).toBe(false);
    });

    it('sets error on submission failure', async () => {
      mockReportService.submitReport.mockRejectedValue(
        new Error('提交举报失败')
      );

      await expect(
        useReportStore.getState().submitReport({
          targetType: 'user',
          targetId: 'user-bad',
          type: 'fraud',
          description: '欺诈行为',
          imageUrls: [],
        })
      ).rejects.toThrow('提交举报失败');

      const state = useReportStore.getState();
      expect(state.isSubmitting).toBe(false);
      expect(state.error).toBe('提交举报失败');
    });
  });

  describe('upload progress tracking', () => {
    it('initializes upload progress for multiple images', () => {
      const uris = ['file:///img1.jpg', 'file:///img2.jpg', 'file:///img3.jpg'];

      useReportStore.getState().initUploadProgress(uris);

      const state = useReportStore.getState();
      expect(state.uploadProgress).toHaveLength(3);
      expect(state.uploadProgress[0]).toEqual({
        uri: 'file:///img1.jpg',
        progress: 0,
        status: 'pending',
      });
      expect(state.overallProgress).toBe(0);
    });

    it('updates progress for a specific image (Req 9.4)', () => {
      useReportStore.getState().initUploadProgress([
        'file:///img1.jpg',
        'file:///img2.jpg',
      ]);

      useReportStore.getState().setImageUploadProgress('file:///img1.jpg', {
        status: 'uploading',
        progress: 0.5,
      });

      const state = useReportStore.getState();
      expect(state.uploadProgress[0].status).toBe('uploading');
      expect(state.uploadProgress[0].progress).toBe(0.5);
      expect(state.uploadProgress[1].status).toBe('pending');
      expect(state.overallProgress).toBe(0.25); // (0.5 + 0) / 2
    });

    it('calculates overall progress correctly', () => {
      useReportStore.getState().initUploadProgress([
        'file:///img1.jpg',
        'file:///img2.jpg',
        'file:///img3.jpg',
      ]);

      useReportStore.getState().setImageUploadProgress('file:///img1.jpg', {
        status: 'success',
        progress: 1,
      });
      useReportStore.getState().setImageUploadProgress('file:///img2.jpg', {
        status: 'uploading',
        progress: 0.5,
      });

      const state = useReportStore.getState();
      // (1 + 0.5 + 0) / 3 = 0.5
      expect(state.overallProgress).toBe(0.5);
    });

    it('tracks error state for failed uploads', () => {
      useReportStore.getState().initUploadProgress(['file:///img1.jpg']);

      useReportStore.getState().setImageUploadProgress('file:///img1.jpg', {
        status: 'error',
        error: '图片上传失败',
      });

      const state = useReportStore.getState();
      expect(state.uploadProgress[0].status).toBe('error');
      expect(state.uploadProgress[0].error).toBe('图片上传失败');
    });

    it('clears upload progress', () => {
      useReportStore.getState().initUploadProgress([
        'file:///img1.jpg',
        'file:///img2.jpg',
      ]);

      useReportStore.getState().clearUploadProgress();

      const state = useReportStore.getState();
      expect(state.uploadProgress).toHaveLength(0);
      expect(state.overallProgress).toBe(0);
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useReportStore.setState({ error: 'Some error' });

      useReportStore.getState().clearError();

      expect(useReportStore.getState().error).toBeNull();
    });
  });

  describe('reset', () => {
    it('resets store to initial state', () => {
      useReportStore.setState({
        isSubmitting: true,
        uploadProgress: [
          { uri: 'file:///img.jpg', progress: 0.5, status: 'uploading' },
        ],
        overallProgress: 0.5,
        error: 'Some error',
        lastSubmittedReport: {
          id: 'report-1',
          reporterId: 'user-1',
          targetType: 'user',
          targetId: 'user-bad',
          type: 'harassment',
          description: 'test',
          imageUrls: [],
          status: 'submitted',
          createdAt: '2025-01-15T10:00:00Z',
        },
      });

      useReportStore.getState().reset();

      const state = useReportStore.getState();
      expect(state.isSubmitting).toBe(false);
      expect(state.uploadProgress).toHaveLength(0);
      expect(state.overallProgress).toBe(0);
      expect(state.error).toBeNull();
      expect(state.lastSubmittedReport).toBeNull();
    });
  });
});
