/**
 * Help Screen
 *
 * In-app help guide for new users explaining how to use LocalTask
 * as a task poster or as a helper.
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Divider, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ─── Section Data ────────────────────────────────────────────────────────────

const POSTER_STEPS = [
  { step: '1', title: '发布任务', desc: '点击底部「发布」→ 选择类型、填写描述、设定位置、报酬和截止时间 → 提交' },
  { step: '2', title: '等待接单', desc: '附近的帮手会看到你的任务，有兴趣的人会发送「意向」' },
  { step: '3', title: '查看意向', desc: '进入任务详情 → 查看意向列表，可以看到每位帮手的评分和完成任务数' },
  { step: '4', title: '选择帮手', desc: '选定一位帮手后，任务进入「进行中」，其他意向自动关闭，系统会自动生成与该帮手的聊天会话' },
  { step: '5', title: '沟通协调', desc: '通过聊天与帮手实时沟通细节（支持文字和图片）。如果沟通后发现帮手情况不匹配，可以取消匹配并重新选择其他帮手' },
  { step: '6', title: '确认完成', desc: '帮手完成后，你确认任务完成' },
  { step: '7', title: '评价帮手', desc: '为帮手打分（1-5星）并留言，帮助社区建立信任' },
];

const POSTER_TIPS = [
  '任务描述越详细，越容易吸引合适的帮手',
  '报酬合理会更快收到意向',
  '选择帮手后会自动创建聊天，方便你们协调细节',
];

const HELPER_STEPS = [
  { step: '1', title: '浏览任务', desc: '首页「任务大厅」自动展示附近的任务，可按类型和报酬筛选' },
  { step: '2', title: '查看详情', desc: '点击感兴趣的任务查看具体要求、位置和报酬' },
  { step: '3', title: '发送意向', desc: '点击「我想接单」，可附上一句话说明自己的优势' },
  { step: '4', title: '等待选择', desc: '发布者会从多个意向中选择一位帮手' },
  { step: '5', title: '沟通细节', desc: '被选中后通过聊天确认时间、地点等细节' },
  { step: '6', title: '完成任务', desc: '按约定完成任务' },
  { step: '7', title: '获得评价', desc: '发布者确认后你会收到评价，好评越多越容易被选中' },
];

const HELPER_TIPS = [
  '保持良好的评分（4星以上）更容易获得信任',
  '发送意向时附带自我介绍能增加被选中的概率',
  '如果无法完成，请尽早在聊天中告知发布者',
  '遇到虚假任务或不当行为，可以在任务详情页右上角菜单中举报',
];

const COMMON_FEATURES = [
  { icon: 'chat-outline', text: '聊天 — 消息 tab 查看所有会话，每个会话关联一个任务' },
  { icon: 'star-outline', text: '我的评价 — 个人中心查看别人给你的评分' },
  { icon: 'shield-alert-outline', text: '我的举报 — 个人中心查看举报处理进度' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function HelpScreen() {
  const theme = useTheme();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="帮助页面"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          使用指南
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
          LocalTask 是一个本地即时互助任务平台。{'\n'}
          住在附近的人可以发布生活小任务，也可以接下别人的任务赚取报酬。
        </Text>
      </View>

      <Divider style={styles.divider} />

      {/* Poster Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="bullhorn-outline" size={22} color={theme.colors.primary} />
          <Text variant="titleLarge" style={styles.sectionTitle}>
            任务发布者（我需要帮忙）
          </Text>
        </View>

        {POSTER_STEPS.map((item) => (
          <View key={item.step} style={styles.stepRow}>
            <View style={[styles.stepBadge, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text style={[styles.stepNumber, { color: theme.colors.primary }]}>{item.step}</Text>
            </View>
            <View style={styles.stepContent}>
              <Text variant="titleSmall" style={styles.stepTitle}>{item.title}</Text>
              <Text variant="bodyMedium" style={[styles.stepDesc, { color: theme.colors.onSurfaceVariant }]}>
                {item.desc}
              </Text>
            </View>
          </View>
        ))}

        <View style={[styles.tipsBox, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text variant="labelLarge" style={{ marginBottom: 6 }}>💡 提示</Text>
          {POSTER_TIPS.map((tip, i) => (
            <Text key={i} variant="bodySmall" style={styles.tipText}>• {tip}</Text>
          ))}
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Helper Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="hand-heart-outline" size={22} color="#4CAF50" />
          <Text variant="titleLarge" style={styles.sectionTitle}>
            接单者（我想帮忙赚钱）
          </Text>
        </View>

        {HELPER_STEPS.map((item) => (
          <View key={item.step} style={styles.stepRow}>
            <View style={[styles.stepBadge, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.stepNumber, { color: '#2E7D32' }]}>{item.step}</Text>
            </View>
            <View style={styles.stepContent}>
              <Text variant="titleSmall" style={styles.stepTitle}>{item.title}</Text>
              <Text variant="bodyMedium" style={[styles.stepDesc, { color: theme.colors.onSurfaceVariant }]}>
                {item.desc}
              </Text>
            </View>
          </View>
        ))}

        <View style={[styles.tipsBox, { backgroundColor: '#E8F5E9' }]}>
          <Text variant="labelLarge" style={{ marginBottom: 6 }}>💡 提示</Text>
          {HELPER_TIPS.map((tip, i) => (
            <Text key={i} variant="bodySmall" style={styles.tipText}>• {tip}</Text>
          ))}
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Common Features */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="apps" size={22} color={theme.colors.outline} />
          <Text variant="titleLarge" style={styles.sectionTitle}>
            通用功能
          </Text>
        </View>

        {COMMON_FEATURES.map((item, i) => (
          <View key={i} style={styles.featureRow}>
            <MaterialCommunityIcons name={item.icon as any} size={20} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={[styles.featureText, { color: theme.colors.onSurfaceVariant }]}>
              {item.text}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.footer} />
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    lineHeight: 22,
  },
  divider: {
    marginVertical: 20,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  stepDesc: {
    lineHeight: 20,
  },
  tipsBox: {
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
  },
  tipText: {
    lineHeight: 20,
    marginBottom: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  featureText: {
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    height: 24,
  },
});
