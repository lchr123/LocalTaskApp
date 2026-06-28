/**
 * SafeAreaTop
 *
 * Pushes screen content below the device status bar.
 *
 * Why this is needed:
 * Starting with Expo SDK 53 (React Native 0.85 here), Android edge-to-edge
 * is enabled by default and can no longer be turned off. App content is drawn
 * behind the transparent status bar, so any screen that hides the navigation
 * header (`headerShown: false`) renders its top bar underneath the status bar,
 * making that strip unclickable.
 *
 * This wrapper reads the top safe-area inset and applies it as top padding.
 * - Android: inset equals the status bar height → content moves down correctly.
 * - iOS: inset equals the notch/status bar height → consistent behavior.
 * - Web: inset is 0 (no system status bar) → layout is unchanged.
 *
 * Must be rendered inside a `SafeAreaProvider` (added in App.tsx).
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface SafeAreaTopProps {
  children: React.ReactNode;
  /** Background color shown behind the status bar strip. Defaults to white. */
  backgroundColor?: string;
  style?: ViewStyle;
}

export function SafeAreaTop({
  children,
  backgroundColor = '#fff',
  style,
}: SafeAreaTopProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { paddingTop: insets.top, backgroundColor }, style]}
    >
      {children}
    </View>
  );
}

/**
 * HOC that wraps a screen component with SafeAreaTop.
 *
 * Intended for tab/stack ROOT screens that use `headerShown: false`.
 * Do NOT use on pushed screens that render a native navigation header —
 * the native header already accounts for the status bar.
 *
 * Call this at module scope (not inside render) so the wrapped component
 * keeps a stable identity and the screen is not remounted on every render.
 */
export function withSafeAreaTop<P extends object>(
  Component: React.ComponentType<P>,
  backgroundColor = '#fff'
): React.FC<P> {
  const Wrapped: React.FC<P> = (props: P) => (
    <SafeAreaTop backgroundColor={backgroundColor}>
      <Component {...props} />
    </SafeAreaTop>
  );

  Wrapped.displayName = `withSafeAreaTop(${Component.displayName || Component.name || 'Screen'})`;
  return Wrapped;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
