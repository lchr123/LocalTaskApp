/**
 * Create Report Screen
 *
 * Form for submitting a report against a user or task.
 * Displays target info, report type selection, description input,
 * and screenshot upload with validation.
 *
 * Requirements covered:
 * - 9.1: Display report form with target info, type selection, and description
 * - 9.2: Report type options (虚假任务、骚扰行为、欺诈行为、不当内容、其他)
 * - 9.3: Submit report and show "举报已收到" confirmation
 * - 9.4: Upload up to 5 screenshots (max 5MB each, JPG/PNG)
 * - 9.5: Required field validation (type and description)
 * - 9.6: File size/format error messages
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  RadioButton,
  Snackbar,
  HelperText,
  Surface,
  Divider,
  useTheme,
  ProgressBar,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useReportStore } from '../../stores/reportStore';
import { useImageUpload } from '../../hooks/useImageUpload';
import { ReportType } from '../../types/report';
import { REPORT_TYPE_LABELS, VALIDATION } from '../../utils/constants';
import ImagePicker from '../../components/common/ImagePicker';

// ─── Route Params ────────────────────────────────────────────────────────────

type CreateReportRouteParams = {
  CreateReport: {
    targetType: 'user' | 'task';
    targetId: string;
    targetName: string;
  };
};

// ─── Form Schema ─────────────────────────────────────────────────────────────

const reportTypes = ['fake_task', 'harassment', 'fraud', 'inappropriate_content', 'other'] as const;

const formSchema = z.object({
  type: z.enum(reportTypes, { message: '请选择举报类型' }),
  description: z
    .string()
    .min(1, '描述为必填项')
    .max(VALIDATION.REPORT_DESCRIPTION_MAX, `描述最多${VALIDATION.REPORT_DESCRIPTION_MAX}个字符`),
});

type FormData = z.infer<typeof formSchema>;

// ─── Report Type Options ─────────────────────────────────────────────────────

const REPORT_TYPE_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'fake_task', label: REPORT_TYPE_LABELS.fake_task },
  { value: 'harassment', label: REPORT_TYPE_LABELS.harassment },
  { value: 'fraud', label: REPORT_TYPE_LABELS.fraud },
  { value: 'inappropriate_content', label: REPORT_TYPE_LABELS.inappropriate_content },
  { value: 'other', label: REPORT_TYPE_LABELS.other },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateReportScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<CreateReportRouteParams, 'CreateReport'>>();

  const { targetType, targetId, targetName } = route.params;

  const { submitReport, isSubmitting, overallProgress } = useReportStore();

  const {
    selectedImages,
    uploadedUrls,
    isUploading,
    error: imageError,
    pickFromGallery,
    pickFromCamera,
    removeImage,
    uploadAll,
    reset: resetImages,
  } = useImageUpload({
    maxImages: VALIDATION.REPORT_IMAGE_MAX_COUNT,
    maxFileSizeMB: VALIDATION.REPORT_IMAGE_MAX_SIZE_MB,
  });

  const [successVisible, setSuccessVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: undefined,
      description: '',
    },
  });

  /**
   * Handle form submission.
   * Uploads images first, then submits the report.
   *
   * Requirement 9.3: Submit report and display "举报已收到" confirmation.
   */
  const onSubmit = useCallback(
    async (data: FormData) => {
      setSubmitError(null);

      try {
        // Upload images if any are selected
        let imageUrls: string[] = [];
        if (selectedImages.length > 0) {
          imageUrls = await uploadAll();
        }

        // Submit the report
        await submitReport({
          targetType,
          targetId,
          type: data.type,
          description: data.description,
          imageUrls,
        });

        // Show success confirmation
        setSuccessVisible(true);

        // Navigate back after showing confirmation
        setTimeout(() => {
          resetImages();
          navigation.goBack();
        }, 2000);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : '提交举报失败，请稍后重试';
        setSubmitError(message);
      }
    },
    [
      selectedImages,
      uploadAll,
      submitReport,
      targetType,
      targetId,
      resetImages,
      navigation,
    ]
  );

  const targetTypeLabel = targetType === 'user' ? '用户' : '任务';
  const isProcessing = isSubmitting || isUploading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      accessibilityLabel="举报页面"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text
          variant="headlineMedium"
          style={styles.title}
          accessibilityLabel="提交举报"
          accessibilityRole="header"
        >
          提交举报
        </Text>

        {/* Target Info (Requirement 9.1) */}
        <Surface style={styles.targetCard} elevation={1}>
          <Text
            variant="labelLarge"
            style={styles.sectionLabel}
            accessibilityLabel="被举报对象信息"
          >
            被举报对象
          </Text>
          <View style={styles.targetInfo}>
            <Text variant="bodyMedium" accessibilityLabel={`举报对象类型: ${targetTypeLabel}`}>
              类型：{targetTypeLabel}
            </Text>
            <Text variant="bodyMedium" accessibilityLabel={`举报对象名称: ${targetName}`}>
              名称：{targetName}
            </Text>
          </View>
        </Surface>

        <Divider style={styles.divider} />

        {/* Report Type Selection (Requirement 9.2) */}
        <View style={styles.section}>
          <Text
            variant="labelLarge"
            style={styles.sectionLabel}
            accessibilityLabel="举报类型（必填）"
          >
            举报类型 *
          </Text>

          <Controller
            control={control}
            name="type"
            render={({ field: { onChange, value } }) => (
              <RadioButton.Group
                onValueChange={(newValue) => onChange(newValue as ReportType)}
                value={value || ''}
              >
                {REPORT_TYPE_OPTIONS.map((option) => (
                  <RadioButton.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                    style={styles.radioItem}
                    labelStyle={styles.radioLabel}
                    accessibilityLabel={`举报类型: ${option.label}`}
                    disabled={isProcessing}
                  />
                ))}
              </RadioButton.Group>
            )}
          />

          {errors.type && (
            <HelperText
              type="error"
              visible
              accessibilityLabel={`举报类型错误: ${errors.type.message}`}
              accessibilityLiveRegion="polite"
            >
              {errors.type.message}
            </HelperText>
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Description Input (Requirement 9.1, 9.5) */}
        <View style={styles.section}>
          <Text
            variant="labelLarge"
            style={styles.sectionLabel}
            accessibilityLabel="举报描述（必填）"
          >
            描述 *
          </Text>

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                mode="outlined"
                placeholder="请详细描述举报原因..."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={5}
                maxLength={VALIDATION.REPORT_DESCRIPTION_MAX}
                style={styles.descriptionInput}
                error={!!errors.description}
                disabled={isProcessing}
                accessibilityLabel="举报描述输入框"
                accessibilityHint={`最多${VALIDATION.REPORT_DESCRIPTION_MAX}个字符`}
              />
            )}
          />

          <View style={styles.descriptionFooter}>
            {errors.description ? (
              <HelperText
                type="error"
                visible
                style={styles.helperText}
                accessibilityLabel={`描述错误: ${errors.description.message}`}
                accessibilityLiveRegion="polite"
              >
                {errors.description.message}
              </HelperText>
            ) : (
              <View />
            )}
            <Controller
              control={control}
              name="description"
              render={({ field: { value } }) => (
                <Text
                  variant="bodySmall"
                  style={styles.charCount}
                  accessibilityLabel={`已输入 ${value?.length || 0} 个字符，最多 ${VALIDATION.REPORT_DESCRIPTION_MAX} 个字符`}
                >
                  {value?.length || 0}/{VALIDATION.REPORT_DESCRIPTION_MAX}
                </Text>
              )}
            />
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Screenshot Upload (Requirement 9.4, 9.6) */}
        <View style={styles.section}>
          <Text
            variant="labelLarge"
            style={styles.sectionLabel}
            accessibilityLabel="截图证据（可选）"
          >
            截图证据（可选）
          </Text>
          <Text
            variant="bodySmall"
            style={styles.hint}
            accessibilityLabel={`最多上传${VALIDATION.REPORT_IMAGE_MAX_COUNT}张图片，每张不超过${VALIDATION.REPORT_IMAGE_MAX_SIZE_MB}MB，支持JPG和PNG格式`}
          >
            最多{VALIDATION.REPORT_IMAGE_MAX_COUNT}张，每张≤{VALIDATION.REPORT_IMAGE_MAX_SIZE_MB}MB，支持JPG/PNG
          </Text>

          <ImagePicker
            maxImages={VALIDATION.REPORT_IMAGE_MAX_COUNT}
            maxFileSizeMB={VALIDATION.REPORT_IMAGE_MAX_SIZE_MB}
            label=""
            disabled={isProcessing}
            onImagesSelected={() => {}}
          />

          {imageError && (
            <Text
              variant="bodySmall"
              style={[styles.imageError, { color: theme.colors.error }]}
              accessibilityLabel={`图片错误: ${imageError}`}
              accessibilityLiveRegion="polite"
            >
              {imageError}
            </Text>
          )}
        </View>

        {/* Upload Progress */}
        {isUploading && (
          <View style={styles.progressSection} accessibilityLabel="图片上传中">
            <Text variant="bodySmall" style={styles.progressLabel}>
              正在上传图片...
            </Text>
            <ProgressBar
              progress={overallProgress}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
          </View>
        )}

        {/* Submit Error */}
        {submitError && (
          <View
            style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}
            accessibilityLabel="提交错误提示"
            accessibilityRole="alert"
          >
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onErrorContainer }}
            >
              {submitError}
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isProcessing}
          disabled={isProcessing}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
          accessibilityLabel="提交举报"
          accessibilityHint="提交举报信息"
        >
          提交举报
        </Button>
      </ScrollView>

      {/* Success Snackbar (Requirement 9.3) */}
      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={2000}
        style={styles.snackbar}
        accessibilityLabel="举报已收到确认提示"
      >
        ✅ 举报已收到，我们会尽快处理。
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  targetCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  targetInfo: {
    gap: 4,
  },
  section: {
    marginVertical: 8,
  },
  sectionLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
  },
  radioItem: {
    paddingVertical: 2,
  },
  radioLabel: {
    fontSize: 15,
  },
  descriptionInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  descriptionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  helperText: {
    flex: 1,
    paddingHorizontal: 0,
  },
  charCount: {
    opacity: 0.6,
    textAlign: 'right',
  },
  hint: {
    opacity: 0.6,
    marginBottom: 8,
  },
  imageError: {
    marginTop: 4,
  },
  progressSection: {
    marginVertical: 12,
  },
  progressLabel: {
    marginBottom: 4,
    opacity: 0.7,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  snackbar: {
    marginBottom: 16,
  },
});
