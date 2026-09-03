import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/context/theme-context';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

const SHIMMER_WIDTH_FACTOR = 1.6;

/** Loading placeholder box with a left-to-right shimmer sweep, looping. */
export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { theme } = useTheme();
  const progress = useSharedValue(-1);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${progress.value * 100 * SHIMMER_WIDTH_FACTOR}%` }],
  }));

  const baseColor = theme === 'dark' ? '#1C1C1E' : '#E8E8ED';
  const highlightColor = theme === 'dark' ? '#262622' : '#F5F5F7';

  return (
    <View
      style={[
        { width, height, borderRadius, backgroundColor: baseColor, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={[baseColor, highlightColor, baseColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export type SkeletonAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const AVATAR_SIZE_PX: Record<SkeletonAvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 40,
  lg: 48,
  xl: 64,
};

/** Circular skeleton placeholder matching `Avatar`'s size scale. */
export function SkeletonAvatar({
  size = 'md',
  style,
}: {
  size?: SkeletonAvatarSize;
  style?: StyleProp<ViewStyle>;
}) {
  const dimension = AVATAR_SIZE_PX[size];
  return <Skeleton width={dimension} height={dimension} borderRadius={dimension / 2} style={style} />;
}

/** Stacked skeleton lines standing in for a paragraph of text — last line is shorter. */
export function SkeletonText({
  lines = 1,
  style,
}: {
  lines?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: 10 }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          borderRadius={6}
          width={i === lines - 1 && lines > 1 ? '80%' : '100%'}
        />
      ))}
    </View>
  );
}
