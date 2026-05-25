/**
 * Report Service
 *
 * Encapsulates all report-related API calls including:
 * - Submitting a report (user or task)
 * - Uploading evidence images
 *
 * Requirements covered:
 * - 9.3: Submit report with type and description
 * - 9.4: Upload up to 5 screenshots (max 5MB each, JPG/PNG)
 */

import apiClient from './api';
import { Report, ReportType } from '../types/report';
import { API_ENDPOINTS } from '../utils/constants';
import { DEV_MOCK_AUTH } from '../config/aws-config';
import { mockDelay } from './mockData';

/**
 * Payload for creating a new report
 */
export interface CreateReportPayload {
  targetType: 'user' | 'task';
  targetId: string;
  type: ReportType;
  description: string;
  imageUrls: string[];
}

/**
 * Response from the image upload endpoint
 */
export interface ImageUploadResponse {
  url: string;
}

/**
 * Options for image upload with progress tracking
 */
export interface UploadImageOptions {
  uri: string;
  fileName: string;
  mimeType: string;
  onProgress?: (progress: number) => void;
}

class ReportService {
  /**
   * Submit a report against a user or task.
   *
   * Requirement 9.3: Submit report with type and description filled.
   * Returns the created report with status 'submitted'.
   */
  async submitReport(payload: CreateReportPayload): Promise<Report> {
    if (DEV_MOCK_AUTH) {
      await mockDelay();
      const report: Report = {
        id: 'report-' + Date.now(),
        reporterId: 'user-001',
        targetType: payload.targetType,
        targetId: payload.targetId,
        type: payload.type,
        description: payload.description,
        imageUrls: payload.imageUrls,
        status: 'submitted',
        createdAt: new Date().toISOString(),
      };
      return report;
    }

    const response = await apiClient.post<Report>(
      API_ENDPOINTS.REPORTS,
      payload
    );
    return response.data;
  }

  async uploadImage(options: UploadImageOptions): Promise<string> {
    if (DEV_MOCK_AUTH) {
      // Simulate upload progress
      const { onProgress } = options;
      await mockDelay(200);
      onProgress?.(0.3);
      await mockDelay(200);
      onProgress?.(0.7);
      await mockDelay(200);
      onProgress?.(1.0);
      return `https://mock-cdn.example.com/uploads/${Date.now()}.jpg`;
    }

    const { uri, fileName, mimeType, onProgress } = options;

    const formData = new FormData();
    formData.append('image', {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    const response = await apiClient.post<ImageUploadResponse>(
      API_ENDPOINTS.UPLOAD_IMAGE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = progressEvent.loaded / progressEvent.total;
            onProgress(progress);
          }
        },
      }
    );

    return response.data.url;
  }
}

export const reportService = new ReportService();
