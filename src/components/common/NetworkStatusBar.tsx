/**
 * Network Status Bar
 *
 * Global banner that displays when the device is offline.
 * Uses @react-native-community/netinfo to monitor connectivity.
 * Shows a dismissible snackbar-style banner at the bottom of the screen.
 *
 * Requirements covered:
 * - 7.6: Display network exception prompt
 * - 10.4: Display error messages when network fails
 * - Design (Non-Functional): Show global notification bar when network disconnects
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export function NetworkStatusBar(): React.JSX.Element | null {
  const [isOffline, setIsOffline] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);

      if (offline) {
        setVisible(true);
      }
    });

    // Check initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);
      if (offline) {
        setVisible(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-dismiss when back online
  useEffect(() => {
    if (!isOffline && visible) {
      // Keep showing briefly so user sees the "back online" state
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, visible]);

  const message = isOffline
    ? '网络连接已断开，请检查网络设置'
    : '网络已恢复';

  return (
    <Snackbar
      visible={visible}
      onDismiss={() => setVisible(false)}
      duration={isOffline ? Number.MAX_SAFE_INTEGER : 2000}
      style={[styles.snackbar, isOffline ? styles.offline : styles.online]}
      action={
        isOffline
          ? {
              label: '关闭',
              onPress: () => setVisible(false),
            }
          : undefined
      }
      accessibilityLabel={isOffline ? '网络已断开提示' : '网络已恢复提示'}
    >
      {message}
    </Snackbar>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    marginBottom: 16,
  },
  offline: {
    backgroundColor: '#F44336',
  },
  online: {
    backgroundColor: '#4CAF50',
  },
});

export default NetworkStatusBar;
