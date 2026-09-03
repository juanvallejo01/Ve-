import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Compass, Home, MessageCircle, Trophy, User, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/context/theme-context';

import { GlassSurface } from './glass-surface';
import { LiquidGlassIcon } from './liquid-glass-icon';

const TAB_COUNT = 5;

const ROUTE_ICONS: Record<string, LucideIcon> = {
  index: Home,
  explore: Compass,
  matches: MessageCircle,
  leaderboard: Trophy,
  profile: User,
};

const ROUTE_LABELS: Record<string, string> = {
  index: 'Feed',
  explore: 'Explore',
  matches: 'Matches',
  leaderboard: 'Leaderboard',
  profile: 'Profile',
};

// Placeholder — Phase 2 wires this to the real notification context.
const ROUTE_BADGES: Record<string, number | undefined> = {};

/**
 * Custom bottom tab bar replicating the web app's `BottomNav` +
 * `LiquidGlassIcon`: a glass backdrop, a sliding gradient indicator above
 * the active tab, and per-tab animated "liquid glass" pill icons.
 */
export function LiquidTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [barWidth, setBarWidth] = useState(0);

  const tabWidth = barWidth / TAB_COUNT;

  const indicatorStyle = useAnimatedStyle(() => ({
    width: tabWidth,
    transform: [{ translateX: withTiming(tabWidth * state.index, { duration: 300 }) }],
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  return (
    <GlassSurface
      tint={isDark ? 'dark' : 'light'}
      intensity={70}
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 12),
          borderTopColor: isDark ? '#262622' : 'rgba(235,235,240,0.6)',
          backgroundColor: isDark ? 'rgba(10,10,12,0.96)' : 'rgba(255,255,255,0.85)',
        },
      ]}
    >
      <View style={styles.indicatorTrack}>
        {barWidth > 0 ? (
          <Animated.View style={[styles.indicatorBar, indicatorStyle]}>
            <IndicatorGradient colors={isDark ? ['#FFFFFF', '#D4D4D4'] : ['#000000', '#404040']} />
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.row} onLayout={onLayout}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const Icon = ROUTE_ICONS[route.name] ?? Home;
          const label = ROUTE_LABELS[route.name] ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <View key={route.key} style={styles.tabItem}>
              <LiquidGlassIcon
                icon={Icon}
                label={label}
                isActive={isFocused}
                badge={ROUTE_BADGES[route.name]}
                onPress={onPress}
              />
            </View>
          );
        })}
      </View>
    </GlassSurface>
  );
}

function IndicatorGradient({ colors }: { colors: [string, string] }) {
  const { gradientDirections } = useTheme();
  return (
    <LinearGradient
      colors={colors}
      start={gradientDirections.toRight.start}
      end={gradientDirections.toRight.end}
      style={StyleSheet.absoluteFill}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  indicatorTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    overflow: 'hidden',
  },
  indicatorBar: {
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
