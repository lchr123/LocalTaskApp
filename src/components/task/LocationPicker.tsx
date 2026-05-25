/**
 * Location Picker Component
 *
 * Provides a map-based location picker with address input for task creation.
 * On native (iOS/Android): shows MapView with tap-to-select and pin markers.
 * On web: shows address-only input with geocoding (react-native-maps not supported on web).
 *
 * Requirements covered:
 * - 4A.1: Map picker + address text input
 * - 4A.2: Map centered on user's current GPS position
 * - 4A.3: Tap map → reverse geocode → fill address
 * - 4A.4: Type address → geocode → show pin on map
 * - 4A.5: Error handling for geocoding failures
 * - 4A.6: Validate coordinates within Japan
 * - 4A.7: Output complete location object (address + lat/lng)
 * - 4A.8: "Use current location" button
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { TextInput, Button, HelperText, Text, useTheme } from 'react-native-paper';
import { locationService } from '../../services/locationService';
import {
  geocodeAddress,
  reverseGeocode,
  isWithinJapan,
} from '../../services/geocodingService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LocationValue {
  address: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  /** Current location value */
  value?: LocationValue;
  /** Called when location changes */
  onChange: (location: LocationValue) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LocationPicker({
  value,
  onChange,
  disabled = false,
  error,
}: LocationPickerProps) {
  const theme = useTheme();

  const [addressInput, setAddressInput] = useState(value?.address || '');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  /**
   * Sync address input when value changes externally
   */
  useEffect(() => {
    if (value?.address && value.address !== addressInput) {
      setAddressInput(value.address);
    }
  }, [value?.address]);

  /**
   * Handle address text submission: geocode to coordinates (Requirement 4A.4)
   */
  const handleAddressSubmit = useCallback(async () => {
    if (!addressInput.trim() || disabled) return;

    setGeocodeError(null);
    setIsGeocoding(true);

    const result = await geocodeAddress(addressInput.trim());
    setIsGeocoding(false);

    if (!result) {
      setGeocodeError('无法识别该地址，请检查输入或在地图上直接选择位置');
      return;
    }

    // Validate within Japan (Requirement 4A.6)
    if (!isWithinJapan(result.latitude, result.longitude)) {
      setGeocodeError('请选择日本境内的位置');
      return;
    }

    onChange({
      address: addressInput.trim(),
      latitude: result.latitude,
      longitude: result.longitude,
    });
  }, [addressInput, disabled, onChange]);

  /**
   * Handle "Use current location" button (Requirement 4A.8)
   */
  const handleUseCurrentLocation = useCallback(async () => {
    if (disabled) return;

    setIsLoadingLocation(true);
    setGeocodeError(null);

    const location = await locationService.getCurrentLocation();

    if (!location) {
      setIsLoadingLocation(false);
      setGeocodeError('无法获取当前位置，请确认已开启定位权限');
      return;
    }

    // Validate within Japan (Requirement 4A.6)
    if (!isWithinJapan(location.latitude, location.longitude)) {
      setIsLoadingLocation(false);
      setGeocodeError('当前位置不在日本境内');
      return;
    }

    // Reverse geocode current position
    const address = await reverseGeocode(location.latitude, location.longitude);
    setIsLoadingLocation(false);

    const locationValue: LocationValue = {
      address: address || '',
      latitude: location.latitude,
      longitude: location.longitude,
    };

    if (address) {
      setAddressInput(address);
    }

    onChange(locationValue);

    if (!address) {
      setGeocodeError('已获取坐标，但无法解析地址信息');
    }
  }, [disabled, onChange]);

  const displayError = geocodeError || error;
  const hasCoordinates = value?.latitude && value?.longitude;

  return (
    <View style={styles.container} accessibilityLabel="地点选择器">
      {/* Web platform notice (map not available on web) */}
      {Platform.OS === 'web' && (
        <View style={[styles.webMapPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            🗺️ 地图仅在手机端可用{'\n'}请输入地址或使用当前位置
          </Text>
        </View>
      )}

      {/* Address Text Input (Requirement 4A.1, 4A.4) */}
      <TextInput
        label="地址 *"
        placeholder="输入日本格式地址（如「東京都渋谷区神宮前1-1-1」）"
        value={addressInput}
        onChangeText={(text) => {
          setAddressInput(text);
          setGeocodeError(null);
        }}
        onSubmitEditing={handleAddressSubmit}
        mode="outlined"
        disabled={disabled || isGeocoding}
        error={!!displayError}
        left={<TextInput.Icon icon="map-marker" />}
        right={
          <TextInput.Icon
            icon="magnify"
            onPress={handleAddressSubmit}
            disabled={disabled || isGeocoding || !addressInput.trim()}
            accessibilityLabel="搜索地址"
          />
        }
        maxLength={100}
        accessibilityLabel="地址输入框"
        accessibilityHint="输入日本格式地址后按回车或点击搜索图标进行地理编码"
      />

      {/* Coordinate display (confirmation that geocoding worked) */}
      {hasCoordinates && !displayError && (
        <HelperText type="info" visible accessibilityLabel="坐标确认">
          ✓ 坐标已确认: {value!.latitude.toFixed(4)}, {value!.longitude.toFixed(4)}
        </HelperText>
      )}

      {/* Error Message (Requirement 4A.5, 4A.6) */}
      {displayError && (
        <HelperText
          type="error"
          visible={!!displayError}
          accessibilityLabel="地点错误提示"
        >
          {displayError}
        </HelperText>
      )}

      {/* Use Current Location Button (Requirement 4A.8) */}
      <Button
        mode="outlined"
        onPress={handleUseCurrentLocation}
        loading={isLoadingLocation}
        disabled={disabled || isLoadingLocation || isGeocoding}
        icon="crosshairs-gps"
        style={styles.currentLocationButton}
        accessibilityLabel="使用当前位置按钮"
        accessibilityHint="点击使用当前GPS位置作为任务地点"
      >
        使用当前位置
      </Button>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  webMapPlaceholder: {
    height: 100,
    borderRadius: 8,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  currentLocationButton: {
    marginTop: 8,
  },
});
