/**
 * UserProfileDialog
 *
 * A reusable modal that shows a user's public profile details
 * (gender, age, address, bio, helper tags). Fetches lazily when opened.
 *
 * Used by:
 * - IntentCard ("查看详情" on an applicant)
 * - ChatSessionCard (tap the participant avatar in 消息)
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Portal, Modal, Text, Button, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import apiClient from '../../services/api';

interface UserProfile {
  birthday?: string | null;
  address?: string | null;
  bio?: string | null;
  gender?: string | null;
}

interface HelperTag {
  id: string;
  label_zh: string;
  category: string;
}

const GENDER_LABELS: Record<string, string> = { male: '男', female: '女', other: '其他' };

function calculateAge(birthday: string): number {
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export interface UserProfileDialogProps {
  /** Whether the dialog is visible */
  visible: boolean;
  /** Target user id to load */
  userId: string;
  /** Display nickname for the title */
  nickname: string;
  /** Dismiss callback */
  onDismiss: () => void;
}

export const UserProfileDialog: React.FC<UserProfileDialogProps> = ({
  visible,
  userId,
  nickname,
  onDismiss,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tags, setTags] = useState<HelperTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || loadedFor === userId) return;

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const [profileRes, tagsRes] = await Promise.all([
          apiClient.get(`/users/${userId}`),
          apiClient.get(`/users/${userId}/tags`).catch(() => ({ data: { tags: [] } })),
        ]);
        if (!cancelled) {
          setProfile(profileRes.data);
          setTags(tagsRes.data.tags || []);
          setLoadedFor(userId);
        }
      } catch {
        // ignore — keep whatever we have
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, userId, loadedFor]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>{nickname} 的资料</Text>
        <Divider style={{ marginVertical: 12 }} />

        {isLoading ? (
          <ActivityIndicator style={{ marginVertical: 24 }} accessibilityLabel="加载资料中" />
        ) : (
          <ScrollView>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>性别</Text>
              <Text style={styles.profileValue}>
                {GENDER_LABELS[profile?.gender || ''] || '未填写'}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>年龄</Text>
              <Text style={styles.profileValue}>
                {profile?.birthday ? `${calculateAge(profile.birthday)} 岁` : '未填写'}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>住址</Text>
              <Text style={styles.profileValue}>{profile?.address || '未填写'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>自我介绍</Text>
              <Text style={styles.profileValue}>{profile?.bio || '未填写'}</Text>
            </View>
            {tags.length > 0 && (
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>标签</Text>
                <View style={styles.tagsWrap}>
                  {tags.map((tag) => (
                    <Chip key={tag.id} compact style={styles.profileTag} textStyle={{ fontSize: 11 }}>
                      {tag.label_zh}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}

        <Button mode="outlined" onPress={onDismiss} style={{ marginTop: 16 }}>
          关闭
        </Button>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: '#fff',
    margin: 24,
    padding: 24,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  profileRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  profileLabel: {
    width: 70,
    fontSize: 13,
    color: '#757575',
    fontWeight: '500',
  },
  profileValue: {
    flex: 1,
    fontSize: 13,
    color: '#424242',
    lineHeight: 18,
  },
  tagsWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  profileTag: {
    height: 24,
    backgroundColor: '#E3F2FD',
  },
});

export default UserProfileDialog;
