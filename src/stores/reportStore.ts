/**
 * Report Store (Zustand)
 *
 * Manages report-related state for the LocalTask platform.
 * Handles report submission status and image upload progress.
 *
 * Requirements covered:
 * - 9.3: Submit report and show confirmation
 * - 9.4: Track image upload progress
 */

import { create } from 'zustand';
import { Report, ReportType } from '../types/report';
import { reportService, CreateReportPayload } from '../services/reportService';

/**
 * Individual image upload progress entry
 */
export interface ImageUploadProgress {
  uri: string;
  progress: number; // 0-1
  status: 'pending' | 'uploading' | 'success' | 'error';
  remoteUrl?: string;
  error?: string;
}

/**
 * Report store state interface
 */
interface ReportState {
  /** Whether a report submission is in progress */
  isSubmitting: boolean;
  /** Per-image upload progress tracking */
  uploadProgress: ImageUploadProgress[];
  /** Overall upload progress (0-1), computed from individual images */
  overallProgress: number;
  /** Error message from the last failed operation */
  error: string | null;
  /** The last successfully submitted report */
  lastSubmittedReport: Report | null;

  // Actions

  /** Submit a complete report with pre-uploaded image URLs */
  submitReport: (payload: CreateReportPayload) => Promise<Report>;
  /** Set upload progress for a specific image by URI */
  setImageUploadProgress: (uri: string, update: Partial<ImageUploadProgress>) => void;
  /** Initialize upload progress tracking for a batch of images */
  initUploadProgress: (uris: string[]) => void;
  /** Clear all upload progress */
  clearUploadProgress: () => void;
  /** Clear error state */
  clearError: () => void;
  /** Reset the entire store to initial state */
  reset: () => void;
}

/**
 * Calculate overall progress from individual image progress entries
 */
function calculateOverallProgress(uploads: ImageUploadProgress[]): number {
  if (uploads.length === 0) return 0;
  const total = uploads.reduce((sum, u) => sum + u.progress, 0);
  return total / uploads.length;
}

/**
 * Report Store
 *
 * Central state management for report submission and image upload tracking.
 * Uses Zustand for lightweight, TypeScript-friendly state management.
 */
export const useReportStore = create<ReportState>((set, get) => ({
  // Initial state
  isSubmitting: false,
  uploadProgress: [],
  overallProgress: 0,
  error: null,
  lastSubmittedReport: null,

  /**
   * Submit a report to the backend.
   *
   * Requirement 9.3: Submit report and display "举报已收到" confirmation.
   */
  submitReport: async (payload: CreateReportPayload) => {
    set({ isSubmitting: true, error: null });

    try {
      const report = await reportService.submitReport(payload);
      set({
        isSubmitting: false,
        lastSubmittedReport: report,
      });
      return report;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '提交举报失败';
      set({ isSubmitting: false, error: message });
      throw error;
    }
  },

  /**
   * Initialize upload progress tracking for a batch of image URIs.
   * Called before starting uploads to set up the progress state.
   */
  initUploadProgress: (uris: string[]) => {
    const progress: ImageUploadProgress[] = uris.map((uri) => ({
      uri,
      progress: 0,
      status: 'pending',
    }));
    set({ uploadProgress: progress, overallProgress: 0 });
  },

  /**
   * Update upload progress for a specific image.
   *
   * Requirement 9.4: Track upload progress for each image.
   */
  setImageUploadProgress: (uri: string, update: Partial<ImageUploadProgress>) => {
    set((state) => {
      const updatedProgress = state.uploadProgress.map((item) =>
        item.uri === uri ? { ...item, ...update } : item
      );
      return {
        uploadProgress: updatedProgress,
        overallProgress: calculateOverallProgress(updatedProgress),
      };
    });
  },

  /**
   * Clear all upload progress (e.g., when starting a new report)
   */
  clearUploadProgress: () => {
    set({ uploadProgress: [], overallProgress: 0 });
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Reset the entire store to initial state
   */
  reset: () => {
    set({
      isSubmitting: false,
      uploadProgress: [],
      overallProgress: 0,
      error: null,
      lastSubmittedReport: null,
    });
  },
}));
