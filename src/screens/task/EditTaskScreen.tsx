/**
 * Edit Task Screen
 *
 * Allows the poster to edit their task's description, reward, and location
 * when the task is still in 'open' (待接单) status.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Text, TextInput, Button, HelperText, Snackbar, useTheme, ActivityIndicator } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TaskStackParamList } from '../../navigation/TaskStackNavigator';
import { taskService } from '../../services/taskService';
import { Task } from '../../types/task';
import LocationPicker, { LocationValue } from '../../components/task/LocationPicker';
import { VALIDATION } from '../../utils/constants';

// Conditionally import DateTimePicker (not available on web)
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

type Props = NativeStackScreenProps<TaskStackParamList, 'EditTask'>;

/**
 * Convert a Date to local "YYYY-MM-DDTHH:mm" string for datetime-local input.
 */
function toLocalDatetimeString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EditTaskScreen({ route, navigation }: Props) {
  const { taskId } = route.params;
  const theme = useTheme();

  const [task, setTask] = useState<Task | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [deadline, setDeadline] = useState('');
  const [initialDeadline, setInitialDeadline] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [location, setLocation] = useState<LocationValue>({
    address: '',
    latitude: 0,
    longitude: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);  const [successVisible, setSuccessVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load task data on mount
  useEffect(() => {
    (async () => {
      try {
        const taskData = await taskService.fetchTaskDetail(taskId);
        setTask(taskData);
        setDescription(taskData.description);
        setReward(String(taskData.reward));
        setDeadline(taskData.deadline ? toLocalDatetimeString(new Date(taskData.deadline)) : '');
        setInitialDeadline(taskData.deadline ? toLocalDatetimeString(new Date(taskData.deadline)) : '');
        setLocation({
          address: taskData.location.address,
          latitude: taskData.location.latitude,
          longitude: taskData.location.longitude,
        });
      } catch {
        setLoadError('无法加载任务信息');
      } finally {
        setIsLoadingTask(false);
      }
    })();
  }, [taskId]);

  // Validation
  const descriptionError =
    description.length > 0 && description.length < VALIDATION.TASK_DESCRIPTION_MIN
      ? `描述至少需要${VALIDATION.TASK_DESCRIPTION_MIN}个字符`
      : description.length > VALIDATION.TASK_DESCRIPTION_MAX
        ? `描述最多${VALIDATION.TASK_DESCRIPTION_MAX}个字符`
        : null;

  const rewardNum = parseFloat(reward);
  const rewardError =
    reward !== '' && (isNaN(rewardNum) || rewardNum < VALIDATION.TASK_REWARD_MIN || rewardNum > VALIDATION.TASK_REWARD_MAX)
      ? `报酬金额范围为${VALIDATION.TASK_REWARD_MIN}~${VALIDATION.TASK_REWARD_MAX}元`
      : reward !== '' && !isNaN(rewardNum) && !Number.isInteger(rewardNum)
        ? '报酬金额必须为整数'
        : null;

  const locationValid = location.latitude !== 0 && location.longitude !== 0;

  const deadlineError =
    deadline !== '' && new Date(deadline).getTime() <= Date.now()
      ? '截止时间必须晚于当前时间'
      : null;

  const canSubmit =
    !isSubmitting &&
    description.length >= VALIDATION.TASK_DESCRIPTION_MIN &&
    description.length <= VALIDATION.TASK_DESCRIPTION_MAX &&
    !isNaN(rewardNum) &&
    Number.isInteger(rewardNum) &&
    rewardNum >= VALIDATION.TASK_REWARD_MIN &&
    rewardNum <= VALIDATION.TASK_REWARD_MAX &&
    locationValid &&
    deadline !== '' &&
    !deadlineError;

  const formatDeadlineDisplay = (dateStr: string): string => {
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
  };

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !task) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: { description?: string; reward?: number; location?: LocationValue; deadline?: string } = {};

      if (description !== task.description) {
        payload.description = description;
      }
      if (rewardNum !== task.reward) {
        payload.reward = rewardNum;
      }
      if (
        location.address !== task.location.address ||
        location.latitude !== task.location.latitude ||
        location.longitude !== task.location.longitude
      ) {
        payload.location = location;
      }
      if (deadline !== initialDeadline) {
        payload.deadline = new Date(deadline).toISOString();
      }

      if (Object.keys(payload).length === 0) {
        setErrorMessage('没有需要保存的修改');
        setIsSubmitting(false);
        return;
      }

      await taskService.updateTask(task.id, payload);
      setSuccessVisible(true);
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '保存失败，请稍后重试';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, description, rewardNum, location, deadline, initialDeadline, task, navigation]);

  // Loading state
  if (isLoadingTask) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Error state
  if (loadError || !task) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge" style={{ opacity: 0.6 }}>
          {loadError || '任务不存在'}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      accessibilityLabel="编辑任务页面"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="headlineMedium" style={styles.title}>
          编辑任务
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          仅待接单状态的任务可编辑描述、报酬和地址
        </Text>

        {errorMessage && (
          <View
            style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}
            accessibilityRole="alert"
          >
            <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
              {errorMessage}
            </Text>
          </View>
        )}

        {/* Description */}
        <View style={styles.fieldContainer}>
          <TextInput
            label="任务描述 *"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={4}
            error={!!descriptionError}
            disabled={isSubmitting}
            maxLength={VALIDATION.TASK_DESCRIPTION_MAX}
            accessibilityLabel="任务描述输入框"
          />
          <View style={styles.fieldFooter}>
            {descriptionError ? (
              <HelperText type="error" visible style={styles.helperText}>
                {descriptionError}
              </HelperText>
            ) : (
              <HelperText type="info" visible style={styles.helperText}>
                {' '}
              </HelperText>
            )}
            <Text variant="bodySmall" style={styles.charCount}>
              {description.length}/{VALIDATION.TASK_DESCRIPTION_MAX}
            </Text>
          </View>
        </View>

        {/* Reward */}
        <View style={styles.fieldContainer}>
          <TextInput
            label="报酬金额 *"
            value={reward}
            onChangeText={(text) => {
              if (text === '' || /^\d*$/.test(text)) {
                setReward(text);
              }
            }}
            mode="outlined"
            keyboardType="number-pad"
            error={!!rewardError}
            disabled={isSubmitting}
            left={<TextInput.Icon icon="currency-cny" />}
            right={<TextInput.Affix text="元" />}
            accessibilityLabel="报酬金额输入框"
          />
          {rewardError && (
            <HelperText type="error" visible>
              {rewardError}
            </HelperText>
          )}
        </View>

        {/* Location */}
        <View style={styles.fieldContainer}>
          <LocationPicker
            value={location}
            onChange={setLocation}
            disabled={isSubmitting}
          />
        </View>

        {/* Deadline */}
        <View style={styles.fieldContainer}>
          {Platform.OS === 'web' ? (
            <>
              <Text variant="bodySmall" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
                ⏰ 截止时间 *
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <input
                  type="date"
                  value={deadline ? deadline.slice(0, 10) : ''}
                  onChange={(e: any) => {
                    const timeStr = deadline ? deadline.slice(11, 16) : '12:00';
                    setDeadline(`${e.target.value}T${timeStr}`);
                  }}
                  min={new Date().toISOString().slice(0, 10)}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: deadlineError ? `2px solid ${theme.colors.error}` : `1px solid #E0E0E0`,
                    fontSize: 14,
                    backgroundColor: '#fff',
                  }}
                  aria-label="选择日期"
                />
                <input
                  type="time"
                  value={deadline ? deadline.slice(11, 16) : ''}
                  onChange={(e: any) => {
                    const dateStr = deadline ? deadline.slice(0, 10) : new Date().toISOString().slice(0, 10);
                    setDeadline(`${dateStr}T${e.target.value}`);
                  }}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: deadlineError ? `2px solid ${theme.colors.error}` : `1px solid #E0E0E0`,
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
                  if (!isSubmitting) {
                    setDatePickerMode('date');
                    setTempDate(deadline ? new Date(deadline) : new Date(Date.now() + 2 * 60 * 60 * 1000));
                    setShowDatePicker(true);
                  }
                }}
                accessibilityLabel="选择截止时间"
                accessibilityRole="button"
              >
                <TextInput
                  label="截止时间 *"
                  value={deadline ? formatDeadlineDisplay(deadline) : ''}
                  mode="outlined"
                  editable={false}
                  error={!!deadlineError}
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
                      setTempDate(selectedDate);
                      setDatePickerMode('time');
                      if (Platform.OS === 'android') {
                        setShowDatePicker(true);
                      }
                    } else {
                      setShowDatePicker(false);
                      const year = selectedDate.getFullYear();
                      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const day = String(selectedDate.getDate()).padStart(2, '0');
                      const hours = String(selectedDate.getHours()).padStart(2, '0');
                      const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
                      setDeadline(`${year}-${month}-${day}T${hours}:${minutes}`);
                    }
                  }}
                />
              )}
            </>
          )}
          {deadlineError ? (
            <HelperText type="error" visible>
              {deadlineError}
            </HelperText>
          ) : (
            <HelperText type="info" visible>
              时间必须晚于当前时间
            </HelperText>
          )}
        </View>

        {/* Submit */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={!canSubmit}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
          accessibilityLabel="保存修改"
        >
          保存修改
        </Button>
      </ScrollView>

      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={1000}
        accessibilityLabel="修改成功提示"
      >
        ✅ 任务已更新
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 12,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 12,
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
  submitButton: {
    marginTop: 16,
    marginBottom: 24,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});
