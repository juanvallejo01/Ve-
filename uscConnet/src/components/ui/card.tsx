import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/context/theme-context';

export interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Disable the default cloud-shadow, e.g. when nesting cards. */
  noShadow?: boolean;
}

/** Rounded card surface at the `radius-lg` token with the default cloud shadow. */
export function Card({ children, style, noShadow = false }: CardProps) {
  const { colors, radii, shadows } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radii.lg,
        },
        !noShadow && shadows.cloud,
        style,
      ]}
    >
      {children}
    </View>
  );
}
