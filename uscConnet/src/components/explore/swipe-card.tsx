import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin } from 'lucide-react-native';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { RankBadge } from '@/components/leaderboard/rank-badge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Same 80pt threshold as the web's `Math.abs(dx) > 80` — preserved exactly.
const SWIPE_THRESHOLD = 80;
// Same tap-vs-swipe disambiguation window as the web's `Math.abs(dx) < 10 && elapsed < 300`.
const TAP_MAX_DISTANCE = 10;
const TAP_MAX_DURATION_MS = 300;
// Web animates the *outer wrapper* off-screen over ~280ms; we animate the
// card itself over the same duration for an equivalent "exit feel".
const EXIT_DURATION_MS = 280;
const SPRING_BACK_CONFIG = { damping: 20, stiffness: 300, mass: 0.5 };

export interface SwipeCardProfile {
  id: string;
  name: string;
  major: string;
  /** Present on the web's `SwipeProfile` type but never populated by the real
   * `getRandomUsers` endpoint today — kept for forward-compat parity. */
  age?: number;
  bio?: string | null;
  interests?: readonly string[];
}

export interface SwipeCardHandle {
  /**
   * Imperatively plays the exact same off-screen exit animation a drag
   * release triggers. Explore's Nope/Like buttons call this so a button tap
   * animates the card out instead of silently jumping to the next profile.
   */
  animateExit: (direction: 'left' | 'right') => void;
}

export interface SwipeCardProps {
  profile: SwipeCardProfile;
  /** Fully-resolved display list (profile photo first, then gallery) — callers pass `getDisplayPhotos(...)`. */
  photos: string[];
  /** Weekly top-100 users ranking; omitted entirely outside the top 100. */
  rank?: number;
  onSwipe: (direction: 'left' | 'right') => void;
}

/**
 * Ported from the web app's `components/explore/swipe-card.tsx`. The web
 * version drives everything off raw pointer events (`onPointerDown/Move/Up`)
 * and a single `dragX` bit of React state; here the drag lives entirely on
 * the UI thread via Reanimated shared values, with a single
 * `react-native-gesture-handler` Pan gesture standing in for the web's one
 * pointer-event handler set (see the tap-vs-swipe disambiguation inside
 * `.onEnd()` below — deliberately not a separate `Gesture.Tap()` composed
 * via `Race`/`Exclusive`, since the web's own logic is a single handler
 * making that same either/or decision, and RNGH's Pan event already carries
 * everything needed (`x`/`y` position, `translationX`) to replicate it
 * directly).
 *
 * Deviation from web: the web only ever translates along X (`dragX` comes
 * from `clientX` alone; there is no vertical tracking at all). This port
 * follows both axes with the finger for a more native drag feel, per this
 * phase's brief — this has no effect on swipe/tap logic, both of which are
 * still keyed purely off horizontal movement, exactly as on web.
 *
 * Also note: the web renders exactly one `<SwipeCard>` at a time (no
 * stacked-deck peek of upcoming cards) — confirmed by reading `Explore.tsx`
 * in full. This port matches that; no card-stack peek was invented.
 */
export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(function SwipeCard(
  { profile, photos, rank, onSwipe },
  ref
) {
  const { t } = useTranslation('translation', { keyPrefix: 'swipeCard' });
  const [photoIndex, setPhotoIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(SCREEN_WIDTH);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const gestureStartTime = useSharedValue(0);

  function goToPhoto(zone: 'prev' | 'next') {
    setPhotoIndex((i) => {
      if (zone === 'prev') return Math.max(0, i - 1);
      return Math.min(photos.length - 1, i + 1);
    });
  }

  function playExit(direction: 'left' | 'right') {
    const targetX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    translateX.value = withTiming(targetX, { duration: EXIT_DURATION_MS });
    // A little extra vertical drift on the way out reads more like a tossed
    // card than a rigid horizontal slide — small embellishment, no semantic
    // meaning (unlike the web, which has no exit-Y movement at all, since it
    // has no Y tracking to begin with).
    translateY.value = withTiming(translateY.value + 60, { duration: EXIT_DURATION_MS });
  }

  // Fires the swipe callback immediately (matching the web's synchronous
  // `onSwipe(...)` call inside `handlePointerUp`, which kicks off the
  // like-API call right away — only the index advance/undo bookkeeping is
  // delayed by 300ms on the parent side) while the exit animation plays
  // concurrently.
  function handleDragSwipe(direction: 'left' | 'right') {
    playExit(direction);
    onSwipe(direction);
  }

  useImperativeHandle(ref, () => ({
    animateExit: playExit,
  }));

  const panGesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      gestureStartTime.value = Date.now();
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const dx = event.translationX;
      const elapsed = Date.now() - gestureStartTime.value;

      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        const direction = dx > 0 ? 'right' : 'left';
        runOnJS(handleDragSwipe)(direction);
        return;
      }

      // Not a swipe — spring back to center, same as the web's CSS
      // transition kicking in once `isDragging` goes false.
      translateX.value = withSpring(0, SPRING_BACK_CONFIG);
      translateY.value = withSpring(0, SPRING_BACK_CONFIG);

      if (Math.abs(dx) < TAP_MAX_DISTANCE && elapsed < TAP_MAX_DURATION_MS) {
        // Tap: left third of the card = previous photo, rest = next photo —
        // same third-based split as the web (`tapX < rect.width / 3`), not a
        // simple half split.
        const zone: 'prev' | 'next' = event.x < cardWidth / 3 ? 'prev' : 'next';
        runOnJS(goToPhoto)(zone);
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      // Exact same multiplier as the web's `dx * 0.05deg` — this is the
      // specific "feel" of this card, preserved precisely.
      { rotate: `${translateX.value * 0.05}deg` },
    ],
  }));

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const nopeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const currentPhoto = photos[photoIndex] ?? photos[0];

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[styles.card, cardAnimatedStyle]}
        onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
      >
        {/* Background photo, or a gradient + giant initial when there are no photos */}
        {currentPhoto ? (
          <Image source={{ uri: currentPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <LinearGradient colors={['#000000', '#404040']} style={[StyleSheet.absoluteFill, styles.fallback]}>
            <Text style={styles.fallbackText}>{profile.name.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
        )}

        {/* Top-to-bottom gradient, for the progress-bar area's legibility */}
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Bottom-to-top gradient, for the profile-info block's legibility */}
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Photo progress bars — segmented, filled up to the current index, not a continuous timer bar */}
        {photos.length > 1 && (
          <View style={styles.progressRow} pointerEvents="none">
            {photos.map((_, i) => (
              <View key={i} style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: i <= photoIndex ? '100%' : '0%' }]} />
              </View>
            ))}
          </View>
        )}

        {/* LIKE stamp */}
        <Animated.View style={[styles.stamp, styles.likeStamp, likeStampStyle]} pointerEvents="none">
          <Text style={[styles.stampText, { color: '#4CD964' }]}>{t('like')}</Text>
        </Animated.View>

        {/* NOPE stamp */}
        <Animated.View style={[styles.stamp, styles.nopeStamp, nopeStampStyle]} pointerEvents="none">
          <Text style={[styles.stampText, { color: '#FF4458' }]}>{t('nope')}</Text>
        </Animated.View>

        {/* Bottom profile info */}
        <View style={styles.bottomInfo} pointerEvents="none">
          <View style={styles.badgesRow}>
            <View style={styles.nearbyPill}>
              <MapPin size={11} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.nearbyPillText}>{t('nearby')}</Text>
            </View>
            {rank != null && <RankBadge rank={rank} size="sm" />}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {profile.name}
            </Text>
            {profile.age != null && <Text style={styles.ageText}>{profile.age}</Text>}
          </View>

          <Text style={styles.bioText} numberOfLines={2}>
            {profile.bio || profile.major}
          </Text>

          <View style={styles.chipsRow}>
            {(profile.interests?.length ? profile.interests.slice(0, 3) : [profile.major]).map((tag) => (
              <View key={tag} style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  card: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    transformOrigin: 'center bottom',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 96,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.9)',
  },
  progressRow: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 5,
    zIndex: 10,
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
  stamp: {
    position: 'absolute',
    top: 96,
    borderRadius: 12,
    borderWidth: 3,
    paddingHorizontal: 16,
    paddingVertical: 6,
    zIndex: 20,
  },
  likeStamp: {
    left: 20,
    borderColor: '#4CD964',
    transform: [{ rotate: '-12deg' }],
  },
  nopeStamp: {
    right: 20,
    borderColor: '#FF4458',
    transform: [{ rotate: '12deg' }],
  },
  stampText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 3,
  },
  bottomInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  nearbyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1DA462',
  },
  nearbyPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    flexWrap: 'wrap',
  },
  nameText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ageText: {
    fontSize: 22,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.9)',
  },
  bioText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 6,
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  chip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
