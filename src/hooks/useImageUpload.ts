/**
 * useImageUpload Hook
 *
 * Encapsulates image selection, validation, compression, and upload logic
 * for the report module. Integrates with expo-image-picker for selection
 * and reportService for uploading.
 *
 * Requirements covered:
 * - 9.4: Upload up to 5 screenshots, max 5MB each, JPG/PNG only
 */

import { useState, useCallback } from 'react';
import * as ExpoImagePicker from 'expo-image-picker';
import { reportService } from '../services/reportService';
import { useReportStore } from '../stores/reportStore';
import { VALIDATION } from '../utils/constants';
import {
  validateImageFormat,
  validateImageSize,
  getFormatErrorMessage,
  getSizeErrorMessage,
  getMaxImagesErrorMessage,
  inferMimeType,
  ALLOWED_MIME_TYPES,
} from '../components/common/imagePickerUtils';

/**
 * Represents a selected image ready for upload
 */
export interface SelectedImageFile {
  uri: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Result of the image upload process
 */
export interface UploadResult {
  uri: string;
  remoteUrl: string;
}

/**
 * Options for the useImageUpload hook
 */
export interface UseImageUploadOptions {
  /** Maximum number of images allowed (default: 5 for reports) */
  maxImages?: number;
  /** Maximum file size in MB (default: 5 for reports) */
  maxFileSizeMB?: number;
  /** Image quality for compression (0-1, default: 0.8) */
  quality?: number;
}

/**
 * Return type of the useImageUpload hook
 */
export interface UseImageUploadReturn {
  /** Currently selected images (local URIs) */
  selectedImages: SelectedImageFile[];
  /** URLs of successfully uploaded images */
  uploadedUrls: string[];
  /** Whether any upload is in progress */
  isUploading: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Pick images from the device gallery */
  pickFromGallery: () => Promise<void>;
  /** Take a photo with the camera */
  pickFromCamera: () => Promise<void>;
  /** Remove a selected image by index */
  removeImage: (index: number) => void;
  /** Upload all selected images and return their remote URLs */
  uploadAll: () => Promise<string[]>;
  /** Clear all selected images and reset state */
  reset: () => void;
}

/**
 * Hook for managing image selection, validation, compression, and upload.
 *
 * Integrates with:
 * - expo-image-picker for image selection (gallery/camera)
 * - reportService for uploading to the backend
 * - reportStore for tracking upload progress
 *
 * Image compression is handled via expo-image-picker's quality option,
 * which reduces file size while maintaining acceptable visual quality.
 */
export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const {
    maxImages = VALIDATION.REPORT_IMAGE_MAX_COUNT,
    maxFileSizeMB = VALIDATION.REPORT_IMAGE_MAX_SIZE_MB,
    quality = 0.8,
  } = options;

  const [selectedImages, setSelectedImages] = useState<SelectedImageFile[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setImageUploadProgress, initUploadProgress, clearUploadProgress } =
    useReportStore();

  /**
   * Validate and process selected image assets from expo-image-picker.
   * Filters out images that don't meet format or size requirements.
   */
  const processAssets = useCallback(
    (assets: ExpoImagePicker.ImagePickerAsset[]): SelectedImageFile[] => {
      const currentCount = selectedImages.length;
      const availableSlots = maxImages - currentCount;

      if (availableSlots <= 0) {
        setError(getMaxImagesErrorMessage(maxImages));
        return [];
      }

      const assetsToProcess = assets.slice(0, availableSlots);
      if (assets.length > availableSlots) {
        setError(getMaxImagesErrorMessage(maxImages));
      }

      const validImages: SelectedImageFile[] = [];

      for (const asset of assetsToProcess) {
        const mimeType = asset.mimeType || inferMimeType(asset.uri);
        const fileSize = asset.fileSize || 0;
        const fileName = asset.fileName || `report_image_${Date.now()}.jpg`;

        // Validate format
        if (!validateImageFormat(mimeType, ALLOWED_MIME_TYPES)) {
          setError(getFormatErrorMessage(mimeType));
          continue;
        }

        // Validate size
        if (!validateImageSize(fileSize, maxFileSizeMB)) {
          setError(getSizeErrorMessage(fileSize, maxFileSizeMB));
          continue;
        }

        validImages.push({ uri: asset.uri, fileName, fileSize, mimeType });
      }

      return validImages;
    },
    [selectedImages.length, maxImages, maxFileSizeMB]
  );

  /**
   * Pick images from the device gallery.
   * Uses expo-image-picker with quality compression.
   *
   * Requirement 9.4: Support JPG/PNG, max 5MB per image.
   */
  const pickFromGallery = useCallback(async () => {
    setError(null);

    const permissionResult =
      await ExpoImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setError('需要相册访问权限才能选择图片。');
      return;
    }

    const remainingSlots = maxImages - selectedImages.length;
    if (remainingSlots <= 0) {
      setError(getMaxImagesErrorMessage(maxImages));
      return;
    }

    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality,
    });

    if (!result.canceled && result.assets.length > 0) {
      const validImages = processAssets(result.assets);
      if (validImages.length > 0) {
        setSelectedImages((prev) => [...prev, ...validImages]);
      }
    }
  }, [maxImages, selectedImages.length, quality, processAssets]);

  /**
   * Take a photo with the camera.
   * Uses expo-image-picker with quality compression.
   *
   * Requirement 9.4: Support JPG/PNG, max 5MB per image.
   */
  const pickFromCamera = useCallback(async () => {
    setError(null);

    const permissionResult =
      await ExpoImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      setError('需要相机访问权限才能拍照。');
      return;
    }

    if (selectedImages.length >= maxImages) {
      setError(getMaxImagesErrorMessage(maxImages));
      return;
    }

    const result = await ExpoImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality,
    });

    if (!result.canceled && result.assets.length > 0) {
      const validImages = processAssets(result.assets);
      if (validImages.length > 0) {
        setSelectedImages((prev) => [...prev, ...validImages]);
      }
    }
  }, [maxImages, selectedImages.length, quality, processAssets]);

  /**
   * Remove a selected image by index.
   * Also removes the corresponding uploaded URL if it exists.
   */
  const removeImage = useCallback((index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setUploadedUrls((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }, []);

  /**
   * Upload all selected images to the backend.
   * Tracks progress via reportStore for UI display.
   *
   * Requirement 9.4: Upload images as report evidence.
   * Returns an array of remote URLs for successfully uploaded images.
   */
  const uploadAll = useCallback(async (): Promise<string[]> => {
    if (selectedImages.length === 0) {
      return [];
    }

    setIsUploading(true);
    setError(null);

    // Initialize progress tracking in the store
    const uris = selectedImages.map((img) => img.uri);
    initUploadProgress(uris);

    const urls: string[] = [];

    for (const image of selectedImages) {
      setImageUploadProgress(image.uri, { status: 'uploading', progress: 0 });

      try {
        const remoteUrl = await reportService.uploadImage({
          uri: image.uri,
          fileName: image.fileName,
          mimeType: image.mimeType,
          onProgress: (progress) => {
            setImageUploadProgress(image.uri, { progress });
          },
        });

        setImageUploadProgress(image.uri, {
          status: 'success',
          progress: 1,
          remoteUrl,
        });
        urls.push(remoteUrl);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '图片上传失败';
        setImageUploadProgress(image.uri, {
          status: 'error',
          error: errorMessage,
        });
        setError(errorMessage);
      }
    }

    setUploadedUrls(urls);
    setIsUploading(false);
    return urls;
  }, [selectedImages, initUploadProgress, setImageUploadProgress]);

  /**
   * Reset all state (selected images, uploaded URLs, errors, progress)
   */
  const reset = useCallback(() => {
    setSelectedImages([]);
    setUploadedUrls([]);
    setIsUploading(false);
    setError(null);
    clearUploadProgress();
  }, [clearUploadProgress]);

  return {
    selectedImages,
    uploadedUrls,
    isUploading,
    error,
    pickFromGallery,
    pickFromCamera,
    removeImage,
    uploadAll,
    reset,
  };
}
