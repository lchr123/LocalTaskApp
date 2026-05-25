/**
 * Navigation Reference
 *
 * Provides a navigation ref that can be used outside of React components
 * (e.g., in API interceptors) for programmatic navigation.
 *
 * Usage in App.tsx:
 *   <NavigationContainer ref={navigationRef}>
 *     ...
 *   </NavigationContainer>
 */

import { createNavigationContainerRef } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navigate to a screen from outside React components.
 * Safely checks if navigation is ready before navigating.
 */
export function navigateToAuth(): void {
  if (navigationRef.isReady()) {
    navigationRef.resetRoot({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  }
}
