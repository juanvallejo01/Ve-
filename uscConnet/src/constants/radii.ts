/**
 * USConnect design tokens — border radii.
 * Base `radius` is 24px (1.5rem); the rest of the scale is derived from it,
 * matching the web app's `--radius-*` CSS variables in `app/globals.css`.
 */

const BASE_RADIUS = 24;

export const radii = {
  sm: BASE_RADIUS - 8, // 16
  md: BASE_RADIUS - 4, // 20
  lg: BASE_RADIUS, // 24
  xl: BASE_RADIUS + 8, // 32
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radii;
