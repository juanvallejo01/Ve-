import { LinearGradient } from 'expo-linear-gradient';
import { Award, Medal, Trophy, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/context/theme-context';

export type RankBadgeSize = 'sm' | 'md' | 'lg';

export interface RankBadgeProps {
  rank: number;
  size?: RankBadgeSize;
}

const SIZE_PX: Record<RankBadgeSize, number> = { sm: 24, md: 32, lg: 40 };
const ICON_PX: Record<RankBadgeSize, number> = { sm: 12, md: 14, lg: 18 };

/**
 * Ported from the web app's `components/leaderboard/rank-badge.tsx`. Full
 * port (not a stub) — it's small, self-contained, and needed correctly by
 * both this phase's post-card author-rank pill and Phase 7's leaderboard
 * screen, so there is no reason to build it twice.
 *
 * Web used a CSS `animate-crownBounce` keyframe (a looping subtle bounce) on
 * every render; that's translated here as a single one-shot bounce on mount
 * — a continuous infinite bounce reads as much busier as a native gesture
 * than it does as a CSS accent, especially repeated once per post in a feed.
 */
export function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
  const { colors, theme, gradients, gradientDirections } = useTheme();
  const dimension = SIZE_PX[size];
  const iconSize = ICON_PX[size];
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(
      50,
      withSequence(
        withTiming(1.15, { duration: 220, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 140, easing: Easing.inOut(Easing.ease) })
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rank]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const tierByRank = {
    1: { gradient: gradients.gold, Icon: Trophy as LucideIcon, iconColor: '#78350F' },
    2: { gradient: gradients.silver, Icon: Medal as LucideIcon, iconColor: '#475569' },
    3: { gradient: gradients.bronze, Icon: Award as LucideIcon, iconColor: '#78350F' },
  } as const;

  const tier = tierByRank[rank as 1 | 2 | 3];

  if (!tier) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7',
          },
        ]}
      >
        <Text style={[styles.fallbackText, { color: colors.mutedForeground }]}>{rank}</Text>
      </View>
    );
  }

  const { gradient, Icon, iconColor } = tier;

  return (
    <Animated.View style={animatedStyle}>
      <LinearGradient
        colors={gradient}
        start={gradientDirections.diagonal135.start}
        end={gradientDirections.diagonal135.end}
        style={[
          styles.badge,
          { width: dimension, height: dimension, borderRadius: dimension / 2 },
          shadowForRank(rank),
        ]}
      >
        <Icon size={iconSize} color={iconColor} />
      </LinearGradient>
    </Animated.View>
  );
}

function shadowForRank(rank: number) {
  const colorByRank: Record<number, string> = {
    1: 'rgba(255, 215, 0, 0.4)',
    2: 'rgba(148, 163, 184, 0.35)',
    3: 'rgba(217, 119, 6, 0.35)',
  };
  return {
    shadowColor: colorByRank[rank] ?? '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  };
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 11,
    fontWeight: '800',
  },
});
