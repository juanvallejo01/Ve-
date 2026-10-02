import * as WebBrowser from 'expo-web-browser';

/**
 * Páginas legales publicadas en la landing (USClanding: /privacidad y
 * /terminos). App Store y Google Play exigen que sean accesibles desde la app.
 * EXPO_PUBLIC_SITE_URL se define por entorno en EAS (ver docs/PUBLICACION-TIENDAS.md).
 */
const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const LEGAL_URLS = {
  privacy: `${SITE_URL}/privacidad`,
  terms: `${SITE_URL}/terminos`,
} as const;

export function openLegalPage(page: keyof typeof LEGAL_URLS) {
  return WebBrowser.openBrowserAsync(LEGAL_URLS[page]);
}
