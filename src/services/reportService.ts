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
import {
  uploadService,
  UploadImageOptions,
} from './uploadService';

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

class ReportService {
  /**
   * Submit a report against a user or task.
   *
   * Requirement 9.3: Submit report with type and description filled.
   * Returns the created report with status 'submitted'.
   */
  async submitReport(payload: CreateReportPayload): Promise<Report> {
    const response = await apiClient.post<Report>(
      API_ENDPOINTS.REPORTS,
      payload
    );
    return response.data;
  }

  async uploadImage(options: UploadImageOptions): Promise<string> {
    return uploadService.uploadImage(options);
  }
}

export const reportService = new ReportService();
