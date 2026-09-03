import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Quick, slightly stiff compression on press-in; looser/lower-damping spring
// back on release so it overshoots a touch before settling — the "bounce"
// that a flat `withTiming` scale doesn't give you.
const PRESS_IN_CONFIG = { damping: 14, stiffness: 400, mass: 0.4 };
const PRESS_OUT_CONFIG = { damping: 10, stiffness: 200, mass: 0.6 };

/**
 * Bouncy scale-down-then-spring-back press feedback via
 * `react-native-reanimated`'s `withSpring`, for buttons that want more "life"
 * than the app's standard micro-press (see `components/ui/button.tsx`, which
 * uses a flat `withTiming` scale — fine for regular buttons, but not the
 * springy feel Explore's swipe-action buttons want). Spread the returned
 * `onPressIn`/`onPressOut` onto an
 * `Animated.createAnimatedComponent(Pressable)` and include `style` in its
 * style array.
 */
export function usePressSpring(downScale = 0.88) {
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(downScale, PRESS_IN_CONFIG);
  };
  const onPressOut = () => {
    scale.value = withSpring(1, PRESS_OUT_CONFIG);
  };

  return { style, onPressIn, onPressOut };
}
