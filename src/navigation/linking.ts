/**
 * Deep Linking / URL configuration for React Navigation.
 *
 * Purpose:
 * - On web, syncs the browser address bar with the navigation state so every
 *   screen has its own URL. Most importantly, a task detail becomes a
 *   shareable, bookmarkable URL: https://locallyhelper.com/task/<taskId>.
 * - On native, enables deep links via the `locallyhelper://` scheme
 *   (declared in app.json) and the https prefixes.
 *
 * Notes:
 * - `GET /tasks/:id` is a public backend endpoint, so a shared task URL can be
 *   opened by logged-out users.
 * - TaskDetail exists in both the Home and Tasks stacks. The Home stack maps it
 *   to the canonical, shareable `task/:taskId`; the Tasks stack uses a distinct
 *   `my-tasks/task/:taskId` path to avoid ambiguous URL → state resolution.
 * - For cold-loading a deep URL on the web (paste / refresh), the web server
 *   must fall back to index.html for unknown paths (SPA history fallback).
 *   In-app navigation updates the URL without needing that fallback.
 */

import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './navigationRef';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'https://locallyhelper.com',
    'https://www.locallyhelper.com',
    'locallyhelper://',
  ],
  config: {
    screens: {
      Main: {
        screens: {
          Home: {
            initialRouteName: 'TaskList',
            screens: {
              TaskList: '',
              // Canonical, shareable task URL: /task/<taskId>
              TaskDetail: 'task/:taskId',
              IntentList: 'task/:taskId/intents',
              CreateReport: 'report',
              Help: 'help',
            },
          },
          Tasks: {
            initialRouteName: 'MyTasksTab',
            screens: {
              MyTasksTab: 'my-tasks',
              TaskDetail: 'my-tasks/task/:taskId',
              IntentList: 'my-tasks/task/:taskId/intents',
              EditTask: 'my-tasks/task/:taskId/edit',
              UserReceivedReviews: 'users/:userId/received-reviews',
              CreateReview: 'my-tasks/task/:taskId/review',
              CreateReport: 'my-tasks/report',
            },
          },
          Post: 'post',
          Chat: {
            initialRouteName: 'ChatList',
            screens: {
              ChatList: 'messages',
              ChatRoom: 'messages/:sessionId',
            },
          },
          Profile: {
            initialRouteName: 'ProfileMain',
            screens: {
              ProfileMain: 'profile',
              EditProfile: 'profile/edit',
              ReviewList: 'users/:userId/reviews',
              MyReports: 'profile/reports',
              Help: 'profile/help',
            },
          },
        },
      },
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          VerifyCode: 'verify',
          ForgotPassword: 'forgot-password',
        },
      },
    },
  },
};
