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
