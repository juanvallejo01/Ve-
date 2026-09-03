type TFunction = (key: string, values?: Record<string, unknown>) => string;

/**
 * Ported from the web app's `utils/relative-time.ts`. Expects a `t` scoped to
 * the `time` i18next namespace (e.g. `useTranslation('translation', { keyPrefix: 'time' })`),
 * resolving the catalog keys `justNow` / `minutesAgo` / `hoursAgo` / `yesterday` / `daysAgo`.
 *
 * Shared by post-card.tsx (Phase 4) and the Matches/Notifications screens (Phase 6) —
 * previously duplicated inline in post-card.tsx, factored out here once a second
 * caller needed the exact same logic.
 */
export function formatRelativeTime(dateString: string, t: TFunction): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('justNow');
  if (diffMins < 60) return t('minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('hoursAgo', { count: diffHours });
  if (diffDays === 1) return t('yesterday');
  if (diffDays < 7) return t('daysAgo', { count: diffDays });
  return date.toLocaleDateString();
}
