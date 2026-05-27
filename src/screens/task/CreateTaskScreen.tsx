/**
 * Create Task Screen
 *
 * Form for posting a new task with type, description,
 * location, deadline, and reward.
 * Uses React Hook Form + Zod for validation via TaskForm component.
 *
 * Requirements covered:
 * - 4.1: Task creation form with required fields
 * - 4.2: Task type selection
 * - 4.3: Submit task when all fields valid, show success, navigate to task list
 * - 4.4: Highlight missing required fields with error messages
 * - 4.5: Task appears in task list after creation
 * - 4.6: Validate reward range
 * - 4.7: Validate deadline is in the future
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text, Snackbar, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useTaskStore } from '../../stores/taskStore';
import TaskForm from '../../components/task/TaskForm';
import { CreateTaskFormData } from '../../utils/validation';

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateTaskScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { createTask, isLoading } = useTaskStore();

  const [successVisible, setSuccessVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Handle form submission.
   * Creates the task via the store, shows success message,
   * then navigates to the task list.
   *
   * Requirement 4.3: Create task and display success.
   * Requirement 4.5: Task appears in task list after creation.
   */
  const handleSubmit = useCallback(
    async (data: CreateTaskFormData) => {
      setErrorMessage(null);

      try {
        await createTask({
          type: data.type,
          description: data.description,
          location: {
            address: data.location.address,
            latitude: data.location.latitude,
            longitude: data.location.longitude,
          },
          reward: data.reward,
          deadline: new Date(data.deadline).toISOString(),
        });

        // Show success feedback
        setSuccessVisible(true);

        // Navigate to task list after a brief delay for user to see the success message
        setTimeout(() => {
          // Navigate to the Tasks tab which shows the task list
          navigation.navigate('Tasks' as never);
        }, 1500);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : '发布任务失败，请稍后重试';
        setErrorMessage(message);
      }
    },
    [createTask, navigation]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      accessibilityLabel="发布任务页面"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text variant="headlineMedium" style={styles.title}>
          发布任务
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          填写以下信息发布新任务，所有带 * 的字段为必填项
        </Text>

        {/* Error Banner */}
        {errorMessage && (
          <View
            style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}
            accessibilityLabel="发布错误提示"
            accessibilityRole="alert"
          >
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onErrorContainer }}
            >
              {errorMessage}
            </Text>
          </View>
        )}

        {/* Task Form */}
        <TaskForm onSubmit={handleSubmit} isLoading={isLoading} />
      </ScrollView>

      {/* Success Snackbar (Requirement 4.3) */}
      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={1500}
        style={styles.snackbar}
        accessibilityLabel="任务发布成功提示"
      >
        🎉 任务发布成功！
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
    paddingTop: 48,
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
  snackbar: {
    marginBottom: 16,
  },
});
