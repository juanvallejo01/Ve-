import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import i18n from '@/i18n';

export type Locale = 'es' | 'en';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const STORAGE_KEY = 'usconnect-locale';

/**
 * Ported from the web app's `locale-context.tsx`. The web version used
 * next-intl's `NextIntlClientProvider` + `window.localStorage`; this uses
 * i18next/react-i18next (see `src/i18n/index.ts`) + AsyncStorage under the
 * same storage key. `document.documentElement.lang = locale` had no RN
 * equivalent and is simply dropped. Default locale is "es", matching web.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es');

  // Hydrate persisted preference on mount.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!cancelled && (stored === 'es' || stored === 'en')) {
          setLocaleState(stored);
          i18n.changeLanguage(stored);
        }
      })
      .catch(() => {
        // Ignore read failures — fall back to default 'es'.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    i18n.changeLanguage(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Ignore write failures — preference still applies for this session.
    });
  };

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
