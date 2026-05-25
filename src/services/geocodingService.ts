/**
 * Geocoding Service
 *
 * Provides geocoding (address → coordinates) and reverse geocoding (coordinates → address).
 *
 * Strategy:
 * - Native (iOS/Android): Uses expo-location's built-in geocoding (Apple/Google native)
 * - Web: Uses Google Geocoding REST API (requires API key)
 *
 * Requirements covered:
 * - 4A.3: Reverse geocoding when user taps map
 * - 4A.4: Geocoding when user inputs Japanese address
 * - 4A.5: Error handling for failed geocoding
 * - 4A.6: Validate coordinates within Japan
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * Google Maps API Key - loaded from environment or app config.
 * For development, set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file.
 * NEVER commit real API keys to source control.
 */
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';
const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Japan bounding box coordinates
 * Latitude: 20° ~ 46°
 * Longitude: 122° ~ 154°
 */
const JAPAN_BOUNDS = {
  latMin: 20,
  latMax: 46,
  lngMin: 122,
  lngMax: 154,
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GeocodedLocation {
  address: string;
  latitude: number;
  longitude: number;
}

// ─── Google Geocoding API (Web fallback) ─────────────────────────────────────

/**
 * Geocode address using Google Geocoding REST API.
 * Used on web where expo-location geocoding is not available.
 */
async function googleGeocodeAddress(address: string): Promise<GeocodedLocation | null> {
  try {
    const params = new URLSearchParams({
      address,
      key: GOOGLE_MAPS_API_KEY,
      language: 'ja',
      region: 'jp',
    });

    const response = await fetch(`${GOOGLE_GEOCODE_URL}?${params}`);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null;
    }

    const { lat, lng } = data.results[0].geometry.location;
    const formattedAddress = data.results[0].formatted_address || address;

    return {
      address: formattedAddress,
      latitude: lat,
      longitude: lng,
    };
  } catch {
    return null;
  }
}

/**
 * Reverse geocode coordinates using Google Geocoding REST API.
 * Used on web where expo-location reverse geocoding is not available.
 */
async function googleReverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: GOOGLE_MAPS_API_KEY,
      language: 'ja',
    });

    const response = await fetch(`${GOOGLE_GEOCODE_URL}?${params}`);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null;
    }

    return data.results[0].formatted_address || null;
  } catch {
    return null;
  }
}

// ─── Native Geocoding (expo-location) ────────────────────────────────────────

/**
 * Geocode address using expo-location (native iOS/Android).
 */
async function nativeGeocodeAddress(address: string): Promise<GeocodedLocation | null> {
  try {
    const results = await Location.geocodeAsync(address);
    if (results.length === 0) {
      return null;
    }

    const { latitude, longitude } = results[0];
    return {
      address,
      latitude,
      longitude,
    };
  } catch {
    return null;
  }
}

/**
 * Reverse geocode using expo-location (native iOS/Android).
 */
async function nativeReverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });

    if (results.length === 0) {
      return null;
    }

    const result = results[0];

    // Build Japanese-style address from components
    const parts: string[] = [];
    if (result.region) parts.push(result.region);
    if (result.city) parts.push(result.city);
    if (result.district) parts.push(result.district);
    if (result.street) parts.push(result.street);
    if (result.streetNumber) parts.push(result.streetNumber);
    if (result.name && !parts.includes(result.name)) parts.push(result.name);

    const address = parts.join('');
    return address || null;
  } catch {
    return null;
  }
}

// ─── Public API (platform-aware) ─────────────────────────────────────────────

/**
 * Convert an address string to geographic coordinates.
 * - Native: uses expo-location (Apple/Google native geocoder)
 * - Web: uses Google Geocoding REST API
 *
 * @param address - Address string (e.g. "東京都渋谷区神宮前1-1-1")
 * @returns GeocodedLocation or null if geocoding fails
 */
export async function geocodeAddress(address: string): Promise<GeocodedLocation | null> {
  if (Platform.OS === 'web') {
    return googleGeocodeAddress(address);
  }
  return nativeGeocodeAddress(address);
}

/**
 * Convert geographic coordinates to an address string.
 * - Native: uses expo-location (Apple/Google native geocoder)
 * - Web: uses Google Geocoding REST API
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Formatted address string or null if reverse geocoding fails
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (Platform.OS === 'web') {
    return googleReverseGeocode(lat, lng);
  }
  return nativeReverseGeocode(lat, lng);
}

/**
 * Validate that coordinates are within Japan's bounding box.
 * Japan: Latitude 20°~46°, Longitude 122°~154°
 *
 * @param lat - Latitude to validate
 * @param lng - Longitude to validate
 * @returns true if coordinates are within Japan
 */
export function isWithinJapan(lat: number, lng: number): boolean {
  return (
    lat >= JAPAN_BOUNDS.latMin &&
    lat <= JAPAN_BOUNDS.latMax &&
    lng >= JAPAN_BOUNDS.lngMin &&
    lng <= JAPAN_BOUNDS.lngMax
  );
}
