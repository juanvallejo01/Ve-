/**
 * USConnect design tokens — fonts.
 *
 * Primary sans is 'Plus Jakarta Sans' (weights 400-800 used across the app).
 * 'Caveat' (bold 700 only) is used exclusively for the handwritten wordmark
 * logo ("Ve!") and a "+" glyph button — do not use it anywhere else.
 */

export const fontFamilies = {
  sans: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semiBold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
    extraBold: 'PlusJakartaSans_800ExtraBold',
  },
  caveat: {
    bold: 'Caveat_700Bold',
  },
} as const;

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';

/** Flat map suitable for passing straight into `useFonts()`. */
export const fontsToLoad = {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  Caveat_700Bold,
};
