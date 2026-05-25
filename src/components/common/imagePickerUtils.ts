/**
 * ImagePicker Utility Functions
 *
 * Pure validation and helper functions for the ImagePicker component.
 * Separated from the component for testability without React Native dependencies.
 *
 * Validates: Requirements 7.3, 7.7, 9.4, 9.6
 */

// --- Types ---

export interface SelectedImage {
  uri: string;
  fileName: string;
  fileSize: number; // bytes
  mimeType: string;
}

export interface UploadedImage {
  uri: string;
  remoteUrl: string;
}

export type ImageUploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface ImageUploadState {
  image: SelectedImage;
  status: ImageUploadStatus;
  progress: number; // 0-1
  error?: string;
}

export interface ImagePickerProps {
  /** Maximum file size in MB (default: 10 for chat) */
  maxFileSizeMB?: number;
  /** Maximum number of images allowed (default: 1 for chat) */
  maxImages?: number;
  /** Allowed MIME types (default: JPEG and PNG) */
  allowedFormats?: string[];
  /** Callback when images are successfully uploaded */
  onImagesUploaded?: (images: UploadedImage[]) => void;
  /** Callback when selected images change (before upload) */
  onImagesSelected?: (images: SelectedImage[]) => void;
  /** Custom upload function. Returns the remote URL on success. */
  uploadImage?: (image: SelectedImage, onProgress: (progress: number) => void) => Promise<string>;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Label for the component */
  label?: string;
}

// --- Constants ---

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
export const BYTES_PER_MB = 1024 * 1024;
export const MAX_RETRY_ATTEMPTS = 3;

// --- Validation Functions ---

/**
 * Validates that the image MIME type is in the allowed formats list.
 * Req 7.3: Support JPEG/PNG format
 * Req 9.4: Support JPG and PNG format
 */
export function validateImageFormat(mimeType: string, allowedFormats: string[]): boolean {
  return allowedFormats.includes(mimeType);
}

/**
 * Validates that the image file size does not exceed the maximum.
 * Req 7.3: Max 10MB for chat images
 * Req 9.4: Max 5MB per screenshot for reports
 */
export function validateImageSize(fileSize: number, maxSizeMB: number): boolean {
  return fileSize <= maxSizeMB * BYTES_PER_MB;
}

// --- Error Message Functions ---

/**
 * Returns a user-facing error message for unsupported image format.
 * Req 7.7: Show restriction message for wrong format
 * Req 9.6: Show error indicating format requirements
 */
export function getFormatErrorMessage(mimeType: string): string {
  return `不支持的图片格式 (${mimeType})。仅支持 JPEG 和 PNG 格式。`;
}

/**
 * Returns a user-facing error message for oversized images.
 * Req 7.7: Show restriction message for images over 10MB
 * Req 9.6: Show error indicating file size requirements
 */
export function getSizeErrorMessage(fileSize: number, maxSizeMB: number): string {
  const fileSizeMB = (fileSize / BYTES_PER_MB).toFixed(2);
  return `图片大小 (${fileSizeMB}MB) 超过限制。最大允许 ${maxSizeMB}MB。`;
}

/**
 * Returns a user-facing error message when max image count is reached.
 * Req 9.4: Max 5 screenshots for reports
 */
export function getMaxImagesErrorMessage(maxImages: number): string {
  return `最多只能选择 ${maxImages} 张图片。`;
}

// --- Helper Functions ---

/**
 * Infers MIME type from file URI extension.
 * Used as fallback when expo-image-picker doesn't provide mimeType.
 */
export function inferMimeType(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'image/unknown';
  }
}

/**
 * Validates a single image against format and size constraints.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateImage(
  mimeType: string,
  fileSize: number,
  maxSizeMB: number,
  allowedFormats: string[]
): string | null {
  if (!validateImageFormat(mimeType, allowedFormats)) {
    return getFormatErrorMessage(mimeType);
  }
  if (!validateImageSize(fileSize, maxSizeMB)) {
    return getSizeErrorMessage(fileSize, maxSizeMB);
  }
  return null;
}
