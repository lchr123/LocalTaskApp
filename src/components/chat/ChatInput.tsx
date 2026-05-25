/**
 * ChatInput Component
 *
 * Input bar for the chat room supporting:
 * - Text input with 1000 character limit
 * - Image sending (JPEG/PNG, ≤10MB) via image picker
 * - Send button that activates when text is non-empty
 * - Character count indicator when approaching limit
 *
 * Requirements covered:
 * - 7.2: Support text messages up to 1000 characters
 * - 7.3: Support JPEG/PNG images up to 10MB
 * - 7.7: Block send and show restriction for oversized/wrong format
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TextInput, Platform } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import * as ExpoImagePicker from 'expo-image-picker';
import { VALIDATION } from '../../utils/constants';
import {
  validateImageFormat,
  validateImageSize,
  ALLOWED_MIME_TYPES,
  BYTES_PER_MB,
  inferMimeType,
  getFormatErrorMessage,
  getSizeErrorMessage,
} from '../common/imagePickerUtils';

export interface ChatInputProps {
  /** Callback when user sends a text message */
  onSendText: (content: string) => void;
  /** Callback when user sends an image message */
  onSendImage: (imageUri: string) => void;
  /** Whether the input is disabled (e.g., disconnected) */
  disabled?: boolean;
}

/**
 * ChatInput provides the message composition interface at the bottom of the chat room.
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  onSendText,
  onSendImage,
  disabled = false,
}) => {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const maxLength = VALIDATION.CHAT_MESSAGE_MAX;
  const charCount = text.length;
  const isNearLimit = charCount > maxLength * 0.9;
  const isOverLimit = charCount > maxLength;
  const canSend = text.trim().length > 0 && !isOverLimit && !disabled;

  /**
   * Handle text change with character limit enforcement.
   */
  const handleTextChange = useCallback(
    (value: string) => {
      setText(value);
      if (error) setError(null);
    },
    [error]
  );

  /**
   * Handle send button press.
   * Validates text length before sending.
   */
  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isOverLimit || disabled) return;

    onSendText(trimmed);
    setText('');
    setError(null);
  }, [text, isOverLimit, disabled, onSendText]);

  /**
   * Handle image picker button press.
   * Validates format and size before sending.
   *
   * Requirement 7.3: JPEG/PNG, ≤10MB
   * Requirement 7.7: Block and show restriction message
   */
  const handlePickImage = useCallback(async () => {
    if (disabled) return;

    setError(null);

    const permissionResult =
      await ExpoImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setError('需要相册访问权限才能发送图片');
      return;
    }

    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType || inferMimeType(asset.uri);
    const fileSize = asset.fileSize || 0;

    // Validate format
    if (!validateImageFormat(mimeType, ALLOWED_MIME_TYPES)) {
      setError(getFormatErrorMessage(mimeType));
      return;
    }

    // Validate size
    if (!validateImageSize(fileSize, VALIDATION.CHAT_IMAGE_MAX_SIZE_MB)) {
      setError(getSizeErrorMessage(fileSize, VALIDATION.CHAT_IMAGE_MAX_SIZE_MB));
      return;
    }

    onSendImage(asset.uri);
  }, [disabled, onSendImage]);

  return (
    <View style={styles.wrapper}>
      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text
            variant="bodySmall"
            style={[styles.errorText, { color: theme.colors.error }]}
            accessibilityLabel={`错误: ${error}`}
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        </View>
      )}

      {/* Input row */}
      <View style={styles.container}>
        {/* Image picker button */}
        <IconButton
          icon="image"
          size={24}
          onPress={handlePickImage}
          disabled={disabled}
          style={styles.imageButton}
          accessibilityLabel="发送图片"
          accessibilityHint="从相册选择图片发送"
        />

        {/* Text input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.textInput,
              isOverLimit && { borderColor: theme.colors.error },
            ]}
            value={text}
            onChangeText={handleTextChange}
            placeholder="输入消息..."
            placeholderTextColor="#9E9E9E"
            multiline
            maxLength={maxLength + 10} // Allow slight overflow for UX, but block send
            editable={!disabled}
            accessibilityLabel="消息输入框"
            accessibilityHint={`最多输入${maxLength}个字符`}
          />
          {/* Character count (shown when near limit) */}
          {isNearLimit && (
            <Text
              style={[
                styles.charCount,
                isOverLimit && { color: theme.colors.error },
              ]}
              accessibilityLabel={`已输入${charCount}个字符，最多${maxLength}个`}
            >
              {charCount}/{maxLength}
            </Text>
          )}
        </View>

        {/* Send button */}
        <IconButton
          icon="send"
          size={24}
          onPress={handleSend}
          disabled={!canSend}
          iconColor={canSend ? theme.colors.primary : '#BDBDBD'}
          style={styles.sendButton}
          accessibilityLabel="发送消息"
          accessibilityHint="点击发送文字消息"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 2,
  },
  errorText: {
    fontSize: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  imageButton: {
    margin: 0,
    marginBottom: Platform.OS === 'ios' ? 2 : 0,
  },
  inputContainer: {
    flex: 1,
    position: 'relative',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 40,
    color: '#212121',
  },
  charCount: {
    position: 'absolute',
    bottom: 2,
    right: 12,
    fontSize: 10,
    color: '#9E9E9E',
  },
  sendButton: {
    margin: 0,
    marginBottom: Platform.OS === 'ios' ? 2 : 0,
  },
});

export default ChatInput;
