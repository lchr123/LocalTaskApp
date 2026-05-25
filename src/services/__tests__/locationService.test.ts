/**
 * Unit Tests for Location Service
 *
 * Tests locationService methods for permission handling, position retrieval,
 * and distance calculation.
 *
 * Validates:
 * - Requirement 5.1: Get user's current location for nearby task queries
 * - Requirement 5.6: Handle location permission denial
 */

import { locationService } from '../locationService';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 3,
  },
}));

import * as Location from 'expo-location';

const mockRequestPermission = Location.requestForegroundPermissionsAsync as jest.MockedFunction<
  typeof Location.requestForegroundPermissionsAsync
>;
const mockGetPermission = Location.getForegroundPermissionsAsync as jest.MockedFunction<
  typeof Location.getForegroundPermissionsAsync
>;
const mockGetCurrentPosition = Location.getCurrentPositionAsync as jest.MockedFunction<
  typeof Location.getCurrentPositionAsync
>;

describe('LocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPermission', () => {
    it('returns true when permission is granted', async () => {
      mockRequestPermission.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as any);

      const result = await locationService.requestPermission();
      expect(result).toBe(true);
    });

    it('returns false when permission is denied (Req 5.6)', async () => {
      mockRequestPermission.mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as any);

      const result = await locationService.requestPermission();
      expect(result).toBe(false);
    });

    it('returns false when permission request throws', async () => {
      mockRequestPermission.mockRejectedValue(new Error('Permission error'));

      const result = await locationService.requestPermission();
      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('returns true when permission is already granted', async () => {
      mockGetPermission.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as any);

      const result = await locationService.hasPermission();
      expect(result).toBe(true);
    });

    it('returns false when permission is not granted', async () => {
      mockGetPermission.mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as any);

      const result = await locationService.hasPermission();
      expect(result).toBe(false);
    });
  });

  describe('getCurrentLocation', () => {
    it('returns location when permission is granted (Req 5.1)', async () => {
      mockRequestPermission.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as any);

      mockGetCurrentPosition.mockResolvedValue({
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as any);

      const location = await locationService.getCurrentLocation();

      expect(location).not.toBeNull();
      expect(location!.latitude).toBe(35.6762);
      expect(location!.longitude).toBe(139.6503);
      expect(location!.accuracy).toBe(10);
    });

    it('returns null when permission is denied (Req 5.6)', async () => {
      mockRequestPermission.mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as any);

      const location = await locationService.getCurrentLocation();
      expect(location).toBeNull();
    });

    it('returns null when getCurrentPositionAsync throws', async () => {
      mockRequestPermission.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as any);

      mockGetCurrentPosition.mockRejectedValue(new Error('Location timeout'));

      const location = await locationService.getCurrentLocation();
      expect(location).toBeNull();
    });
  });

  describe('calculateDistance', () => {
    it('returns 0 for the same point', () => {
      const point = { latitude: 35.6762, longitude: 139.6503 };
      const distance = locationService.calculateDistance(point, point);
      expect(distance).toBe(0);
    });

    it('calculates distance between Tokyo and Yokohama (~27km)', () => {
      const tokyo = { latitude: 35.6762, longitude: 139.6503 };
      const yokohama = { latitude: 35.4437, longitude: 139.6380 };

      const distance = locationService.calculateDistance(tokyo, yokohama);

      // Tokyo to Yokohama is approximately 26-28 km
      expect(distance).toBeGreaterThan(25);
      expect(distance).toBeLessThan(30);
    });

    it('calculates distance between two nearby points (~1km)', () => {
      const pointA = { latitude: 35.6762, longitude: 139.6503 };
      // Approximately 1km north
      const pointB = { latitude: 35.6852, longitude: 139.6503 };

      const distance = locationService.calculateDistance(pointA, pointB);

      expect(distance).toBeGreaterThan(0.9);
      expect(distance).toBeLessThan(1.1);
    });

    it('is symmetric (distance A→B equals B→A)', () => {
      const pointA = { latitude: 35.6762, longitude: 139.6503 };
      const pointB = { latitude: 34.6937, longitude: 135.5023 };

      const distAB = locationService.calculateDistance(pointA, pointB);
      const distBA = locationService.calculateDistance(pointB, pointA);

      expect(distAB).toBeCloseTo(distBA, 10);
    });
  });
});
