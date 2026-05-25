/**
 * Profile Screen
 *
 * Displays user profile information including nickname, avatar,
 * average rating, and completed task count.
 * Provides logout functionality and review history entry.
 *
 * Requirements covered:
 * - 3.1: Logout clears local auth and navigates to login
 * - 3.2: Logout invalidates current session
 * - 3.3: Logout clears local state even on network failure
 * - 8.5: Display average rating (1 decimal place) and review history
 */

import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Text, useTheme, Divider, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useReviewStore } from '../../stores/reviewStore';
import { useAuthStore } from '../../stores/authStore';
import { formatRating } from '../../utils/formatters';

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user, logout, isLoading } = useAuthStore();
  const { averageRating, totalReviews, fetchUserReviews } = useReviewStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch current user's reviews on mount
  useEffect(() => {
    if (user?.id) {
      fetchUserReviews(user.id);
    }
  }, [user?.id, fetchUserReviews]);

  /**
   * Navigate to the review list screen.
   * Requirement 8.5: Display historical reviews on user's profile page.
   */
  const handleViewReviews = useCallback(() => {
    if (user?.id) {
      (navigation as any).navigate('ReviewList', {
        userId: user.id,
        nickname: user.nickname || '我',
      });
    }
  }, [user, navigation]);

  /**
   * Handle logout with confirmation.
   * Requirements 3.1, 3.2, 3.3:
   * - Clear local auth info
   * - Invalidate session
   * - Navigate to login page
   */
  const handleLogout = useCallback(() => {
    Alert.alert(
      '确认登出',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [logout]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityLabel="个人中心"
    >
      {/* User Info Section */}
      <View style={styles.userSection} accessibilityLabel="用户信息">
        <View style={styles.avatarContainer}>
          {user?.avatarUrl ? (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons
                name="account-circle"
                size={72}
                color={theme.colors.primary}
              />
            </View>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons
                name="account-circle"
                size={72}
                color={theme.colors.outline}
              />
            </View>
          )}
        </View>
        <Text
          variant="headlineSmall"
          style={styles.nickname}
          accessibilityLabel={`昵称：${user?.nickname || '用户'}`}
        >
          {user?.nickname || '用户'}
        </Text>
      </View>

      <Divider />

      {/* Stats Section */}
      <View style={styles.statsSection} accessibilityLabel="用户统计">
        <View
          style={styles.statItem}
          accessibilityLabel={`平均评分${formatRating(user?.averageRating ?? averageRating)}星`}
        >
          <MaterialCommunityIcons name="star" size={24} color="#FFB800" />
          <Text variant="titleMedium" style={styles.statValue}>
            {formatRating(user?.averageRating ?? averageRating)}
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.statLabel, { color: theme.colors.outline }]}
          >
            平均评分
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: theme.colors.outlineVariant }]} />

        <View
          style={styles.statItem}
          accessibilityLabel={`已完成${user?.completedTaskCount ?? 0}个任务`}
        >
          <MaterialCommunityIcons
            name="check-circle"
            size={24}
            color={theme.colors.primary}
          />
          <Text variant="titleMedium" style={styles.statValue}>
            {user?.completedTaskCount ?? 0}
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.statLabel, { color: theme.colors.outline }]}
          >
            完成任务
          </Text>
        </View>
      </View>

      <Divider />

      {/* Review List Entry - Requirement 8.5 */}
      <Pressable
        style={styles.menuItem}
        onPress={handleViewReviews}
        accessibilityLabel={`查看评价列表，共${totalReviews}条评价`}
        accessibilityRole="button"
      >
        <View style={styles.menuItemLeft}>
          <MaterialCommunityIcons
            name="star-outline"
            size={24}
            color={theme.colors.onSurface}
          />
          <Text variant="bodyLarge" style={styles.menuItemText}>
            我的评价
          </Text>
        </View>
        <View style={styles.menuItemRight}>
          <Text
            variant="bodySmall"
            style={[styles.menuItemBadge, { color: theme.colors.outline }]}
          >
            {totalReviews} 条
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme.colors.outline}
          />
        </View>
      </Pressable>

      <Divider />

      {/* Logout Button - Requirements 3.1, 3.2, 3.3 */}
      <View style={styles.logoutSection}>
        <Button
          mode="outlined"
          onPress={handleLogout}
          loading={isLoggingOut || isLoading}
          disabled={isLoggingOut || isLoading}
          icon="logout"
          textColor={theme.colors.error}
          style={[styles.logoutButton, { borderColor: theme.colors.error }]}
          accessibilityLabel="退出登录"
          accessibilityRole="button"
        >
          退出登录
        </Button>
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flexGrow: 1,
    paddingTop: 48,
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nickname: {
    fontWeight: '600',
  },
  statsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontWeight: '500',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuItemBadge: {
    fontSize: 12,
  },
  logoutSection: {
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  logoutButton: {
    borderRadius: 8,
  },
});
