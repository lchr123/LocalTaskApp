/**
 * My Reports Screen
 *
 * Displays the current user's submitted reports with status indicators.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, useTheme, Chip, ActivityIndicator, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../../services/api';
import { Report, ReportType } from '../../types/report';
import { REPORT_TYPE_LABELS } from '../../utils/constants';
import { formatRelativeTime } from '../../utils/formatters';

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  submitted: { label: '已提交', color: '#FF9800', icon: 'clock-outline' },
  reviewing: { label: '处理中', color: '#2196F3', icon: 'eye-outline' },
  resolved: { label: '已处理', color: '#4CAF50', icon: 'check-circle-outline' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function MyReportsScreen() {
  const theme = useTheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const res = await apiClient.get('/reports/mine');
      setReports(res.data.reports || []);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchReports();
  }, [fetchReports]);

  const renderItem = useCallback(({ item }: { item: Report }) => {
    const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.submitted;
    const typeLabel = REPORT_TYPE_LABELS[item.type as ReportType] || item.type;

    return (
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          {/* Header: type + status */}
          <View style={styles.cardHeader}>
            <Chip compact style={styles.typeChip} textStyle={styles.typeChipText}>
              {typeLabel}
            </Chip>
            <View style={styles.statusContainer}>
              <MaterialCommunityIcons
                name={statusInfo.icon as any}
                size={16}
                color={statusInfo.color}
              />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description} numberOfLines={3}>
            {item.description}
          </Text>

          {/* Footer: target + time */}
          <View style={styles.cardFooter}>
            <Text style={[styles.meta, { color: theme.colors.outline }]} numberOfLines={1}>
              {item.targetType === 'user' ? '👤 ' : '📋 '}
              {item.targetName || (item.targetType === 'user' ? '用户' : '任务')}
            </Text>
            <Text style={[styles.meta, { color: theme.colors.outline }]}>
              {formatRelativeTime(item.createdAt)}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }, [theme.colors.outline]);

  const keyExtractor = useCallback((item: Report) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (reports.length === 0) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="shield-check-outline" size={48} color="#9E9E9E" />
        <Text variant="bodyLarge" style={{ opacity: 0.6, marginTop: 12 }}>
          暂无举报记录
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reports}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeChip: {
    height: 26,
    backgroundColor: '#FFF3E0',
  },
  typeChipText: {
    fontSize: 12,
    color: '#E65100',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#424242',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    fontSize: 12,
  },
});
