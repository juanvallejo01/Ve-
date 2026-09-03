import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/theme-context';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

/** Small rounded pill for statuses/counts/tags. */
export function Badge({ children, variant = 'default' }: BadgeProps) {
  const { colors } = useTheme();

  const backgroundByVariant: Record<BadgeVariant, string> = {
    default: colors.primary,
    secondary: colors.secondary,
    destructive: colors.destructive,
    outline: 'transparent',
  };
  const textByVariant: Record<BadgeVariant, string> = {
    default: colors.primaryForeground,
    secondary: colors.secondaryForeground,
    destructive: '#FFFFFF',
    outline: colors.foreground,
  };

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: backgroundByVariant[variant],
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: textByVariant[variant] }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  text: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
  },
});
