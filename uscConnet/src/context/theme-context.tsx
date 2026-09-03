import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme as nativewindColorScheme } from 'nativewind';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { darkColors, lightColors, type ThemeColors } from '@/constants/colors';
import { fontFamilies } from '@/constants/fonts';
import { gradientDirections, gradients } from '@/constants/gradients';
import { radii } from '@/constants/radii';
import { shadows } from '@/constants/shadows';
import { useColorScheme as useSystemColorScheme } from '@/hooks/use-color-scheme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'uscconnet.theme-preference';

interface ThemeContextValue {
  /** Resolved 'light' | 'dark' — use this to branch rendering logic. */
  theme: ResolvedTheme;
  /** The user's raw preference, which may be 'system'. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  colors: ThemeColors;
  radii: typeof radii;
  shadows: typeof shadows;
  gradients: typeof gradients;
  gradientDirections: typeof gradientDirections;
  fonts: typeof fontFamilies;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Hydrate persisted preference on mount.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!cancelled && (stored === 'light' || stored === 'dark' || stored === 'system')) {
          setPreferenceState(stored);
        }
      })
      .catch(() => {
        // Ignore read failures — fall back to 'system'.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedTheme: ResolvedTheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  // Keep NativeWind's `dark:` class variant in sync with our resolved theme
  // so `className` styles and this context never disagree.
  useEffect(() => {
    nativewindColorScheme.set(preference);
  }, [preference]);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Ignore write failures — preference still applies for this session.
    });
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: resolvedTheme,
      preference,
      setPreference,
      colors: resolvedTheme === 'dark' ? darkColors : lightColors,
      radii,
      shadows,
      gradients,
      gradientDirections,
      fonts: fontFamilies,
    }),
    [resolvedTheme, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() must be used within a <ThemeProvider>.');
  }
  return ctx;
}
