import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type NativeTouchEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * Ported from the web app's `components/explore/photo-gallery.tsx`. Same
 * segmented-progress-bar look as `SwipeCard`, but with no drag gesture —
 * just tap-left-half/tap-right-half navigation. Used wherever someone's full
 * photo set needs to be shown "exactly like in Descubrir" (the match
 * celebration modal here, and `LikeReviewModal` in Phase 6).
 */
export function PhotoGallery({
  photos,
  alt,
  style,
}: {
  photos: string[];
  alt: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [index, setIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  function handleLayout(e: LayoutChangeEvent) {
    setContainerWidth(e.nativeEvent.layout.width);
  }

  function handleTap(e: NativeSyntheticEvent<NativeTouchEvent>) {
    if (photos.length < 2) return;
    const tapX = e.nativeEvent.locationX;
    if (tapX < containerWidth / 2) {
      setIndex((i) => Math.max(0, i - 1));
    } else {
      setIndex((i) => Math.min(photos.length - 1, i + 1));
    }
  }

  if (photos.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <LinearGradient colors={['#000000', '#404040']} style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Text style={styles.fallbackText}>{alt.charAt(0).toUpperCase()}</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <Pressable
      onLayout={handleLayout}
      onPress={handleTap}
      style={[styles.container, style]}
      disabled={photos.length < 2}
    >
      <Image source={{ uri: photos[index] ?? photos[0] }} style={StyleSheet.absoluteFill} contentFit="cover" />

      {photos.length > 1 && (
        <View style={styles.progressRow} pointerEvents="none">
          {photos.map((_, i) => (
            <View key={i} style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: i <= index ? '100%' : '0%' }]} />
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 48,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.9)',
  },
  progressRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 5,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
});
