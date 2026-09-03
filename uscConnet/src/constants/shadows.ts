import { Platform } from 'react-native';

/**
 * USConnect design tokens — shadows ("cloud shadows").
 *
 * Translated from the web app's layered CSS box-shadows in `app/globals.css`
 * into React Native's single-layer shadow model (shadowColor/shadowOffset/
 * shadowOpacity/shadowRadius on iOS, elevation on Android). These are
 * approximations of the CSS originals, not pixel-exact reproductions —
 * RN cannot express multiple shadow layers on one view without stacking
 * extra views, so each token picks the softer/larger of the two CSS layers
 * as the dominant one.
 */

type ShadowStyle = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

function shadow(
  height: number,
  opacity: number,
  radius: number,
  elevation: number,
  color = '#000000'
): ShadowStyle {
  return Platform.select<ShadowStyle>({
    android: {
      shadowColor: color,
      shadowOffset: { width: 0, height },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    },
  })!;
}

export const shadows = {
  /** cloud-shadow: 0 2px 20px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.02) */
  cloud: shadow(2, 0.06, 12, 2),
  /** cloud-shadow-md: 0 4px 30px rgba(0,0,0,0.06), 0 1px 6px rgba(0,0,0,0.03) */
  cloudMd: shadow(4, 0.08, 16, 4),
  /** cloud-shadow-lg: 0 8px 40px rgba(0,0,0,0.08), 0 2px 10px rgba(0,0,0,0.04) */
  cloudLg: shadow(8, 0.1, 22, 8),
  /** cloud-shadow-blue: 0 4px 24px rgba(0,0,0,0.25), 0 1px 6px rgba(0,0,0,0.12) — the strong shadow used behind primary black-gradient buttons/pills */
  cloudBlue: shadow(4, 0.28, 16, 6),
  /** Subtle tab-bar pill shadow (inactive) */
  pillInactive: shadow(2, 0.04, 8, 1),
  /** Tab-bar pill shadow (active) */
  pillActive: shadow(4, 0.12, 10, 3),
} as const;

export type ShadowToken = keyof typeof shadows;
