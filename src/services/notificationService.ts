/**
 * Notification Service
 *
 * Handles push notification registration, permission management,
 * and local notification scheduling using expo-notifications.
 *
 * Requirements covered:
 * - 6.3: Notify Task_Poster when a new helper submits intent
 * - 6.5: Notify selected helper and other intent helpers of selection result
 * - 7.4: Notify user of new messages when not in chat screen
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { EventSubscription } from 'expo-modules-core';

/**
 * Notification types supported by the platform
 */
export type NotificationType = 'new_intent' | 'helper_selected' | 'new_message';

/**
 * Payload for a new intent notification (Requirement 6.3)
 */
export interface NewIntentNotificationData {
  type: 'new_intent';
  taskId: string;
  taskDescription: string;
  helperNickname: string;
}

/**
 * Payload for a helper selected notification (Requirement 6.5)
 */
export interface HelperSelectedNotificationData {
  type: 'helper_selected';
  taskId: string;
  taskDescription: string;
  selected: boolean; // true = you were selected, false = another helper was selected
}

/**
 * Payload for a new message notification (Requirement 7.4)
 */
export interface NewMessageNotificationData {
  type: 'new_message';
  sessionId: string;
  senderNickname: string;
  messagePreview: string;
}

/**
 * Union type for all notification data payloads
 */
export type NotificationData =
  | NewIntentNotificationData
  | HelperSelectedNotificationData
  | NewMessageNotificationData;

/**
 * Callback for handling notification interactions (user taps on notification)
 */
export type NotificationResponseHandler = (
  type: NotificationType,
  data: NotificationData
) => void;

/**
 * Configure default notification behavior for foreground notifications.
 * Shows alert, plays sound, and sets badge when app is in foreground.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private pushToken: string | null = null;
  private responseHandler: NotificationResponseHandler | null = null;
  private notificationListener: EventSubscription | null = null;
  private responseListener: EventSubscription | null = null;

  /**
   * Register for push notifications and obtain the Expo push token.
   * Sets up notification channel for Android.
   *
   * @returns The Expo push token string, or null if registration fails
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: '默认通知',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B35',
        });
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync();
      this.pushToken = tokenData.data;

      return this.pushToken;
    } catch {
      return null;
    }
  }

  /**
   * Get the current push token without re-registering.
   *
   * @returns The cached push token, or null if not yet registered
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Set up listeners for incoming notifications and user interactions.
   * Call this once during app initialization.
   *
   * @param onResponse - Callback invoked when user taps a notification
   */
  setupListeners(onResponse?: NotificationResponseHandler): void {
    if (onResponse) {
      this.responseHandler = onResponse;
    }

    // Clean up existing listeners
    this.removeListeners();

    // Listen for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Listen for user interactions with notifications (taps)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );
  }

  /**
   * Remove all notification listeners.
   * Call this during app cleanup or logout.
   */
  removeListeners(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  /**
   * Schedule a local notification for a new intent submission.
   *
   * Requirement 6.3: Notify Task_Poster when a helper submits intent.
   *
   * @param data - New intent notification data
   */
  async scheduleNewIntentNotification(data: NewIntentNotificationData): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '新的帮手意向',
        body: `${data.helperNickname} 对您的任务"${this.truncateText(data.taskDescription, 20)}"表达了意向`,
        data: data as unknown as Record<string, unknown>,
        sound: 'default',
      },
      trigger: null, // Deliver immediately
    });
  }

  /**
   * Schedule a local notification for helper selection result.
   *
   * Requirement 6.5: Notify selected helper and other helpers of selection.
   *
   * @param data - Helper selected notification data
   */
  async scheduleHelperSelectedNotification(data: HelperSelectedNotificationData): Promise<void> {
    const title = data.selected ? '恭喜！您已被选中' : '任务已有帮手';
    const body = data.selected
      ? `您已被选为任务"${this.truncateText(data.taskDescription, 20)}"的帮手`
      : `任务"${this.truncateText(data.taskDescription, 20)}"已选择了其他帮手`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data as unknown as Record<string, unknown>,
        sound: 'default',
      },
      trigger: null, // Deliver immediately
    });
  }

  /**
   * Schedule a local notification for a new chat message.
   *
   * Requirement 7.4: Notify user of new messages within 3 seconds.
   *
   * @param data - New message notification data
   */
  async scheduleNewMessageNotification(data: NewMessageNotificationData): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${data.senderNickname} 发来消息`,
        body: this.truncateText(data.messagePreview, 50),
        data: data as unknown as Record<string, unknown>,
        sound: 'default',
      },
      trigger: null, // Deliver immediately
    });
  }

  /**
   * Dismiss all displayed notifications.
   */
  async dismissAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Get the count of delivered notifications (badge count).
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set the app badge count.
   *
   * @param count - Badge number to display
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  // --- Private methods ---

  /**
   * Handle a notification received while app is in foreground.
   * This is called by the notification listener.
   */
  private handleNotificationReceived(
    _notification: Notifications.Notification
  ): void {
    // Foreground notifications are handled by the notification handler set above.
    // Additional logic (e.g., updating unread counts) can be added here.
  }

  /**
   * Handle user interaction with a notification (tap).
   * Parses the notification data and invokes the response handler.
   */
  private handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): void {
    const data = response.notification.request.content.data as unknown as NotificationData;

    if (!data || !data.type) {
      return;
    }

    this.responseHandler?.(data.type, data);
  }

  /**
   * Truncate text to a maximum length, appending ellipsis if truncated.
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }
}

export const notificationService = new NotificationService();
