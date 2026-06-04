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
import { View, StyleSheet, ScrollView, Pressable, Alert, Platform, Image } from 'react-native';
import { Text, useTheme, Divider, Button, TextInput, Portal, Modal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useReviewStore } from '../../stores/reviewStore';
import { useAuthStore } from '../../stores/authStore';
import { formatRating } from '../../utils/formatters';
import apiClient from '../../services/api';
import { navigateToAuth, resetToMain } from '../../navigation/navigationRef';
import { uploadService } from '../../services/uploadService';
import { appDialog } from '../../stores/dialogStore';

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user, logout, isLoading, setUser, isAuthenticated, tokens } = useAuthStore();
  const { averageRating, totalReviews, fetchUserReviews } = useReviewStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isSavingNickname, setIsSavingNickname] = useState(false);

  const isLoggedIn = isAuthenticated && !!tokens;
  const requireLogin = useCallback(
    (action: () => void) => {
      if (!isLoggedIn) {
        navigateToAuth();
        return;
      }

      action();
    },
    [isLoggedIn]
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/users/me');
        setUser(res.data);
      } catch {
        // Ignore - user may not have profile yet
      }
    };
    if (tokens) {
      fetchProfile();
    }
  }, [setUser, tokens]);

  // Fetch current user's reviews on mount
  useEffect(() => {
    if (user?.id) {
      fetchUserReviews(user.id);
    }
  }, [user?.id, fetchUserReviews]);

  /**
   * Open nickname edit modal
   */
  const handleEditNickname = useCallback(() => {
    setNewNickname(user?.nickname || '');
    setNicknameModalVisible(true);
  }, [user?.nickname]);

  /**
   * Handle avatar change - pick image, upload to S3, update profile
   */
  const handleChangeAvatar = useCallback(async () => {
    try {
      const ExpoImagePicker = await import('expo-image-picker');
      const permResult = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        await appDialog.alert({ message: '需要相册访问权限' });
        return;
      }

      const result = await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const remoteUrl = await uploadService.uploadImage({
        uri: asset.uri,
        fileName: `avatar_${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        folder: 'avatars',
      });

      const res = await apiClient.patch('/users/me', { avatarUrl: remoteUrl });
      setUser(res.data);

      await appDialog.alert({ title: '成功', message: '头像更新成功' });
    } catch (error) {
      await appDialog.alert({ message: '头像更新失败，请重试' });
    }
  }, [setUser]);

  /**
   * Save new nickname via PATCH /users/me
   */
  const handleSaveNickname = useCallback(async () => {
    const trimmed = newNickname.trim();
    if (!trimmed || trimmed.length > 50) {
      Alert.alert('提示', '昵称不能为空且不超过50个字符');
      return;
    }
    setIsSavingNickname(true);
    try {
      const res = await apiClient.patch('/users/me', { nickname: trimmed });
      setUser(res.data);
      setNicknameModalVisible(false);
    } catch {
      Alert.alert('错误', '修改昵称失败，请稍后重试');
    } finally {
      setIsSavingNickname(false);
    }
  }, [newNickname, setUser]);

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
  const handleLogout = useCallback(async () => {
    const confirmed = await appDialog.confirm({
      title: '确认登出',
      message: '确定要退出登录吗？',
      confirmText: '确定',
    });
    if (!confirmed) return;

    setIsLoggingOut(true);
    try {
      await logout();
      resetToMain();
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityLabel="个人中心"
    >
      {/* User Info Section */}
      <View style={styles.userSection} accessibilityLabel="用户信息">
        <Pressable
          style={styles.avatarContainer}
          onPress={() => {
            if (isLoggedIn) {
              handleChangeAvatar();
            }
          }}
          accessibilityLabel={isLoggedIn ? '点击修改头像' : '头像'}
          accessibilityRole={isLoggedIn ? 'button' : 'image'}
        >
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.avatarImage}
              accessibilityLabel="用户头像"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons
                name="account-circle"
                size={72}
                color={isLoggedIn ? theme.colors.primary : theme.colors.outline}
              />
            </View>
          )}
          {isLoggedIn && (
            <View style={styles.avatarEditBadge}>
              <MaterialCommunityIcons name="camera" size={14} color="#fff" />
            </View>
          )}
        </Pressable>
        <Text
          variant="headlineSmall"
          style={styles.nickname}
          accessibilityLabel={isLoggedIn ? `昵称：${user?.nickname || '用户'}` : '未登录'}
        >
          {isLoggedIn ? user?.nickname || '用户' : '未登录'}
        </Text>
        {isLoggedIn ? (
          <Pressable
            onPress={handleEditNickname}
            accessibilityLabel="修改昵称"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="pencil"
              size={18}
              color={theme.colors.primary}
              style={{ marginTop: 4 }}
            />
          </Pressable>
        ) : (
          <>
            <Text
              variant="bodyMedium"
              style={[styles.guestHint, { color: theme.colors.outline }]}
            >
              登录后可以发布任务、聊天、管理任务和查看评价
            </Text>

            <Button
              mode="contained"
              icon="login"
              onPress={navigateToAuth}
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
            >
              登录 / 注册
            </Button>
          </>
        )}
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
        onPress={() =>
          requireLogin(() => {
            (navigation as any).navigate('Tasks', { screen: 'MyTasksTab' });
          })
        }
        accessibilityLabel="查看我发布的任务"
        accessibilityRole="button"
      >
        <View style={styles.menuItemLeft}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={24}
            color={theme.colors.onSurface}
          />
          <Text variant="bodyLarge" style={styles.menuItemText}>
            我发布的任务
          </Text>
        </View>
        <View style={styles.menuItemRight}>
          {!isLoggedIn && (
            <Text
              variant="bodySmall"
              style={[styles.menuItemBadge, { color: theme.colors.outline }]}
            >
              登录后可用
            </Text>
          )}
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme.colors.outline}
          />
        </View>
      </Pressable>

      <Divider />

      <Pressable
        style={styles.menuItem}
        onPress={handleViewReviews}
        accessibilityLabel={
          isLoggedIn ? `查看评价列表，共${totalReviews}条评价` : '登录后查看评价列表'
        }
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
            {isLoggedIn ? `${totalReviews} 条` : '登录后可用'}
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme.colors.outline}
          />
        </View>
      </Pressable>

      <Divider />

      <Pressable
        style={styles.menuItem}
        onPress={() =>
          requireLogin(() => {
            (navigation as any).navigate('MyReports');
          })
        }
        accessibilityLabel="查看我的举报"
        accessibilityRole="button"
      >
        <View style={styles.menuItemLeft}>
          <MaterialCommunityIcons
            name="shield-alert-outline"
            size={24}
            color={theme.colors.onSurface}
          />
          <Text variant="bodyLarge" style={styles.menuItemText}>
            我的举报
          </Text>
        </View>
        <View style={styles.menuItemRight}>
          {!isLoggedIn && (
            <Text
              variant="bodySmall"
              style={[styles.menuItemBadge, { color: theme.colors.outline }]}
            >
              登录后可用
            </Text>
          )}
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme.colors.outline}
          />
        </View>
      </Pressable>

      <Divider />

      <Pressable
        style={styles.menuItem}
        onPress={() => (navigation as any).navigate('Help')}
        accessibilityLabel="使用帮助"
        accessibilityRole="button"
      >
        <View style={styles.menuItemLeft}>
          <MaterialCommunityIcons
            name="help-circle-outline"
            size={24}
            color={theme.colors.onSurface}
          />
          <Text variant="bodyLarge" style={styles.menuItemText}>
            使用帮助
          </Text>
        </View>
        <View style={styles.menuItemRight}>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme.colors.outline}
          />
        </View>
      </Pressable>

      <Divider />

      {/* Logout Button - Requirements 3.1, 3.2, 3.3 */}
      {isLoggedIn && (
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
      )}

      {/* Nickname Edit Modal */}
      <Portal>
        <Modal
          visible={nicknameModalVisible}
          onDismiss={() => setNicknameModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleMedium" style={{ marginBottom: 16 }}>修改昵称</Text>
          <TextInput
            label="昵称"
            value={newNickname}
            onChangeText={setNewNickname}
            mode="outlined"
            maxLength={50}
            autoFocus
            accessibilityLabel="新昵称输入框"
          />
          <View style={styles.modalButtons}>
            <Button onPress={() => setNicknameModalVisible(false)} disabled={isSavingNickname}>
              取消
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveNickname}
              loading={isSavingNickname}
              disabled={isSavingNickname || !newNickname.trim()}
            >
              保存
            </Button>
          </View>
        </Modal>
      </Portal>
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
    paddingTop: 12,
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
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
  modalContainer: {
    margin: 24,
    padding: 24,
    borderRadius: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  guestHint: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  loginButton: {
    marginTop: 20,
    borderRadius: 8,
    minWidth: 180,
  },
  loginButtonContent: {
    paddingVertical: 6,
  },
  guestFeatureSection: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  guestFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
});
