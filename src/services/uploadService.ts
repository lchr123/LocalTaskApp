import apiClient from './api';
import { API_ENDPOINTS } from '../utils/constants';
import {
  Platform
} from 'react-native';

export interface ImageUploadResponse {
  url: string;
}

export interface UploadImageOptions {
  uri: string;
  fileName: string;
  mimeType: string;
  onProgress?: (progress: number) => void;
}

class UploadService {
  async uploadImage(options: UploadImageOptions): Promise<string> {
    const { uri, fileName, mimeType, onProgress } = options;

    const formData = new FormData();

    if (Platform.OS === 'web') {
      const blob = await fetch(uri).then((res) => res.blob());

      const file = new File(
        [blob],
        fileName,
        {
          type: mimeType || blob.type || 'image/jpeg',
        }
      );

      formData.append('image', file);
    } else {
      formData.append('image', {
        uri,
        name: fileName,
        type: mimeType,
      } as any);
    }


    const response = await apiClient.post<ImageUploadResponse>(
      API_ENDPOINTS.UPLOAD_IMAGE,
      formData,
      {
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            onProgress(progressEvent.loaded / progressEvent.total);
          }
        },
      }
    );

    return response.data.url;
  }
}

export const uploadService = new UploadService();