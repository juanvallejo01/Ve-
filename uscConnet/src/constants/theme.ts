/**
 * USConnect design-token barrel.
 *
 * This replaces the default `create-expo-app` template's placeholder theme
 * (generic blue/gray tokens) with USConnect's real design system, sourced
 * from the web app's `app/globals.css`. Prefer consuming these via
 * `useTheme()` (see `@/context/theme-context`) rather than importing this
 * file directly in components, so values stay reactive to the resolved
 * light/dark mode.
 */

export { lightColors, darkColors } from './colors';
export type { ThemeColors, ColorToken } from './colors';

export { radii } from './radii';
export type { RadiusToken } from './radii';

export { shadows } from './shadows';
export type { ShadowToken } from './shadows';

export { gradients, gradientDirections } from './gradients';

export { fontFamilies, fontsToLoad } from './fonts';
