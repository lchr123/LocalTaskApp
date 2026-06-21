/**
 * IntentCard Component
 *
 * Displays a helper's intent information in a card format.
 * Shows helper nickname, average rating (stars), completed task count,
 * and optional message. Includes a "选择" button for the poster to select.
 * Supports viewing helper's detailed profile (age, address, bio, tags).
 *
 * Requirements covered:
 * - 6.3: Show intent list entry with helper details
 * - 6.4: Display helper nickname, rating, completed count, message
 * - 6.5: Provide selection action for the poster
 */

import React, { memo, useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Card, Text, Button, Icon, Chip, ActivityIndicator, Divider, Portal, Modal } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Intent } from '../../types/task';
import { formatRating } from '../../utils/formatters';
import apiClient from '../../services/api';

interface HelperProfile {
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

export interface IntentCardProps {
  /** Intent data to display */
  intent: Intent;
  /** Callback when the "选择" button is pressed */
  onSelect: (intent: Intent) => void;
  /** Callback when the "聊一聊" button is pressed */
  onChat?: (intent: Intent) => void;
  /** Whether selection is disabled (e.g., already selected or loading) */
  disabled?: boolean;
}

/**
 * IntentCard renders a single helper intent in the intent list.
 * Memoized to prevent unnecessary re-renders in FlatList.
 */
export const IntentCard: React.FC<IntentCardProps> = memo(({ intent, onSelect, onChat, disabled }) => {
  const navigation = useNavigation();
  const isSelected = intent.status === 'selected';
  const isRejected = intent.status === 'rejected';
  const isWithdrawn = intent.status === 'withdrawn';
  const showSelectButton = intent.status === 'pending' && !disabled;

  const [profileVisible, setProfileVisible] = useState(false);
  const [profile, setProfile] = useState<HelperProfile | null>(null);
  const [tags, setTags] = useState<HelperTag[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const handleViewProfile = useCallback(async () => {
    if (profile) {
      setProfileVisible(true);
      return;
    }
    setIsLoadingProfile(true);
    try {
      const [profileRes, tagsRes] = await Promise.all([
        apiClient.get(`/users/${intent.helperId}`),
        apiClient.get(`/users/${intent.helperId}/tags`).catch(() => ({ data: { tags: [] } })),
      ]);
      setProfile(profileRes.data);
      setTags(tagsRes.data.tags || []);
      setProfileVisible(true);
    } catch {
      // ignore
    } finally {
      setIsLoadingProfile(false);
    }
  }, [profile, intent.helperId]);

  const getStatusLabel = (): string | null => {
    if (isSelected) return '已选择';
    if (isRejected) return '未选中';
    if (isWithdrawn) return '已撤回';
    return null;
  };

  const statusLabel = getStatusLabel();

  return (
    <Card
      style={[styles.card, isSelected && styles.selectedCard]}
      mode="elevated"
      accessibilityLabel={`帮手意向: ${intent.helperNickname}`}
    >
      <Card.Content style={styles.content}>
        {/* Header: Nickname + Status */}
        <View style={styles.header}>
          <View style={styles.nicknameRow}>
            <Icon source="account" size={20} color="#1976D2" />
            <Text
              style={styles.nickname}
              accessibilityLabel={`帮手昵称: ${intent.helperNickname}`}
            >
              {intent.helperNickname}
            </Text>
          </View>
          {statusLabel && (
            <Text
              style={[
                styles.statusBadge,
                isSelected && styles.selectedBadge,
                isRejected && styles.rejectedBadge,
                isWithdrawn && styles.withdrawnBadge,
              ]}
              accessibilityLabel={`状态: ${statusLabel}`}
            >
              {statusLabel}
            </Text>
          )}
        </View>

        {/* Rating + Completed Count */}
        <View style={styles.statsRow}>
          <View style={styles.ratingRow}>
            <Icon source="star" size={16} color="#FFB800" />
            <Text
              style={styles.ratingText}
              accessibilityLabel={`平均评分: ${formatRating(intent.helperRating)}星`}
            >
              {formatRating(intent.helperRating)}
            </Text>
          </View>
          <View style={styles.completedRow}>
            <Icon source="check-circle-outline" size={16} color="#4CAF50" />
            <Text
              style={styles.completedText}
              accessibilityLabel={`历史完成数: ${intent.helperCompletedCount}次`}
            >
              已完成 {intent.helperCompletedCount} 次
            </Text>
          </View>
        </View>

        {/* Optional Message */}
        {intent.message && (
          <View style={styles.messageContainer}>
            <Icon source="message-text-outline" size={14} color="#757575" />
            <Text
              style={styles.message}
              numberOfLines={3}
              accessibilityLabel={`留言: ${intent.message}`}
            >
              {intent.message}
            </Text>
          </View>
        )}

        {/* View Profile & Reviews Buttons */}
        <View style={styles.actionRow}>
          <Button
            mode="text"
            onPress={handleViewProfile}
            loading={isLoadingProfile}
            icon="account-details"
            compact
            style={styles.profileButton}
            accessibilityLabel="查看帮手详情"
          >
            查看详情
          </Button>
          <Button
            mode="text"
            onPress={() => {
              const nav = navigation as any;
              nav.navigate('UserReceivedReviews', { userId: intent.helperId, nickname: intent.helperNickname });
            }}
            icon="star-outline"
            compact
            style={styles.profileButton}
            accessibilityLabel="查看帮手评价"
          >
            查看评价
          </Button>
        </View>

        {/* Profile Dialog */}
        <Portal>
          <Modal
            visible={profileVisible}
            onDismiss={() => setProfileVisible(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <ScrollView>
              <Text style={styles.modalTitle}>{intent.helperNickname} 的资料</Text>
              <Divider style={{ marginVertical: 12 }} />
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>性别</Text>
                <Text style={styles.profileValue}>
                  {{ male: '男', female: '女', other: '其他' }[profile?.gender || ''] || '未填写'}
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
              <Button mode="outlined" onPress={() => setProfileVisible(false)} style={{ marginTop: 16 }}>
                关闭
              </Button>
            </ScrollView>
          </Modal>
        </Portal>

        {/* Action Buttons: 聊一聊 + 选择 (only for pending applicants) */}
        {showSelectButton && (
          <View style={styles.selectRow}>
            {onChat && (
              <Button
                mode="outlined"
                onPress={() => onChat(intent)}
                style={styles.chatButton}
                icon="chat-outline"
                accessibilityLabel={`与 ${intent.helperNickname} 聊一聊`}
                accessibilityHint="点击与此申请人开始聊天"
              >
                聊一聊
              </Button>
            )}
            <Button
              mode="contained"
              onPress={() => onSelect(intent)}
              style={styles.selectButton}
              accessibilityLabel={`选择帮手 ${intent.helperNickname}`}
              accessibilityHint="点击选择此帮手"
            >
              选择
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );
});

IntentCard.displayName = 'IntentCard';

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedCard: {
    borderColor: '#4CAF50',
    borderWidth: 1.5,
  },
  content: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nickname: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  selectedBadge: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  rejectedBadge: {
    backgroundColor: '#FAFAFA',
    color: '#9E9E9E',
  },
  withdrawnBadge: {
    backgroundColor: '#FFF3E0',
    color: '#E65100',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#424242',
    fontWeight: '500',
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 13,
    color: '#616161',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  message: {
    fontSize: 13,
    color: '#616161',
    lineHeight: 18,
    flex: 1,
  },
  selectButton: {
    minWidth: 88,
  },
  selectRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  chatButton: {
    borderColor: '#1976D2',
  },
  profileButton: {
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 4,
  },
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

export default IntentCard;
