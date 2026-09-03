import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';

export type Locale = 'es' | 'en';

export const resources = {
  es: { translation: es },
  en: { translation: en },
} as const;

// -----------------------------------------------------------------------
// i18next catalog compatibility note
//
// The web app's `messages/es.json` / `messages/en.json` are consumed by
// next-intl, which uses ICU-style single-brace interpolation, e.g.
// "hace {count}m" or "Reportado {count} veces". i18next's default
// interpolation syntax is double-brace ("{{count}}"), which would silently
// fail to substitute against these catalogs.
//
// Rather than rewrite ~390 leaf strings across both files, we reconfigure
// i18next's interpolation prefix/suffix to single braces below. The JSON
// files themselves are untouched copies of the web app's catalogs (same
// nested key structure — `landing.hero.title`, `time.minutesAgo`, etc. —
// which i18next resolves natively via dot-path keys), confirmed compatible
// by inspection: both files have identical top-level namespaces, matching
// nesting depth, and the only interpolation placeholders present across
// both catalogs are single-brace tokens ({action}, {count}, {date}, {email},
// {max}, {name}, {names}, {percent}, {phrase}, {rank}, {sign}) — no
// double-brace usage anywhere that this override could break.
// -----------------------------------------------------------------------

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'es',
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false, // not rendering to HTML, no need to escape
      prefix: '{',
      suffix: '}',
    },
    // React already batches renders; no need for i18next's Suspense mode
    // for these synchronously-bundled JSON resources.
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
