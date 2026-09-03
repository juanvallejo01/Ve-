import { LinearGradient } from 'expo-linear-gradient';
import { type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/context/theme-context';

import { GlassSurface } from './glass-surface';

export interface LiquidGlassIconProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  size?: number;
  /** Unread-count style badge. Undefined/0 renders nothing. */
  badge?: number;
  onPress: () => void;
}

const PILL_PADDING = 8;
const PILL_RADIUS = 16;
const BLOB_OVERSHOOT = 6; // mirrors the web version's `-m-1.5` (6px) blob bleed

const MORPH_SEGMENT_MS = 2667; // 8s / 3 keyframes, matches `blob-morph` CSS animation
const SHIMMER_DURATION_MS = 2000;
const PULSE_DURATION_MS = 1000;

export function LiquidGlassIcon({
  icon: Icon,
  label,
  isActive,
  size = 22,
  badge,
  onPress,
}: LiquidGlassIconProps) {
  const { theme, colors, gradients } = useTheme();
  const isDark = theme === 'dark';

  const press = useSharedValue(1);
  const morph = useSharedValue(0);
  const shimmer = useSharedValue(-1);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      morph.value = withRepeat(
        withSequence(
          withTiming(1, { duration: MORPH_SEGMENT_MS, easing: Easing.inOut(Easing.ease) }),
          withTiming(2, { duration: MORPH_SEGMENT_MS, easing: Easing.inOut(Easing.ease) }),
          withTiming(3, { duration: MORPH_SEGMENT_MS, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
      shimmer.value = withRepeat(
        withTiming(1, { duration: SHIMMER_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
        -1,
        false
      );
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: PULSE_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: PULSE_DURATION_MS, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    } else {
      morph.value = 0;
      shimmer.value = -1;
      pulse.value = 0;
    }
  }, [isActive, morph, shimmer, pulse]);

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  const blobStyleA = useAnimatedStyle(() => ({
    borderRadius: interpolate(morph.value, [0, 1, 2, 3], [18, 24, 20, 18]),
    transform: [
      { scale: interpolate(morph.value, [0, 1, 2, 3], [1, 1.05, 0.95, 1]) },
      { rotate: `${interpolate(morph.value, [0, 1, 2, 3], [0, 120, 240, 360])}deg` },
    ],
  }));

  const blobStyleB = useAnimatedStyle(() => ({
    borderRadius: interpolate(morph.value, [0, 1, 2, 3], [20, 16, 22, 20]),
    transform: [
      { scale: interpolate(morph.value, [0, 1, 2, 3], [1, 1.08, 0.92, 1]) },
      { rotate: `${interpolate(morph.value, [0, 1, 2, 3], [0, -120, -240, -360])}deg` },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: isActive ? 1 : 0,
    transform: [
      { translateX: interpolate(shimmer.value, [-1, 1], [-80, 80], Extrapolation.CLAMP) },
      { rotate: '20deg' },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.3, 0.6]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.2]) }],
  }));

  const iconColor = isActive ? colors.tabActiveIcon : colors.tabInactiveIcon;
  const badgeLabel = badge && badge > 9 ? '9+' : String(badge ?? '');

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => {
        press.value = withTiming(0.92, { duration: 100 });
      }}
      onPressOut={() => {
        press.value = withTiming(1, { duration: 150 });
      }}
      hitSlop={8}
      style={styles.pressable}
    >
      <Animated.View style={pressStyle}>
        <View style={styles.blobLayer} pointerEvents="none">
          {isActive ? (
            <>
              <Animated.View style={[styles.blob, blobStyleA]}>
                <LinearGradient
                  colors={isDark ? ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)'] : ['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.08)']}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
              <Animated.View style={[styles.blob, blobStyleB]}>
                <LinearGradient
                  colors={isDark ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.08)'] : ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.08)']}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </>
          ) : null}
        </View>

        <GlassSurface
          tint={isDark ? 'dark' : 'light'}
          intensity={isActive ? 60 : 25}
          style={[
            styles.pill,
            {
              backgroundColor: isActive
                ? isDark
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(255,255,255,0.9)'
                : isDark
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(255,255,255,0.4)',
            },
          ]}
        >
          {isActive ? (
            <View style={styles.shimmerClip} pointerEvents="none">
              <Animated.View style={[styles.shimmerBar, shimmerStyle]}>
                <LinearGradient
                  colors={
                    isDark
                      ? ['transparent', 'rgba(255,255,255,0.15)', 'transparent']
                      : ['transparent', 'rgba(255,255,255,0.6)', 'transparent']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>
          ) : null}

          <View style={styles.iconWrap}>
            {isActive ? (
              <Animated.View style={[styles.pulseGlow, pulseStyle]}>
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { borderRadius: 999, backgroundColor: isDark ? '#FFFFFF' : '#000000' },
                  ]}
                />
              </Animated.View>
            ) : null}
            <Icon size={size} color={iconColor} strokeWidth={isActive ? 2.5 : 2} />
          </View>
        </GlassSurface>

        {badge && badge > 0 ? (
          <View style={styles.badgeWrap}>
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badge}
            >
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </LinearGradient>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobLayer: {
    position: 'absolute',
    top: -BLOB_OVERSHOOT,
    left: -BLOB_OVERSHOOT,
    right: -BLOB_OVERSHOOT,
    bottom: -BLOB_OVERSHOOT,
  },
  blob: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  pill: {
    padding: PILL_PADDING,
    borderRadius: PILL_RADIUS,
    overflow: 'hidden',
  },
  shimmerClip: {
    ...StyleSheet.absoluteFill,
    borderRadius: PILL_RADIUS,
    overflow: 'hidden',
  },
  shimmerBar: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    width: 24,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseGlow: {
    position: 'absolute',
    width: '160%',
    height: '160%',
  },
  badgeWrap: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
  },
});
