import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PhotoGallery } from '@/components/explore/photo-gallery';

/**
 * Confetti burst + bouncing-emoji pieces used by every "match celebration"
 * overlay in the app (Explore's instant-match modal from Phase 5, and the
 * Matches/Notifications screens' celebration overlays from Phase 6).
 *
 * Factored out of `app/(tabs)/explore.tsx` once a second and third caller
 * needed the exact same one-shot animation — previously it lived inline
 * there as `ConfettiParticle`/`Confetti`/`BouncingEmoji`.
 */

const CONFETTI_COLORS = ['#000000', '#171717', '#F59E0B', '#10B981'];
const CONFETTI_COUNT = 30;

function ConfettiParticle() {
  const translateY = useSharedValue(-20);
  const rotate = useSharedValue(0);

  // Math.random() is impure and must not run during render (React Compiler
  // flags exactly this) — a `useState` lazy initializer is the sanctioned
  // escape valve, since React guarantees the initializer function itself
  // only ever runs once per component instance, not on every render.
  const [{ left, color, delayMs, durationMs, rotateDeg }] = useState(() => ({
    left: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delayMs: Math.random() * 500,
    durationMs: 2000 + Math.random() * 1000,
    rotateDeg: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360),
  }));

  useEffect(() => {
    translateY.value = withDelay(delayMs, withTiming(420, { duration: durationMs, easing: Easing.linear }));
    rotate.value = withDelay(delayMs, withTiming(rotateDeg, { duration: durationMs, easing: Easing.linear }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { rotate: `${rotate.value}deg` }],
  }));

  return <Animated.View style={[styles.confettiParticle, style, { left: `${left}%`, backgroundColor: color }]} />;
}

/** One-shot 30-particle confetti burst for match-celebration overlays — no looping, matches the web's `animate-confetti` one-shot fall. */
export function Confetti() {
  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
        <ConfettiParticle key={i} />
      ))}
    </View>
  );
}

/** Continuous bounce, mirroring the web's Tailwind `animate-bounce` on the 🎉 emoji (loops for as long as the modal is open). */
export function BouncingEmoji() {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: 500, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) })
      ),
      -1,
      false
    );
  }, [translateY]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <Animated.View style={style}>
      <Text style={styles.celebrationEmoji}>🎉</Text>
    </Animated.View>
  );
}

/**
 * Full "It's a Match!" celebration overlay, ported from the near-identical
 * `justMatchedWith` blocks in the web app's `Matches.tsx` and
 * `Notifications.tsx` (`fixed inset-0 z-50 ... bg-black/70` with a bouncing
 * emoji, optional photo, and a single "Nice!" dismiss button). Both screens
 * render this the same way, so it's shared here rather than duplicated
 * twice — only the `photo` slot is optional, since Notifications' web
 * version only tracks the matched user's *name* (no photo data) while
 * Matches' tracks the full `fromUser` object.
 */
export function MatchCelebrationOverlay({
  title,
  subtitle,
  ctaLabel,
  onDismiss,
  photo,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
  onDismiss: () => void;
  photo?: { photos: string[]; alt: string };
}) {
  return (
    <Pressable style={styles.overlay} onPress={onDismiss}>
      <Confetti />
      <View style={styles.content}>
        <BouncingEmoji />
        <Text style={styles.title}>{title}</Text>

        {photo && (
          <PhotoGallery photos={photo.photos} alt={photo.alt} style={styles.photoGallery} />
        )}

        <Text style={styles.subtitle}>{subtitle}</Text>

        <Pressable onPress={onDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissButtonText}>{ctaLabel}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  confettiContainer: {
    ...StyleSheet.absoluteFill,
  },
  confettiParticle: {
    position: 'absolute',
    top: '-10%',
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  celebrationEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 50,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 24,
    textAlign: 'center',
  },
  photoGallery: {
    width: '100%',
    maxWidth: 220,
    aspectRatio: 3 / 4,
    borderRadius: 24,
    marginBottom: 24,
  },
  dismissButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  dismissButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
});
