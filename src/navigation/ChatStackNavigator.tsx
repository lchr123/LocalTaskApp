/**
 * Chat Stack Navigator
 *
 * Stack navigation for the chat module:
 * ChatList → ChatRoom
 *
 * Uses native stack navigator for smooth animations (< 300ms).
 *
 * Requirements covered:
 * - 10.2: Page transitions complete within 300ms
 * - 10.5: Consistent navigation structure on iOS and Android
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';

// ─── Navigation Types ────────────────────────────────────────────────────────

export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { sessionId: string; taskTitle: string };
};

// ─── Stack Navigator ─────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<ChatStackParamList>();

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChatStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="ChatList"
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right',
        headerBackTitle: '返回',
      }}
    >
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: '消息', headerShown: false }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({ title: route.params.taskTitle })}
      />
    </Stack.Navigator>
  );
}
