import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/context/theme-context';

export type ButtonVariant = 'primary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Override the `variant="primary"` gradient fill (defaults to the app's
   * signature black→dark-gray gradient). Used e.g. by the Auth screen's
   * amber CTA, which the web app renders via a one-off `!from-*`/`!to-*`
   * Tailwind override on its shared `GradientButton`.
   */
  gradientColors?: [string, string];
  /** Override the label color (defaults based on variant). */
  textColor?: string;
  /**
   * Optional icon rendered before the label. `children` is always wrapped in
   * a `<Text>` internally (RN forbids non-Text children inside `<Text>`), so
   * an icon can't be passed as part of `children` — it needs its own slot,
   * rendered as a sibling within the button's row layout instead.
   */
  icon?: ReactNode;
}

const SIZE_CONFIG: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number; radius: number }> = {
  sm: { height: 36, paddingHorizontal: 16, fontSize: 14, radius: 18 },
  md: { height: 48, paddingHorizontal: 24, fontSize: 16, radius: 24 },
  lg: { height: 56, paddingHorizontal: 32, fontSize: 17, radius: 28 },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * General-purpose button. `variant="primary"` renders the app's signature
 * black→dark-gray gradient fill (this subsumes the web app's separate
 * `GradientButton` component — there is intentionally only one Button here).
 */
export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  gradientColors,
  textColor,
  icon,
}: ButtonProps) {
  const { colors, gradients, gradientDirections, shadows } = useTheme();
  const scale = useSharedValue(1);
  const sizeConfig = SIZE_CONFIG[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 100 });
  };
  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };

  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    {
      height: sizeConfig.height,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      borderRadius: sizeConfig.radius,
      width: fullWidth ? '100%' : undefined,
      opacity: disabled ? 0.5 : 1,
    },
    isOutline && {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    variant === 'ghost' && { backgroundColor: 'transparent' },
    isPrimary && shadows.cloudBlue,
    style,
  ];

  const resolvedTextColor =
    textColor ??
    (isPrimary ? colors.primaryForeground : isOutline ? colors.foreground : colors.primary);

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={resolvedTextColor} />
      ) : (
        <>
          {icon}
          <Text
            style={[styles.text, { color: resolvedTextColor, fontSize: sizeConfig.fontSize }]}
            numberOfLines={1}
          >
            {children}
          </Text>
        </>
      )}
    </>
  );

  return (
    <AnimatedPressable
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[animatedStyle, containerStyle]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={gradientColors ?? gradients.primary}
          start={gradientDirections.toRight.start}
          end={gradientDirections.toRight.end}
          style={[StyleSheet.absoluteFill, { borderRadius: sizeConfig.radius }]}
        />
      ) : null}
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 8,
  },
  text: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
  },
});
