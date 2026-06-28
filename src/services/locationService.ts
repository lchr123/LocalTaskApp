/**
 * Location Service
 *
 * Handles location permissions, current position retrieval, and distance calculations.
 * Uses expo-location for cross-platform geolocation support.
 *
 * Requirements covered:
 * - 5.1: Get tasks within 10km radius of user's current location
 * - 5.6: Handle location permission denial
 */

import * as Location from 'expo-location';
import { TIMEOUTS } from '../utils/constants';

/**
 * Represents a user's geographic coordinates with accuracy info
 */
export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

/**
 * Detailed foreground location permission state.
 * `canAskAgain` is false once the user has permanently denied the permission
 * (Android "don't ask again" / iOS after first denial). In that state the OS
 * will no longer surface the system permission dialog, and the only path to
 * re-grant is the system Settings screen.
 */
export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

/**
 * Earth's radius in kilometers (used for Haversine formula)
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

class LocationService {
  /**
   * Request foreground location permission from the user.
   * Returns true if permission is granted, false otherwise.
   *
   * Requirement 5.6: If location cannot be obtained, prompt user to enable permission.
   */
  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Check if location permission is currently granted without prompting.
   */
  async hasPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Read the current foreground permission state WITHOUT prompting.
   * Used to distinguish "denied but can still ask" from "permanently denied",
   * so the UI can decide between re-requesting and deep-linking to Settings.
   */
  async getPermissionStatus(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      return { granted: status === 'granted', canAskAgain };
    } catch {
      // On failure, assume we can still ask (don't trap the user in a Settings-only state).
      return { granted: false, canAskAgain: true };
    }
  }

  /**
   * Open the OS settings screen for this app so the user can manually enable
   * location permission. This is the only recovery path once the permission is
   * permanently denied (canAskAgain === false), because the system will no
   * longer show the in-app permission dialog.
   *
   * No-op on web, where there is no per-app OS settings screen (the browser
   * manages site location permission).
   */
  async openSettings(): Promise<void> {
    // Lazily import react-native so this module can be unit-tested without the
    // react-native runtime (which jest's node environment cannot load directly).
    try {
      const { Linking, Platform } = await import('react-native');
      if (Platform.OS === 'web') {
        return;
      }
      await Linking.openSettings();
    } catch {
      // Ignore — nothing else we can do if the settings deep link fails.
    }
  }

  /**
   * Get the user's current location.
   * Returns null if permission is denied or location cannot be determined.
   *
   * Requirement 5.1: Obtain user's current position for nearby task queries.
   */
  async getCurrentLocation(): Promise<UserLocation | null> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: TIMEOUTS.LOCATION_TIMEOUT,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };
    } catch {
      return null;
    }
  }

  /**
   * Calculate the distance between two geographic points using the Haversine formula.
   * Returns distance in kilometers.
   *
   * Used for sorting tasks by distance from user's current location.
   */
  calculateDistance(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): number {
    const dLat = toRadians(to.latitude - from.latitude);
    const dLng = toRadians(to.longitude - from.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(from.latitude)) *
        Math.cos(toRadians(to.latitude)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
  }
}

export const locationService = new LocationService();
