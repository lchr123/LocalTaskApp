/**
 * ImageViewerModal
 *
 * A lightweight, dependency-free full-screen image viewer.
 * - Tap a thumbnail elsewhere to open at a given index
 * - Swipe horizontally to move between images
 * - Tap the image or the close button to dismiss
 * - Page indicator (n / total) when multiple images
 *
 * Works on web and native. Reusable for any image gallery (task images, chat, ...).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';

export interface ImageViewerModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageViewerModal({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: ImageViewerModalProps) {
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(initialIndex);

  // Jump to the tapped image when opened
  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      // Defer to allow layout before scrolling
      const t = setTimeout(() => {
        scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
      }, 0);
      return () => clearTimeout(t);
    }
  }, [visible, initialIndex, width]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <IconButton
          icon="close"
          iconColor="#fff"
          size={28}
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityLabel="关闭图片查看"
        />

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            setIndex(i);
          }}
        >
          {images.map((url, i) => (
            <TouchableOpacity
              key={`${url}-${i}`}
              activeOpacity={1}
              onPress={onClose}
              style={[styles.page, { width, height }]}
              accessibilityLabel={`图片 ${i + 1}，点击关闭`}
            >
              <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {images.length > 1 && (
          <View style={styles.indicator}>
            <Text style={styles.indicatorText}>
              {index + 1} / {images.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 12,
    zIndex: 10,
  },
  page: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  indicator: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  indicatorText: {
    color: '#fff',
    fontSize: 14,
  },
});
