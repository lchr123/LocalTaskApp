/**
 * Task Form Component
 *
 * Reusable form for creating a new task.
 * Uses React Hook Form + Zod for validation, React Native Paper for UI.
 *
 * Requirements covered:
 * - 4.1: Task creation form with required fields
 * - 4.2: Task type selection (dropdown)
 * - 4.4: Highlight missing required fields with error messages
 * - 4.6: Validate reward range (0.01–99999.99)
 * - 4.7: Validate deadline is in the future
 * - 4A.1-4A.8: Location picker with map and geocoding
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  useTheme,
  HelperText,
  Menu,
  TouchableRipple,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTaskFormSchema, CreateTaskFormData } from '../../utils/validation';
import { TASK_TYPE_LABELS } from '../../utils/constants';
import { TaskType } from '../../types/task';
import LocationPicker, { LocationValue } from './LocationPicker';

// Conditionally import DateTimePicker (not available on web)
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaskFormProps {
  /** Called when form is submitted with valid data */
  onSubmit: (data: CreateTaskFormData) => Promise<void>;
  /** Whether the form is in a loading/submitting state */
  isLoading?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'delivery', label: TASK_TYPE_LABELS.delivery },
  { value: 'pet_care', label: TASK_TYPE_LABELS.pet_care },
  { value: 'translation', label: TASK_TYPE_LABELS.translation },
  { value: 'moving', label: TASK_TYPE_LABELS.moving },
  { value: 'airport_transfer', label: TASK_TYPE_LABELS.airport_transfer },
  { value: 'childcare', label: TASK_TYPE_LABELS.childcare },
  { value: 'other', label: TASK_TYPE_LABELS.other },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function TaskForm({ onSubmit, isLoading = false }: TaskFormProps) {
  const theme = useTheme();
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskFormSchema),
    defaultValues: {
      type: undefined,
      description: '',
      location: {
        address: '',
        latitude: 0,
        longitude: 0,
      },
      deadline: '',
      reward: undefined,
    },
    mode: 'onBlur',
  });

  const selectedType = watch('type');
  const selectedDeadline = watch('deadline');

  /**
   * Get display label for the selected task type
   */
  const getTypeLabel = useCallback((type: string | undefined): string => {
    if (!type) return '';
    return TASK_TYPE_LABELS[type as TaskType] || '';
  }, []);

  /**
   * Format a date string for display
   */
  const formatDeadlineDisplay = useCallback((dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  }, []);

  /**
   * Generate a default deadline (2 hours from now) for the date picker
   */
  const getDefaultDeadline = useCallback((): string => {
    const date = new Date();
    date.setHours(date.getHours() + 2);
    // Format as datetime-local compatible string
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, []);

  /**
   * Handle date selection via text input (ISO format)
   * Since there's no native date picker library installed,
   * we use a TextInput that accepts datetime format.
   */
  const handleDateSelect = useCallback(() => {
    if (!selectedDeadline) {
      // Set a default value 2 hours from now
      setValue('deadline', getDefaultDeadline(), { shouldValidate: true });
    }
    setShowDatePicker(true);
  }, [selectedDeadline, setValue, getDefaultDeadline]);

  /**
   * Handle form submission
   */
  const onFormSubmit = useCallback(
    async (data: CreateTaskFormData) => {
      await onSubmit(data);
    },
    [onSubmit]
  );

  return (
    <View style={styles.formContainer}>
      {/* Task Type Dropdown (Requirement 4.2) */}
      <Controller
        control={control}
        name="type"
        render={({ field: { onChange, value } }) => (
          <View style={styles.fieldContainer}>
            <Menu
              visible={typeMenuVisible}
              onDismiss={() => setTypeMenuVisible(false)}
              anchor={
                <TouchableRipple
                  onPress={() => setTypeMenuVisible(true)}
                  disabled={isLoading}
                  accessibilityLabel="任务类型选择"
                  accessibilityHint="点击选择任务类型"
                  accessibilityRole="button"
                >
                  <TextInput
                    label="任务类型 *"
                    value={getTypeLabel(value)}
                    mode="outlined"
                    editable={false}
                    error={!!errors.type}
                    right={<TextInput.Icon icon="chevron-down" />}
                    pointerEvents="none"
                    accessibilityLabel="任务类型"
                  />
                </TouchableRipple>
              }
              anchorPosition="bottom"
            >
              {TASK_TYPE_OPTIONS.map((option) => (
                <Menu.Item
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setTypeMenuVisible(false);
                  }}
                  title={option.label}
                  accessibilityLabel={`选择${option.label}`}
                />
              ))}
            </Menu>
            {errors.type && (
              <HelperText
                type="error"
                visible={!!errors.type}
                accessibilityLabel="任务类型错误提示"
              >
                {errors.type.message}
              </HelperText>
            )}
          </View>
        )}
      />

      {/* Description Field (Requirement 4.1: 10-500 chars) */}
      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.fieldContainer}>
            <TextInput
              label="任务描述 *"
              placeholder="请详细描述您的任务需求（10-500字符）"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              mode="outlined"
              multiline
              numberOfLines={4}
              error={!!errors.description}
              disabled={isLoading}
              maxLength={500}
              accessibilityLabel="任务描述输入框"
              accessibilityHint="请输入10到500字符的任务描述"
            />
            <View style={styles.fieldFooter}>
              {errors.description ? (
                <HelperText
                  type="error"
                  visible={!!errors.description}
                  style={styles.helperText}
                  accessibilityLabel="任务描述错误提示"
                >
                  {errors.description.message}
                </HelperText>
              ) : (
                <HelperText type="info" visible style={styles.helperText}>
                  {' '}
                </HelperText>
              )}
              <Text variant="bodySmall" style={styles.charCount}>
                {value?.length || 0}/500
              </Text>
            </View>
          </View>
        )}
      />

      {/* Location Field with Map Picker (Requirements 4A.1-4A.8) */}
      <Controller
        control={control}
        name="location"
        render={({ field: { onChange, value } }) => (
          <View style={styles.fieldContainer}>
            <LocationPicker
              value={value as LocationValue}
              onChange={(location) => onChange(location)}
              disabled={isLoading}
              error={
                errors.location?.address?.message ||
                errors.location?.latitude?.message ||
                errors.location?.longitude?.message ||
                (errors.location?.message as string | undefined)
              }
            />
          </View>
        )}
      />

      {/* Deadline Field (Requirement 4.7: must be in the future) */}
      <Controller
        control={control}
        name="deadline"
        render={({ field: { onChange, value } }) => (
          <View style={styles.fieldContainer}>
            {Platform.OS === 'web' ? (
              <>
                <Text variant="bodySmall" style={{ marginBottom: 4, color: theme.colors.onSurfaceVariant }}>
                  期望完成时间 *
                </Text>
                <input
                  type="datetime-local"
                  value={value ? value.slice(0, 16) : ''}
                  onChange={(e: any) => onChange(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    padding: '12px 12px',
                    fontSize: 16,
                    borderRadius: 4,
                    border: errors.deadline
                      ? `2px solid ${theme.colors.error}`
                      : `1px solid ${theme.colors.outline}`,
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.onSurface,
                    boxSizing: 'border-box' as any,
                    height: 56,
                    overflow: 'hidden' as any,
                  }}
                  aria-label="期望完成时间选择器"
                />
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => {
                    if (!isLoading) {
                      setDatePickerMode('date');
                      setTempDate(value ? new Date(value) : new Date(Date.now() + 2 * 60 * 60 * 1000));
                      setShowDatePicker(true);
                    }
                  }}
                  accessibilityLabel="选择期望完成时间"
                  accessibilityRole="button"
                >
                  <TextInput
                    label="期望完成时间 *"
                    value={value ? formatDeadlineDisplay(value) : ''}
                    mode="outlined"
                    editable={false}
                    error={!!errors.deadline}
                    left={<TextInput.Icon icon="clock-outline" />}
                    right={<TextInput.Icon icon="calendar" />}
                    pointerEvents="none"
                    accessibilityLabel="期望完成时间"
                  />
                </Pressable>
                {showDatePicker && DateTimePicker && (
                  <DateTimePicker
                    value={tempDate}
                    mode={datePickerMode}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={new Date()}
                    onChange={(_event: any, selectedDate?: Date) => {
                      if (Platform.OS === 'android') {
                        setShowDatePicker(false);
                      }
                      if (!selectedDate) return;

                      if (datePickerMode === 'date') {
                        // Date selected, now show time picker
                        setTempDate(selectedDate);
                        setDatePickerMode('time');
                        if (Platform.OS === 'android') {
                          setShowDatePicker(true);
                        }
                      } else {
                        // Time selected, combine and save
                        setShowDatePicker(false);
                        const year = selectedDate.getFullYear();
                        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                        const day = String(selectedDate.getDate()).padStart(2, '0');
                        const hours = String(selectedDate.getHours()).padStart(2, '0');
                        const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
                        onChange(`${year}-${month}-${day}T${hours}:${minutes}`);
                      }
                    }}
                  />
                )}
              </>
            )}
            {errors.deadline ? (
              <HelperText
                type="error"
                visible={!!errors.deadline}
                accessibilityLabel="期望完成时间错误提示"
              >
                {errors.deadline.message}
              </HelperText>
            ) : (
              <HelperText type="info" visible>
                时间必须晚于当前时间
              </HelperText>
            )}
          </View>
        )}
      />

      {/* Reward Field (Requirement 4.6: 0.01-99999.99) */}
      <Controller
        control={control}
        name="reward"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.fieldContainer}>
            <TextInput
              label="报酬金额 *"
              placeholder="0.01 - 99999.99"
              value={value !== undefined && value !== null ? String(value) : ''}
              onChangeText={(text) => {
                // Allow empty string, valid numbers, and partial decimal input
                if (text === '') {
                  onChange(undefined);
                  return;
                }
                // Allow partial input like "1." or "0."
                if (/^\d*\.?\d{0,2}$/.test(text)) {
                  const num = parseFloat(text);
                  if (!isNaN(num)) {
                    onChange(num);
                  } else if (text === '.' || text.endsWith('.')) {
                    // Keep the text but don't parse yet
                    onChange(0);
                  }
                }
              }}
              onBlur={onBlur}
              mode="outlined"
              keyboardType="decimal-pad"
              error={!!errors.reward}
              disabled={isLoading}
              left={<TextInput.Icon icon="currency-cny" />}
              right={<TextInput.Affix text="元" />}
              accessibilityLabel="报酬金额输入框"
              accessibilityHint="请输入报酬金额，范围0.01到99999.99元"
            />
            {errors.reward && (
              <HelperText
                type="error"
                visible={!!errors.reward}
                accessibilityLabel="报酬金额错误提示"
              >
                {errors.reward.message}
              </HelperText>
            )}
          </View>
        )}
      />

      {/* Submit Button (Requirement 4.3) */}
      <Button
        mode="contained"
        onPress={handleSubmit(onFormSubmit)}
        loading={isLoading}
        disabled={isLoading}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
        accessibilityLabel="发布任务按钮"
        accessibilityHint="提交任务发布表单"
      >
        发布任务
      </Button>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 12,
    overflow: 'hidden' as any,
  },
  fieldFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helperText: {
    flex: 1,
  },
  charCount: {
    opacity: 0.6,
    marginRight: 12,
  },
  menu: {
    width: '100%',
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 24,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});
