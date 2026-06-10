/**
 * Edit Profile Screen
 *
 * Allows user to edit: nickname, birthday, address, bio, and helper tags.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Text, TextInput, Button, HelperText, Chip, Snackbar, useTheme, ActivityIndicator, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../services/api';

interface HelperTag {
  id: string;
  name: string;
  label_zh: string;
  category: string;
}

export default function EditProfileScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user, setUser } = useAuthStore();

  const [nickname, setNickname] = useState('');
  const [birthday, setBirthday] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');

  const [allTags, setAllTags] = useState<HelperTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load profile and tags on mount
  useEffect(() => {
    (async () => {
      try {
        const [profileRes, allTagsRes, myTagsRes] = await Promise.all([
          apiClient.get('/users/me'),
          apiClient.get('/users/helper-tags'),
          apiClient.get('/my-tags'),
        ]);

        const profile = profileRes.data;
        setNickname(profile.nickname || '');
        setBirthday(profile.birthday?.slice(0, 10) || '');
        setAddress(profile.address || '');
        setBio(profile.bio || '');
        setUser(profile);

        setAllTags(allTagsRes.data.tags);
        setSelectedTagIds(myTagsRes.data.tags.map((t: HelperTag) => t.id));
      } catch {
        // ignore
      } finally {
        setIsLoadingProfile(false);
        setIsLoadingTags(false);
      }
    })();
  }, []);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Update profile fields
      const profileRes = await apiClient.patch('/users/me', {
        nickname: nickname.trim(),
        birthday: birthday || undefined,
        address: address.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      setUser(profileRes.data);

      // Update tags
      await apiClient.put('/my-tags', { tagIds: selectedTagIds });

      setSuccessVisible(true);
      setTimeout(() => navigation.goBack(), 1000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '保存失败，请稍后重试';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [nickname, birthday, address, bio, selectedTagIds, navigation, setUser]);

  // Group tags by category
  const tagsByCategory = allTags.reduce<Record<string, HelperTag[]>>((acc, tag) => {
    const cat = tag.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tag);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    task_type: '擅长的任务类型',
    skill: '技能',
    identity: '身份',
  };

  if (isLoadingProfile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {errorMessage && (
          <View style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}>
            <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
              {errorMessage}
            </Text>
          </View>
        )}

        {/* Nickname */}
        <TextInput
          label="昵称"
          value={nickname}
          onChangeText={setNickname}
          mode="outlined"
          maxLength={50}
          disabled={isSubmitting}
          style={styles.input}
        />

        {/* Birthday */}
        <View style={styles.fieldContainer}>
          <Text variant="bodySmall" style={{ marginBottom: 4, color: theme.colors.onSurfaceVariant }}>
            生日
          </Text>
          <input
            type="date"
            value={birthday}
            onChange={(e: any) => setBirthday(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 6,
              border: `1px solid #E0E0E0`,
              fontSize: 14,
              backgroundColor: '#fff',
              boxSizing: 'border-box' as any,
            }}
          />
        </View>

        {/* Address */}
        <TextInput
          label="住址"
          placeholder="如：東京都渋谷区"
          value={address}
          onChangeText={setAddress}
          mode="outlined"
          maxLength={200}
          disabled={isSubmitting}
          style={styles.input}
        />

        {/* Bio */}
        <TextInput
          label="自我介绍"
          placeholder="介绍你的技能和经验，让发布者更信任你。例如：有驾照、日语N1、搬家经验丰富..."
          value={bio}
          onChangeText={setBio}
          mode="outlined"
          multiline
          numberOfLines={4}
          maxLength={500}
          disabled={isSubmitting}
          style={styles.input}
        />
        <HelperText type="info" visible>
          好的自我介绍能帮你获得更多任务机会（{bio.length}/500）
        </HelperText>

        <Divider style={{ marginVertical: 16 }} />

        {/* Tags */}
        <Text variant="titleMedium" style={{ marginBottom: 12 }}>
          标签选择
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
          选择适合你的标签，帮助发布者找到你
        </Text>

        {isLoadingTags ? (
          <ActivityIndicator size="small" style={{ padding: 20 }} />
        ) : (
          Object.entries(tagsByCategory).map(([category, tags]) => (
            <View key={category} style={styles.tagCategory}>
              <Text variant="labelLarge" style={styles.tagCategoryLabel}>
                {categoryLabels[category] || category}
              </Text>
              <View style={styles.tagRow}>
                {tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <Chip
                      key={tag.id}
                      selected={isSelected}
                      onPress={() => toggleTag(tag.id)}
                      showSelectedCheck
                      style={[styles.tagChip, isSelected && { backgroundColor: '#E3F2FD' }]}
                      textStyle={isSelected ? { color: '#1976D2' } : { color: '#666' }}
                      disabled={isSubmitting}
                    >
                      {tag.label_zh}
                    </Chip>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {/* Submit */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || !nickname.trim()}
          style={styles.submitButton}
          contentStyle={{ paddingVertical: 8 }}
        >
          保存
        </Button>
      </ScrollView>

      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={1000}
      >
        ✅ 资料已更新
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 24, paddingTop: 12 },
  input: { marginBottom: 12 },
  fieldContainer: { marginBottom: 12 },
  errorBanner: { padding: 12, borderRadius: 8, marginBottom: 16 },
  tagCategory: { marginBottom: 16 },
  tagCategoryLabel: { marginBottom: 8, color: '#555' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { marginBottom: 4 },
  submitButton: { marginTop: 24, marginBottom: 32 },
});
