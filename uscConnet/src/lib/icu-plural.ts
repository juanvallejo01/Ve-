/**
 * i18next (unlike the web app's next-intl) doesn't parse ICU MessageFormat
 * plural syntax out of the box, and this project has no i18next-icu plugin.
 * Several catalog keys ported verbatim from the web app use
 * `{count, plural, one {...} other {...}}` syntax (e.g. `post.likes`,
 * `matches.matchCount`, `adminUsers.userCount`) — calling `t(key, { count })`
 * directly through plain i18next interpolation would render the raw
 * template. Rather than pull in a full ICU runtime for a handful of strings,
 * call `t(key)` with no `count` (returns the untouched template) and apply
 * the chosen branch manually here.
 */
export function formatIcuPlural(template: string, count: number): string {
  const match = template.match(/one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}/);
  if (!match) return template;
  const [, one, other] = match;
  const chosen = count === 1 ? one : other;
  return chosen.replace(/#/g, String(count));
}
