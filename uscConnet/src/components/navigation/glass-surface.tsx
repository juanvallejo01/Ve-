import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { type ReactNode } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';

interface GlassSurfaceProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark';
}

/**
 * Cross-platform glass/blur backdrop.
 *
 * `expo-glass-effect`'s `GlassView` renders Apple's real native Liquid Glass
 * material, but only on iOS 26+ — on any other platform/OS version it quietly
 * falls back to a plain `View` (no blur), per its own README. Since this app
 * also needs to look right on Android and older iOS, we use `expo-blur`'s
 * `BlurView` there instead, which has a real (if less exotic) blur
 * implementation on both platforms.
 */
export function GlassSurface({ children, style, intensity = 40, tint = 'light' }: GlassSurfaceProps) {
  if (Platform.OS === 'ios') {
    return (
      <GlassView style={style} glassEffectStyle="clear" colorScheme={tint}>
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      style={style}
      intensity={intensity}
      tint={tint}
      blurMethod="dimezisBlurViewSdk31Plus"
    >
      {children}
    </BlurView>
  );
}
