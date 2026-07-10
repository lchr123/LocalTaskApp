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
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTaskFormSchema,
  createMarketplaceFormSchema,
  CreateTaskFormData,
} from '../../utils/validation';
import { TASK_TYPE_LABELS, ITEM_CATEGORY_LABELS } from '../../utils/constants';
import { TaskKind } from '../../types/task';
import LocationPicker, { LocationValue } from './LocationPicker';
import TaskImageUploader from './TaskImageUploader';
import TaskTagSelector from './TaskTagSelector';

// Conditionally import DateTimePicker (not available on web)
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaskFormProps {
  /**
   * Which domain this form is posting to. Drives the type dropdown options,
   * which optional fields are shown, and several field labels/wording.
   */
  kind: TaskKind;
  /** Called when form is submitted with valid data */
  onSubmit: (data: CreateTaskFormData) => Promise<void>;
  /** Whether the form is in a loading/submitting state */
  isLoading?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TASK_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'full_time', label: TASK_TYPE_LABELS.full_time },
  { value: 'part_time', label: TASK_TYPE_LABELS.part_time },
  { value: 'one_time', label: TASK_TYPE_LABELS.one_time },
];

const ITEM_CATEGORY_OPTIONS: { value: string; label: string }[] = Object.entries(
  ITEM_CATEGORY_LABELS
).map(([value, label]) => ({ value, label }));

const REWARD_UNIT_OPTIONS: { value: 'once' | 'hour' | 'day' | 'month'; label: string }[] = [
  { value: 'once', label: '次' },
  { value: 'hour', label: '小时' },
  { value: 'day', label: '日' },
  { value: 'month', label: '月' },
];

const DURATION_UNIT_OPTIONS: { value: 'once' | 'day' | 'week' | 'month'; label: string }[] = [
  { value: 'once', label: '次' },
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function TaskForm({ kind, onSubmit, isLoading = false }: TaskFormProps) {
  const theme = useTheme();
  const isMarketplace = kind === 'marketplace';
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [moreVisible, setMoreVisible] = useState(false);
  const [rewardUnitMenu, setRewardUnitMenu] = useState(false);
  const [durationUnitMenu, setDurationUnitMenu] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(isMarketplace ? createMarketplaceFormSchema : createTaskFormSchema),
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
      rewardUnit: 'once',
      images: [],
      headcount: undefined,
      startTime: '',
      durationHours: undefined,
      durationUnit: undefined,
      contactMethod: '',
      tagIds: [],
    },
    mode: 'onBlur',
  });

  const selectedType = watch('type');
  const selectedDeadline = watch('deadline');

  const typeOptions = isMarketplace ? ITEM_CATEGORY_OPTIONS : TASK_TYPE_OPTIONS;
  const typeLabels = isMarketplace ? ITEM_CATEGORY_LABELS : TASK_TYPE_LABELS;

  /**
   * Get display label for the selected type (task employment length, or
   * marketplace item category, depending on `kind`).
   */
  const getTypeLabel = useCallback(
    (type: string | undefined): string => {
      if (!type) return '';
      return typeLabels[type] || '';
    },
    [typeLabels]
  );

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
      try {
        await onSubmit(data);
      } catch {
        // Submission failed — keep the form data so the user can retry.
        return;
      }
      // Reset the form to its initial state after a successful submission.
      // The publish screen lives in a tab navigator and stays mounted, so
      // without this the old values would persist when returning to the tab.
      reset();
      setMoreVisible(false);
    },
    [onSubmit, reset]
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
                <Pressable
                  onPress={() => setTypeMenuVisible(true)}
                  disabled={isLoading}
                  accessibilityLabel={isMarketplace ? '商品分类选择' : '任务类型选择'}
                  accessibilityHint={isMarketplace ? '点击选择商品分类' : '点击选择任务类型'}
                  accessibilityRole="button"
                >
                  <TextInput
                    label={isMarketplace ? '商品分类 *' : '任务类型 *'}
                    value={getTypeLabel(value)}
                    mode="outlined"
                    editable={false}
                    error={!!errors.type}
                    right={<TextInput.Icon icon="chevron-down" onPress={() => setTypeMenuVisible(true)} />}
                    pointerEvents="none"
                    accessibilityLabel={isMarketplace ? '商品分类' : '任务类型'}
                  />
                </Pressable>
              }
              anchorPosition="bottom"
            >
              {typeOptions.map((option) => (
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
              label={isMarketplace ? '商品描述 *' : '任务描述 *'}
              placeholder={
                isMarketplace
                  ? '请详细描述商品的新旧程度、规格等信息（10-500字符）'
                  : '请详细描述您的任务需求（10-500字符）'
              }
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              mode="outlined"
              multiline
              numberOfLines={4}
              error={!!errors.description}
              disabled={isLoading}
              maxLength={500}
              accessibilityLabel={isMarketplace ? '商品描述输入框' : '任务描述输入框'}
              accessibilityHint="请输入10到500字符的描述"
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
                <Text variant="bodySmall" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
                  ⏰ 截止时间 *
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <input
                    type="date"
                    value={value ? value.slice(0, 10) : ''}
                    onChange={(e: any) => {
                      const timeStr = value ? value.slice(11, 16) : '12:00';
                      onChange(`${e.target.value}T${timeStr}`);
                    }}
                    min={new Date().toISOString().slice(0, 10)}
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: errors.deadline ? `2px solid ${theme.colors.error}` : `1px solid #E0E0E0`,
                      fontSize: 14,
                      backgroundColor: '#fff',
                    }}
                    aria-label="选择日期"
                  />
                  <input
                    type="time"
                    value={value ? value.slice(11, 16) : ''}
                    onChange={(e: any) => {
                      const dateStr = value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
                      onChange(`${dateStr}T${e.target.value}`);
                    }}
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: errors.deadline ? `2px solid ${theme.colors.error}` : `1px solid #E0E0E0`,
                      fontSize: 14,
                      backgroundColor: '#fff',
                    }}
                    aria-label="选择时间"
                  />
                </View>
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
                  accessibilityLabel="选择截止时间"
                  accessibilityRole="button"
                >
                  <TextInput
                    label="截止时间 *"
                    value={value ? formatDeadlineDisplay(value) : ''}
                    mode="outlined"
                    editable={false}
                    error={!!errors.deadline}
                    left={<TextInput.Icon icon="clock-outline" />}
                    right={<TextInput.Icon icon="calendar" />}
                    pointerEvents="none"
                    accessibilityLabel="截止时间"
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
                accessibilityLabel="截止时间错误提示"
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

      {/* Reward: marketplace shows a plain price (no unit); task shows [金额] / [单位] */}
      <View style={styles.rewardRow}>
        <Controller
          control={control}
          name="reward"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={[styles.fieldContainer, isMarketplace ? styles.priceField : styles.rewardAmountField]}>
              <TextInput
                label={isMarketplace ? '价格 *' : '报酬金额 *'}
                placeholder="0 - 100000000"
                value={value !== undefined && value !== null ? String(value) : ''}
                onChangeText={(text) => {
                  if (text === '') {
                    onChange(undefined);
                    return;
                  }
                  if (/^\d+$/.test(text)) {
                    const num = parseInt(text, 10);
                    if (!isNaN(num)) onChange(num);
                  }
                }}
                onBlur={onBlur}
                mode="outlined"
                keyboardType="number-pad"
                error={!!errors.reward}
                disabled={isLoading}
                left={<TextInput.Icon icon="currency-jpy" />}
                right={<TextInput.Affix text="円" />}
                accessibilityLabel={isMarketplace ? '价格输入框' : '报酬金额输入框'}
                accessibilityHint={`请输入${isMarketplace ? '价格' : '报酬金额'}，整数，范围0到100000000円`}
              />
              {errors.reward && (
                <HelperText type="error" visible accessibilityLabel="金额错误提示">
                  {errors.reward.message}
                </HelperText>
              )}
            </View>
          )}
        />

        {!isMarketplace && (
          <>
            <Text style={styles.slash}>/</Text>
            <Controller
              control={control}
              name="rewardUnit"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.fieldContainer, styles.rewardUnitField]}>
                  <Menu
                    visible={rewardUnitMenu}
                    onDismiss={() => setRewardUnitMenu(false)}
                    anchor={
                      <Pressable
                        onPress={() => setRewardUnitMenu(true)}
                        disabled={isLoading}
                        accessibilityLabel="报酬单位选择"
                        accessibilityRole="button"
                      >
                        <TextInput
                          label="单位"
                          value={REWARD_UNIT_OPTIONS.find((o) => o.value === value)?.label || '次'}
                          mode="outlined"
                          editable={false}
                          right={<TextInput.Icon icon="chevron-down" onPress={() => setRewardUnitMenu(true)} />}
                          pointerEvents="none"
                          accessibilityLabel="报酬单位"
                        />
                      </Pressable>
                    }
                    anchorPosition="bottom"
                  >
                    {REWARD_UNIT_OPTIONS.map((option) => (
                      <Menu.Item
                        key={option.value}
                        onPress={() => {
                          onChange(option.value);
                          setRewardUnitMenu(false);
                        }}
                        title={option.label}
                        accessibilityLabel={`选择${option.label}`}
                      />
                    ))}
                  </Menu>
                </View>
              )}
            />
          </>
        )}
      </View>

      {/* Images: required for marketplace listings, optional for task photos */}
      <Controller
        control={control}
        name="images"
        render={({ field: { onChange, value } }) => (
          <View style={styles.fieldContainer}>
            <TaskImageUploader
              value={(value as string[]) || []}
              onChange={onChange}
              disabled={isLoading}
              max={9}
              label={isMarketplace ? '商品图片 *（至少1张，最多9张）' : undefined}
            />
            {isMarketplace && errors.images && (
              <HelperText type="error" visible accessibilityLabel="商品图片错误提示">
                {errors.images.message as string}
              </HelperText>
            )}
          </View>
        )}
      />

      {/* Task Tags: only relevant to the task domain (scene/requirement tags) */}
      {!isMarketplace && (
        <Controller
          control={control}
          name="tagIds"
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldContainer}>
              <TaskTagSelector
                value={(value as string[]) || []}
                onChange={onChange}
                disabled={isLoading}
              />
            </View>
          )}
        />
      )}

      {/* More Options (collapsible) — headcount/start time/duration only apply
          to job-style tasks, not marketplace listings. */}
      <Button
        mode="text"
        icon={moreVisible ? 'chevron-up' : 'chevron-down'}
        onPress={() => setMoreVisible((v) => !v)}
        style={styles.moreToggle}
        contentStyle={styles.moreToggleContent}
        accessibilityLabel={moreVisible ? '收起更多选项' : '展开更多选项'}
      >
        {moreVisible
          ? '收起更多选项'
          : isMarketplace
            ? '更多选项（联系方式）'
            : '更多选项（人数 / 时间 / 联系方式）'}
      </Button>

      {moreVisible && (
        <View style={styles.moreSection}>
          {!isMarketplace && (
            <>
              {/* Headcount */}
              <Controller
                control={control}
                name="headcount"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.fieldContainer}>
                    <TextInput
                      label="招募人数（可选，默认1）"
                      placeholder="1"
                      value={value !== undefined && value !== null ? String(value) : ''}
                      onChangeText={(text) => {
                        if (text === '') {
                          onChange(undefined);
                          return;
                        }
                        if (/^\d+$/.test(text)) {
                          const num = parseInt(text, 10);
                          if (!isNaN(num)) onChange(num);
                        }
                      }}
                      mode="outlined"
                      keyboardType="number-pad"
                      disabled={isLoading}
                      left={<TextInput.Icon icon="account-group-outline" />}
                      right={<TextInput.Affix text="人" />}
                      error={!!errors.headcount}
                      accessibilityLabel="招募人数输入框"
                    />
                    {errors.headcount && (
                      <HelperText type="error" visible>
                        {errors.headcount.message}
                      </HelperText>
                    )}
                  </View>
                )}
              />

              {/* Start Time (optional) */}
              <Controller
                control={control}
                name="startTime"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.fieldContainer}>
                    <Text variant="bodySmall" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
                      ⏱ 预计开始时间（可选）
                    </Text>
                    {Platform.OS === 'web' ? (
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <input
                          type="date"
                          value={value ? String(value).slice(0, 10) : ''}
                          onChange={(e: any) => {
                            const timeStr = value ? String(value).slice(11, 16) : '12:00';
                            onChange(e.target.value ? `${e.target.value}T${timeStr}` : '');
                          }}
                          min={new Date().toISOString().slice(0, 10)}
                          disabled={isLoading}
                          style={{ flex: 1, padding: '10px 12px', borderRadius: 6, border: '1px solid #E0E0E0', fontSize: 14, backgroundColor: '#fff' }}
                          aria-label="选择开始日期"
                        />
                        <input
                          type="time"
                          value={value ? String(value).slice(11, 16) : ''}
                          onChange={(e: any) => {
                            const dateStr = value ? String(value).slice(0, 10) : new Date().toISOString().slice(0, 10);
                            onChange(`${dateStr}T${e.target.value}`);
                          }}
                          disabled={isLoading}
                          style={{ flex: 1, padding: '10px 12px', borderRadius: 6, border: '1px solid #E0E0E0', fontSize: 14, backgroundColor: '#fff' }}
                          aria-label="选择开始时间"
                        />
                      </View>
                    ) : (
                      <TextInput
                        label="开始时间（YYYY-MM-DD HH:mm）"
                        value={value ? formatDeadlineDisplay(String(value)) : ''}
                        mode="outlined"
                        editable={false}
                        left={<TextInput.Icon icon="clock-start" />}
                        placeholder="可在网页端选择"
                        accessibilityLabel="预计开始时间"
                      />
                    )}
                  </View>
                )}
              />

              {/* Duration: hours / unit */}
              <View style={styles.durationRow}>
                <Controller
                  control={control}
                  name="durationHours"
                  render={({ field: { onChange, value } }) => (
                    <View style={[styles.fieldContainer, styles.durationHoursField]}>
                      <TextInput
                        label="预计时长（可选）"
                        placeholder="如 2.5"
                        value={value !== undefined && value !== null ? String(value) : ''}
                        onChangeText={(text) => {
                          if (text === '') {
                            onChange(undefined);
                            return;
                          }
                          if (/^\d*\.?\d{0,1}$/.test(text)) {
                            const num = parseFloat(text);
                            if (!isNaN(num)) onChange(num);
                          }
                        }}
                        mode="outlined"
                        keyboardType="decimal-pad"
                        disabled={isLoading}
                        right={<TextInput.Affix text="小时" />}
                        accessibilityLabel="预计时长小时数"
                      />
                    </View>
                  )}
                />
                <Text style={styles.slash}>/</Text>
                <Controller
                  control={control}
                  name="durationUnit"
                  render={({ field: { onChange, value } }) => (
                    <View style={[styles.fieldContainer, styles.durationUnitField]}>
                      <Menu
                        visible={durationUnitMenu}
                        onDismiss={() => setDurationUnitMenu(false)}
                        anchor={
                          <Pressable
                            onPress={() => setDurationUnitMenu(true)}
                            disabled={isLoading}
                            accessibilityLabel="时长单位选择"
                            accessibilityRole="button"
                          >
                            <TextInput
                              label="单位"
                              value={DURATION_UNIT_OPTIONS.find((o) => o.value === value)?.label || ''}
                              mode="outlined"
                              editable={false}
                              right={<TextInput.Icon icon="chevron-down" onPress={() => setDurationUnitMenu(true)} />}
                              pointerEvents="none"
                              accessibilityLabel="时长单位"
                            />
                          </Pressable>
                        }
                        anchorPosition="bottom"
                      >
                        {DURATION_UNIT_OPTIONS.map((option) => (
                          <Menu.Item
                            key={option.value}
                            onPress={() => {
                              onChange(option.value);
                              setDurationUnitMenu(false);
                            }}
                            title={option.label}
                          />
                        ))}
                      </Menu>
                    </View>
                  )}
                />
              </View>
            </>
          )}

          {/* Contact Method (free text) — kept for both domains */}
          <Controller
            control={control}
            name="contactMethod"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.fieldContainer}>
                <TextInput
                  label="联系方式（可选）"
                  placeholder="如 LINE: xxx / 微信: xxx / 小红书: xxx"
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  mode="outlined"
                  disabled={isLoading}
                  maxLength={100}
                  left={<TextInput.Icon icon="card-account-phone-outline" />}
                  error={!!errors.contactMethod}
                  accessibilityLabel="联系方式输入框"
                />
                {errors.contactMethod && (
                  <HelperText type="error" visible>
                    {errors.contactMethod.message}
                  </HelperText>
                )}
              </View>
            )}
          />
        </View>
      )}

      {/* Submit Button (Requirement 4.3) */}
      <Button
        mode="contained"
        onPress={handleSubmit(onFormSubmit)}
        loading={isLoading}
        disabled={isLoading}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
        accessibilityLabel={isMarketplace ? '发布闲置按钮' : '发布任务按钮'}
        accessibilityHint={isMarketplace ? '提交闲置发布表单' : '提交任务发布表单'}
      >
        {isMarketplace ? '发布闲置' : '发布任务'}
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
  moreToggle: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  moreToggleContent: {
    flexDirection: 'row-reverse',
  },
  moreSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardAmountField: {
    flex: 2,
  },
  priceField: {
    flex: 1,
  },
  rewardUnitField: {
    flex: 1,
  },
  slash: {
    fontSize: 20,
    color: '#9E9E9E',
    marginBottom: 4,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationHoursField: {
    flex: 2,
  },
  durationUnitField: {
    flex: 1,
  },
});
