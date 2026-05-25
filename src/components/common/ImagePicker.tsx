/**
 * ImagePicker Component
 *
 * A reusable image picker component that supports:
 * - Camera and gallery image selection via expo-image-picker
 * - JPEG/PNG format validation
 * - Configurable max file size (default 10MB for chat, 5MB for reports)
 * - Configurable max number of images (default 1 for chat, 5 for reports)
 * - Upload progress display
 * - Retry on upload failure
 * - Clear error messages for format/size violations
 *
 * Validates: Requirements 7.3, 7.7, 9.4, 9.6
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import {
  Button,
  Text,
  IconButton,
  ProgressBar,
  Surface,
  useTheme,
} from 'react-native-paper';
import * as ExpoImagePicker from 'expo-image-picker';
import {
  SelectedImage,
  UploadedImage,
  ImageUploadStatus,
  ImageUploadState,
  ImagePickerProps,
  ALLOWED_MIME_TYPES,
  MAX_RETRY_ATTEMPTS,
  validateImageFormat,
  validateImageSize,
  getFormatErrorMessage,
  getSizeErrorMessage,
  getMaxImagesErrorMessage,
  inferMimeType,
} from './imagePickerUtils';

// Re-export types for consumers
export type {
  SelectedImage,
  UploadedImage,
  ImageUploadStatus,
  ImageUploadState,
  ImagePickerProps,
};
export {
  validateImageFormat,
  validateImageSize,
  getFormatErrorMessage,
  getSizeErrorMessage,
  getMaxImagesErrorMessage,
};

// --- Default Upload Function (stub) ---

async function defaultUploadImage(
  _image: SelectedImage,
  onProgress: (progress: number) => void
): Promise<string> {
  // Simulate upload progress
  for (let i = 0; i <= 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    onProgress(i / 10);
  }
  return `https://api.localtask.example.com/uploads/${Date.now()}`;
}

// --- Component ---

export function ImagePicker({
  maxFileSizeMB = 10,
  maxImages = 1,
  allowedFormats = ALLOWED_MIME_TYPES,
  onImagesUploaded,
  onImagesSelected,
  uploadImage = defaultUploadImage,
  disabled = false,
  label = '添加图片',
}: ImagePickerProps) {
  const theme = useTheme();
  const [uploads, setUploads] = useState<ImageUploadState[]>([]);
  const [error, setError] = useState<string | null>(null);

  const updateUploadState = useCallback(
    (index: number, update: Partial<ImageUploadState>) => {
      setUploads((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], ...update };
        return next;
      });
    },
    []
  );

  const performUpload = useCallback(
    async (image: SelectedImage, index: number) => {
      updateUploadState(index, { status: 'uploading', progress: 0, error: undefined });

      let attempts = 0;
      while (attempts < MAX_RETRY_ATTEMPTS) {
        try {
          const remoteUrl = await uploadImage(image, (progress) => {
            updateUploadState(index, { progress });
          });
          updateUploadState(index, { status: 'success', progress: 1 });
          return remoteUrl;
        } catch (err) {
          attempts++;
          if (attempts >= MAX_RETRY_ATTEMPTS) {
            const errorMessage =
              err instanceof Error ? err.message : '上传失败，请重试';
            updateUploadState(index, {
              status: 'error',
              error: errorMessage,
            });
            return null;
          }
          // Wait before retry with exponential backoff
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
      return null;
    },
    [uploadImage, updateUploadState]
  );

  const handleRetry = useCallback(
    async (index: number) => {
      const upload = uploads[index];
      if (!upload) return;

      const remoteUrl = await performUpload(upload.image, index);
      if (remoteUrl && onImagesUploaded) {
        const successfulUploads = uploads
          .filter((u, i) => (i === index ? true : u.status === 'success'))
          .map((u) => ({ uri: u.image.uri, remoteUrl: '' }));
        // Update the current one
        successfulUploads[successfulUploads.findIndex((_, i) => i === index)] = {
          uri: upload.image.uri,
          remoteUrl,
        };
        onImagesUploaded(
          successfulUploads.filter((u) => u.remoteUrl !== '')
        );
      }
    },
    [uploads, performUpload, onImagesUploaded]
  );

  const processSelectedAssets = useCallback(
    async (assets: ExpoImagePicker.ImagePickerAsset[]) => {
      setError(null);

      const currentCount = uploads.length;
      const availableSlots = maxImages - currentCount;

      if (availableSlots <= 0) {
        setError(getMaxImagesErrorMessage(maxImages));
        return;
      }

      const assetsToProcess = assets.slice(0, availableSlots);
      if (assets.length > availableSlots) {
        setError(getMaxImagesErrorMessage(maxImages));
      }

      const validImages: SelectedImage[] = [];

      for (const asset of assetsToProcess) {
        const mimeType = asset.mimeType || inferMimeType(asset.uri);
        const fileSize = asset.fileSize || 0;
        const fileName = asset.fileName || `image_${Date.now()}.jpg`;

        // Validate format
        if (!validateImageFormat(mimeType, allowedFormats)) {
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

      if (validImages.length === 0) return;

      // Notify about selected images
      const allSelected = [
        ...uploads.map((u) => u.image),
        ...validImages,
      ];
      onImagesSelected?.(allSelected);

      // Add to uploads state and start uploading
      const startIndex = uploads.length;
      const newUploads: ImageUploadState[] = validImages.map((image) => ({
        image,
        status: 'idle' as ImageUploadStatus,
        progress: 0,
      }));

      setUploads((prev) => [...prev, ...newUploads]);

      // Start uploads
      const uploadResults: UploadedImage[] = [];
      for (let i = 0; i < validImages.length; i++) {
        const remoteUrl = await performUpload(validImages[i], startIndex + i);
        if (remoteUrl) {
          uploadResults.push({ uri: validImages[i].uri, remoteUrl });
        }
      }

      if (uploadResults.length > 0 && onImagesUploaded) {
        onImagesUploaded(uploadResults);
      }
    },
    [
      uploads,
      maxImages,
      maxFileSizeMB,
      allowedFormats,
      onImagesSelected,
      onImagesUploaded,
      performUpload,
    ]
  );

  const pickFromGallery = useCallback(async () => {
    const permissionResult =
      await ExpoImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setError('需要相册访问权限才能选择图片。');
      return;
    }

    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: maxImages > 1,
      selectionLimit: maxImages - uploads.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      await processSelectedAssets(result.assets);
    }
  }, [maxImages, uploads.length, processSelectedAssets]);

  const pickFromCamera = useCallback(async () => {
    const permissionResult =
      await ExpoImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      setError('需要相机访问权限才能拍照。');
      return;
    }

    const result = await ExpoImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      await processSelectedAssets(result.assets);
    }
  }, [processSelectedAssets]);

  const removeImage = useCallback(
    (index: number) => {
      setUploads((prev) => {
        const next = prev.filter((_, i) => i !== index);
        onImagesSelected?.(next.map((u) => u.image));
        return next;
      });
      setError(null);
    },
    [onImagesSelected]
  );

  const canAddMore = uploads.length < maxImages && !disabled;

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="labelLarge" style={styles.label}>
          {label}
        </Text>
      )}

      {/* Image previews */}
      {uploads.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.previewScroll}
          contentContainerStyle={styles.previewContainer}
        >
          {uploads.map((upload, index) => (
            <Surface key={`${upload.image.uri}-${index}`} style={styles.imageCard} elevation={1}>
              <Image
                source={{ uri: upload.image.uri }}
                style={styles.imagePreview}
                accessibilityLabel={`已选择的图片 ${index + 1}`}
              />

              {/* Remove button */}
              <IconButton
                icon="close-circle"
                size={20}
                style={styles.removeButton}
                onPress={() => removeImage(index)}
                accessibilityLabel={`删除图片 ${index + 1}`}
                disabled={disabled}
              />

              {/* Upload progress */}
              {upload.status === 'uploading' && (
                <View style={styles.progressOverlay}>
                  <ProgressBar
                    progress={upload.progress}
                    color={theme.colors.primary}
                    style={styles.progressBar}
                  />
                  <Text variant="labelSmall" style={styles.progressText}>
                    {Math.round(upload.progress * 100)}%
                  </Text>
                </View>
              )}

              {/* Error state with retry */}
              {upload.status === 'error' && (
                <View style={styles.errorOverlay}>
                  <IconButton
                    icon="refresh"
                    size={24}
                    iconColor={theme.colors.error}
                    onPress={() => handleRetry(index)}
                    accessibilityLabel={`重试上传图片 ${index + 1}`}
                  />
                  <Text
                    variant="labelSmall"
                    style={[styles.errorText, { color: theme.colors.error }]}
                    numberOfLines={2}
                  >
                    {upload.error || '上传失败'}
                  </Text>
                </View>
              )}

              {/* Success indicator */}
              {upload.status === 'success' && (
                <View style={styles.successOverlay}>
                  <IconButton
                    icon="check-circle"
                    size={20}
                    iconColor={theme.colors.primary}
                    style={styles.successIcon}
                    accessibilityLabel={`图片 ${index + 1} 上传成功`}
                  />
                </View>
              )}
            </Surface>
          ))}
        </ScrollView>
      )}

      {/* Error message */}
      {error && (
        <Text
          variant="bodySmall"
          style={[styles.errorMessage, { color: theme.colors.error }]}
          accessibilityLabel={`错误: ${error}`}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}

      {/* Action buttons */}
      {canAddMore && (
        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            icon="image"
            onPress={pickFromGallery}
            style={styles.actionButton}
            disabled={disabled}
            accessibilityLabel="从相册选择图片"
          >
            相册
          </Button>
          <Button
            mode="outlined"
            icon="camera"
            onPress={pickFromCamera}
            style={styles.actionButton}
            disabled={disabled}
            accessibilityLabel="拍照"
          >
            拍照
          </Button>
        </View>
      )}

      {/* Image count indicator */}
      {maxImages > 1 && (
        <Text
          variant="bodySmall"
          style={styles.countText}
          accessibilityLabel={`已选择 ${uploads.length} 张图片，最多 ${maxImages} 张`}
        >
          {uploads.length}/{maxImages}
        </Text>
      )}
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    marginBottom: 8,
  },
  previewScroll: {
    marginBottom: 8,
  },
  previewContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  imageCard: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    margin: 0,
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    padding: 4,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
  },
  progressText: {
    marginTop: 2,
    fontSize: 10,
  },
  errorOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    paddingBottom: 4,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 10,
    paddingHorizontal: 4,
  },
  successOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  successIcon: {
    margin: 0,
  },
  errorMessage: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  countText: {
    marginTop: 4,
    textAlign: 'right',
    opacity: 0.6,
  },
});

export default ImagePicker;
