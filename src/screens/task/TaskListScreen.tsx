/**
 * Task List Screen
 *
 * Displays a list of nearby available tasks within 10km radius.
 * Supports pull-to-refresh, infinite scroll pagination, and location handling.
 *
 * Requirements covered:
 * - 5.1: Display tasks within 10km, sorted by distance then time
 * - 5.2: Show task type, description summary, location, reward, time
 * - 5.4: Pull-to-refresh within 5 seconds
 * - 5.6: Handle location permission denied
 * - 5.7: Show empty state when no tasks available
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ListRenderItemInfo,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Text, Icon, Button } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTaskStore } from '../../stores/taskStore';
import { Task } from '../../types/task';
import { TaskCard } from '../../components/task/TaskCard';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorRetry } from '../../components/common/ErrorRetry';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { PAGINATION, TASK_TYPE_LABELS } from '../../utils/constants';
import FilterBar from '../../components/task/FilterBar';
import CityPickerModal from '../../components/task/CityPickerModal';
import { JpPrefecture } from '../../utils/jpCities';

type TaskListNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'TaskList'>;
type TaskListRouteProp = RouteProp<HomeStackParamList, 'TaskList'>;

/**
 * TaskListScreen renders the main task browsing interface.
 * Uses FlatList for virtualized rendering with pagination (20 items per page).
 *
 * `route.params.kind` selects the domain (task / marketplace) chosen on the
 * CategoryPicker screen; it is pushed into taskStore so fetchTasks/loadMore/
 * refresh all filter by it.
 */
export default function TaskListScreen() {
  const navigation = useNavigation<TaskListNavigationProp>();
  const route = useRoute<TaskListRouteProp>();
  const { kind } = route.params;
  const isInitializedRef = useRef(false);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  // Whether the very first task load has completed. After that, filter-driven
  // refetches must NOT replace the whole screen with a fullscreen loader (which
  // would unmount the FilterBar and close any open filter dropdown).
  const [hasLoaded, setHasLoaded] = useState(false);
  const prevLoadingRef = useRef(false);

  const {
    tasks,
    isLoading,
    error,
    hasMore,
    userLocation,
    locationDenied,
    locationBlocked,
    locationServicesOff,
    isLocating,
    manualCity,
    filter,
    initLocation,
    setManualLocation,
    openLocationSettings,
    setKind,
    fetchTasks,
    loadMore,
    refresh,
    setFilter,
    clearError,
  } = useTaskStore();

  /**
   * Initialize location and fetch tasks on mount.
   * Requirement 5.1: Load tasks based on user's current location.
   */
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      setKind(kind);
      initializeScreen();
    }
  }, []);

  const initializeScreen = async () => {
    await initLocation();
    // fetchTasks will be triggered after location is set
  };

  /**
   * Sync the store's active domain whenever route.params.kind changes.
   *
   * React Navigation reuses this screen's instance when navigating back to an
   * existing 'TaskList' route (e.g. CategoryPicker → task → back →
   * marketplace), merging the new params instead of remounting. Without this,
   * a second visit with a different kind would keep showing the first kind's
   * data. Skipped on the very first render (handled by the mount effect above
   * to avoid double-fetching).
   */
  const prevKindRef = useRef(kind);
  useEffect(() => {
    if (prevKindRef.current === kind) return;
    prevKindRef.current = kind;
    setKind(kind);
    if (userLocation) {
      fetchTasks();
    }
  }, [kind]);

  /**
   * Fetch tasks when location becomes available.
   */
  useEffect(() => {
    if (userLocation && isInitializedRef.current) {
      fetchTasks();
    }
  }, [userLocation]);

  /**
   * Re-fetch tasks when filter changes (e.g., radius).
   */
  useEffect(() => {
    if (userLocation && isInitializedRef.current) {
      fetchTasks();
    }
  }, [filter]);

  /**
   * Mark the first load as complete once loading transitions from true → false.
   * Used to ensure the fullscreen loader only shows on the very first load.
   */
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      setHasLoaded(true);
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  /**
   * Handle pull-to-refresh.
   * Requirement 5.4: Refresh completes within 5 seconds.
   */
  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  /**
   * Handle infinite scroll - load next page.
   * Requirement 5.1: Each page shows up to 20 tasks.
   */
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadMore();
    }
  }, [isLoading, hasMore, loadMore]);

  /**
   * Navigate to task detail when a card is pressed.
   */
  const handleTaskPress = useCallback(
    (task: Task) => {
      navigation.navigate('TaskDetail', { taskId: task.id });
    },
    [navigation]
  );

  /**
   * Retry location initialization.
   */
  const handleRetryLocation = useCallback(async () => {
    await initLocation();
  }, [initLocation]);

  /**
   * Open the system settings so the user can grant location permission.
   * Used when the permission is permanently denied (canAskAgain === false),
   * because re-requesting in-app no longer surfaces the OS dialog.
   */
  const handleOpenSettings = useCallback(async () => {
    await openLocationSettings();
  }, [openLocationSettings]);

  /**
   * Handle manual city selection from the picker.
   */
  const handleSelectCity = useCallback(
    (city: JpPrefecture) => {
      setCityPickerVisible(false);
      setManualLocation(city);
    },
    [setManualLocation]
  );

  /**
   * Render individual task card.
   */
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Task>) => (
      <TaskCard task={item} onPress={handleTaskPress} />
    ),
    [handleTaskPress]
  );

  /**
   * Key extractor for FlatList.
   */
  const keyExtractor = useCallback((item: Task) => item.id, []);

  /**
   * Render footer with loading indicator for pagination.
   */
  const renderFooter = useCallback(() => {
    if (!isLoading || tasks.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <LoadingIndicator mode="inline" size="small" accessibilityLabel="加载更多任务" />
      </View>
    );
  }, [isLoading, tasks.length]);

  /**
   * Render empty state when no tasks are available.
   * Requirement 5.7: Show empty state message.
   */
  const renderEmptyComponent = useCallback(() => {
    if (isLoading) return null;

    return (
      <EmptyState
        icon="clipboard-text-outline"
        message="附近暂无可接任务"
        description="当前范围内没有找到可接的任务，请稍后再试"
        actionLabel="刷新"
        onAction={handleRefresh}
        accessibilityLabel="空状态: 附近暂无可接任务"
      />
    );
  }, [isLoading, handleRefresh]);

  /**
   * Requirement 5.6: Handle location permission denied.
   * Show a prompt to enable location services.
   * Web platforms show browser-specific instructions since re-requesting won't trigger a prompt.
   */
  if (locationDenied) {
    const isWeb = Platform.OS === 'web';

    return (
      <View style={styles.centeredContainer} accessibilityLabel="定位权限提示">
        <Icon source="map-marker-off" size={64} color="#BDBDBD" />
        <Text style={styles.permissionTitle}>需要定位权限</Text>
        {isWeb ? (
          <>
            <Text style={styles.permissionDescription}>
              浏览器已阻止定位权限，请在浏览器设置中允许本站访问位置信息，然后刷新页面重试。
            </Text>
          </>
        ) : (
          <>
            {locationBlocked ? (
              <>
                <Text style={styles.permissionDescription}>
                  定位权限已被拒绝，系统已不再弹出授权请求。请前往系统设置手动开启定位权限后返回重试。
                </Text>
                <Button
                  mode="contained"
                  onPress={handleOpenSettings}
                  style={styles.permissionButton}
                  accessibilityLabel="前往系统设置开启定位权限"
                >
                  去系统设置开启
                </Button>
              </>
            ) : locationServicesOff ? (
              <>
                <Text style={styles.permissionDescription}>
                  设备的定位服务（系统 GPS 开关）未开启。请在系统设置中打开定位后重试。
                </Text>
                <Button
                  mode="contained"
                  onPress={handleRetryLocation}
                  loading={isLocating}
                  disabled={isLocating}
                  style={styles.permissionButton}
                  accessibilityLabel="重试获取定位"
                >
                  已开启，重试
                </Button>
              </>
            ) : (
              <>
                <Text style={styles.permissionDescription}>
                  请开启定位权限以查看附近的任务
                </Text>
                <Button
                  mode="contained"
                  onPress={handleRetryLocation}
                  loading={isLocating}
                  disabled={isLocating}
                  style={styles.permissionButton}
                  accessibilityLabel="重新获取定位权限"
                >
                  重新获取权限
                </Button>
              </>
            )}
          </>
        )}

        <Text style={styles.orDivider}>或</Text>
        <Button
          mode="outlined"
          icon="city-variant-outline"
          onPress={() => setCityPickerVisible(true)}
          style={styles.cityButton}
          accessibilityLabel="选择地区浏览任务"
        >
          选择地区浏览任务
        </Button>
        <Text style={styles.cityHint}>
          不开启定位也可以浏览，选择一个地区即可查看该区域附近的任务
        </Text>

        <CityPickerModal
          visible={cityPickerVisible}
          selectedId={manualCity?.id ?? null}
          onSelect={handleSelectCity}
          onDismiss={() => setCityPickerVisible(false)}
        />
      </View>
    );
  }

  /**
   * Show initial loading state.
   */
  if (isLoading && tasks.length === 0 && !error && !hasLoaded) {
    return (
      <View style={styles.container} accessibilityLabel="任务列表加载中">
        <LoadingIndicator
          mode="fullscreen"
          message="正在加载附近任务..."
          accessibilityLabel="加载任务列表"
        />
      </View>
    );
  }

  /**
   * Show error state with retry option.
   */
  if (error && tasks.length === 0) {
    return (
      <View style={styles.centeredContainer} accessibilityLabel="任务列表错误">
        <ErrorRetry
          errorMessage={error}
          onRetry={async () => {
            clearError();
            await fetchTasks();
          }}
          accessibilityLabel="任务加载失败"
        />
      </View>
    );
  }

  return (
    <View style={styles.container} accessibilityLabel="任务列表">
      <View style={styles.locationBar}>
        <Icon source="map-marker" size={16} color="#1565C0" />
        <Text style={styles.locationBarText} numberOfLines={1}>
          {manualCity ? `当前地区：${manualCity.nameJa}` : '当前位置：自动定位'}
        </Text>
        <TouchableOpacity
          onPress={() => setCityPickerVisible(true)}
          style={styles.switchCityBtn}
          accessibilityLabel="切换地区"
          accessibilityRole="button"
        >
          <Text style={styles.switchCityText}>{manualCity ? '切换地区' : '选择地区'}</Text>
        </TouchableOpacity>
        {manualCity && (
          <TouchableOpacity
            onPress={handleRetryLocation}
            style={styles.switchCityBtn}
            accessibilityLabel="使用当前定位"
            accessibilityRole="button"
          >
            <Text style={styles.switchCityText}>用定位</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.rangeHint}>
        <Text style={styles.rangeHintLabel}>📍 搜索范围：</Text>
        {[5, 10, 20, 50, 100].map((km) => (
          <TouchableOpacity
            key={km}
            onPress={() => {
              setFilter({ radius: km });
            }}
            style={[
              styles.rangeChip,
              (filter.radius ?? 100) === km && styles.rangeChipActive,
            ]}
            accessibilityLabel={`搜索范围${km}公里`}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.rangeChipText,
                (filter.radius ?? 100) === km && styles.rangeChipTextActive,
              ]}
            >
              {km}km
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter & Sort Bar */}
      <View style={styles.filterRow}>
        <View style={styles.filterBarWrapper}>
          <FilterBar filter={filter} setFilter={setFilter} />
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Help')}
          style={styles.helpButton}
          accessibilityLabel="使用帮助"
          accessibilityRole="button"
        >
          <Icon source="help-circle-outline" size={22} color="#757575" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={
          tasks.length === 0 ? styles.emptyListContent : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading && tasks.length > 0}
            onRefresh={handleRefresh}
            tintColor="#1976D2"
            title="下拉刷新"
            accessibilityLabel="下拉刷新任务列表"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyComponent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={PAGINATION.DEFAULT_PAGE_SIZE}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        accessibilityLabel="任务列表"
        accessibilityRole="list"
      />

      <CityPickerModal
        visible={cityPickerVisible}
        selectedId={manualCity?.id ?? null}
        onSelect={handleSelectCity}
        onDismiss={() => setCityPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    gap: 4,
  },
  locationBarText: {
    flex: 1,
    fontSize: 13,
    color: '#1565C0',
    marginLeft: 2,
  },
  switchCityBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
  },
  switchCityText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  rangeHint: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rangeHintLabel: {
    fontSize: 13,
    color: '#1565C0',
  },
  rangeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  rangeChipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  rangeChipText: {
    fontSize: 12,
    color: '#1565C0',
  },
  rangeChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  filterBarWrapper: {
    flex: 1,
  },
  helpButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 32,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: 16,
  },
  permissionTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
    textAlign: 'center',
  },
  permissionDescription: {
    marginTop: 8,
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionButton: {
    marginTop: 24,
  },
  orDivider: {
    marginTop: 20,
    fontSize: 13,
    color: '#9E9E9E',
  },
  cityButton: {
    marginTop: 12,
  },
  cityHint: {
    marginTop: 12,
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    lineHeight: 18,
  },
});
