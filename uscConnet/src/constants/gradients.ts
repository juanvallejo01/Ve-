/**
 * USConnect design tokens — gradients.
 * Colors are consumed directly by `expo-linear-gradient`'s `colors` prop.
 */

export const gradients = {
  /** Primary CTA gradient — buttons, avatar-fallback rings, badges, pills. Left-to-right. */
  primary: ['#000000', '#404040'] as [string, string],
  /** 135deg diagonal gold gradient (leaderboard #1) */
  gold: ['#FFD700', '#FFA500', '#FFD700'] as [string, string, string],
  /** 135deg diagonal silver gradient (leaderboard #2) */
  silver: ['#C0C0C0', '#E8E8E8', '#C0C0C0'] as [string, string, string],
  /** 135deg diagonal bronze gradient (leaderboard #3) */
  bronze: ['#CD7F32', '#E8A857', '#CD7F32'] as [string, string, string],
} as const;

/** Start/end points for `expo-linear-gradient` matching CSS `to right` (0deg→90deg in CSS terms). */
export const gradientDirections = {
  /** left-to-right, matches CSS `linear-gradient(to right, ...)` */
  toRight: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  /** matches CSS `linear-gradient(135deg, ...)` (top-left to bottom-right, diagonal) */
  diagonal135: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
} as const;
