/**
 * USConnect design tokens — colors.
 *
 * Single source of truth for these values is the web app's `app/globals.css`.
 * Keep this file, `src/global.css`, and `tailwind.config.js` in sync.
 */

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  success: string;
  warning: string;
  border: string;
  input: string;
  ring: string;
  // Tab bar specific
  tabInactiveIcon: string;
  tabActiveIcon: string;
}

export const lightColors: ThemeColors = {
  background: '#F8F8FA',
  foreground: '#1A1A2E',
  card: '#FFFFFF',
  cardForeground: '#1A1A2E',
  popover: '#FFFFFF',
  popoverForeground: '#1A1A2E',
  primary: '#000000',
  primaryForeground: '#FFFFFF',
  secondary: '#F2F2F7',
  secondaryForeground: '#1A1A2E',
  muted: '#F5F5F7',
  mutedForeground: '#8E8E93',
  accent: '#171717',
  accentForeground: '#FFFFFF',
  destructive: '#FF3B30',
  success: '#34C759',
  warning: '#FF9F0A',
  border: '#EBEBF0',
  input: '#EBEBF0',
  ring: '#000000',
  tabInactiveIcon: '#8E8E93',
  tabActiveIcon: '#000000',
};

export const darkColors: ThemeColors = {
  background: '#0A0A0C',
  foreground: '#F5F5F0',
  card: '#141416',
  cardForeground: '#F5F5F0',
  popover: '#1A1A1C',
  popoverForeground: '#F5F5F0',
  primary: '#FFFFFF',
  primaryForeground: '#0A0A0C',
  secondary: '#1C1C1E',
  secondaryForeground: '#F5F5F0',
  muted: '#121214',
  mutedForeground: '#A8A398',
  accent: '#F5F5F0',
  accentForeground: '#0A0A0C',
  destructive: '#FF3B30',
  success: '#34C759',
  warning: '#FF9F0A',
  border: '#262622',
  input: '#1C1C1E',
  ring: '#FFFFFF',
  tabInactiveIcon: '#8A8A8E',
  tabActiveIcon: '#FFFFFF',
};

export type ColorToken = keyof ThemeColors;
