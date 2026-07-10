/**
 * TaskImageUploader
 *
 * A self-managed multi-image uploader for the task form. The source of truth
 * is the `value` array of remote S3 URLs (passed up via onChange), so adding
 * and removing stay perfectly in sync — unlike the batch-callback ImagePicker.
 *
 * Uploads go to the `tasks/` S3 folder via uploadService.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import { Button, Text, IconButton, ActivityIndicator, Surface, useTheme } from 'react-native-paper';
import * as ExpoImagePicker from 'expo-image-picker';
import { uploadService } from '../../services/uploadService';
import { inferMimeType, validateImage, ALLOWED_MIME_TYPES } from '../common/imagePickerUtils';

export interface TaskImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  max?: number;
  maxFileSizeMB?: number;
  /** Override the default "任务图片（可选，最多 N 张）" label, e.g. to mark required. */
  label?: string;
}

export default function TaskImageUploader({
  value,
  onChange,
  disabled = false,
  max = 9,
  maxFileSizeMB = 5,
  label,
}: TaskImageUploaderProps) {
  const theme = useTheme();
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Map clean remote URL -> local asset uri, so freshly uploaded (private) images
  // can be previewed locally instead of hitting the private S3 object (which 403s).
  const [previewByUrl, setPreviewByUrl] = useState<Record<string, string>>({});

  const remaining = max - value.length - uploadingCount;
  const canAddMore = remaining > 0 && !disabled;

  const pickAndUpload = useCallback(async () => {
    setError(null);

    const permission = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('需要相册访问权限才能选择图片');
      return;
    }

    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: max > 1,
      selectionLimit: Math.max(1, remaining),
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    const assets = result.assets.slice(0, remaining);
    const uploadedUrls: string[] = [];

    for (const asset of assets) {
      const mimeType = asset.mimeType || inferMimeType(asset.uri);
      const fileSize = asset.fileSize || 0;
      const fileName = asset.fileName || `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

      const validationError = validateImage(mimeType, fileSize, maxFileSizeMB, ALLOWED_MIME_TYPES);
      if (validationError) {
        setError(validationError);
        continue;
      }

      setUploadingCount((c) => c + 1);
      try {
        const url = await uploadService.uploadImage({ uri: asset.uri, fileName, mimeType, folder: 'tasks' });
        uploadedUrls.push(url);
        // Remember the local uri for instant, auth-free preview
        setPreviewByUrl((prev) => ({ ...prev, [url]: asset.uri }));
      } catch {
        setError('图片上传失败，请重试');
      } finally {
        setUploadingCount((c) => Math.max(0, c - 1));
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...value, ...uploadedUrls]);
    }
  }, [max, remaining, maxFileSizeMB, value, onChange]);

  const removeImage = useCallback(
    (url: string) => {
      onChange(value.filter((u) => u !== url));
    },
    [value, onChange]
  );

  return (
    <View style={styles.container}>
      <Text variant="labelLarge" style={styles.label}>
        {label ?? `任务图片（可选，最多 ${max} 张）`}
      </Text>

      {(value.length > 0 || uploadingCount > 0) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
          {value.map((url) => (
            <Surface key={url} style={styles.imageCard} elevation={1}>
              <Image source={{ uri: previewByUrl[url] || url }} style={styles.image} accessibilityLabel="已上传的任务图片" />
              <IconButton
                icon="close-circle"
                size={20}
                style={styles.removeBtn}
                onPress={() => removeImage(url)}
                disabled={disabled}
                accessibilityLabel="删除图片"
              />
            </Surface>
          ))}
          {Array.from({ length: uploadingCount }).map((_, i) => (
            <Surface key={`uploading-${i}`} style={[styles.imageCard, styles.uploadingCard]} elevation={1}>
              <ActivityIndicator accessibilityLabel="图片上传中" />
            </Surface>
          ))}
        </ScrollView>
      )}

      {error && (
        <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}

      {canAddMore && (
        <Button
          mode="outlined"
          icon="image-plus"
          onPress={pickAndUpload}
          disabled={disabled}
          style={styles.addBtn}
          accessibilityLabel="添加任务图片"
        >
          添加图片（{value.length}/{max}）
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  label: { marginBottom: 8 },
  previewRow: { gap: 8, paddingVertical: 4 },
  imageCard: { width: 90, height: 90, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  uploadingCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F0' },
  image: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: -6, right: -6, margin: 0 },
  error: { marginVertical: 4 },
  addBtn: { marginTop: 8 },
});
