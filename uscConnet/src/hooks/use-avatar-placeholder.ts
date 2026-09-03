import type { ImageSourcePropType } from 'react-native';

import { useTheme } from '@/context/theme-context';

// Ported from the web app's `useThemedAvatarSrc` (`components/layout/
// profile-avatar-image.tsx`): dark mode shows `imageprofile.png`, light mode
// shows `imageprofile1.png`. `require(...)` needs a static, literal path per
// asset, so these can't be combined into one dynamic lookup.
const DARK_PLACEHOLDER = require('@/assets/images/imageprofile.png') as ImageSourcePropType;
const LIGHT_PLACEHOLDER = require('@/assets/images/imageprofile1.png') as ImageSourcePropType;

/**
 * Resolves the theme-appropriate placeholder artwork shown in place of a
 * user's real profile photo when they don't have one — used by `Avatar`
 * (see `components/ui/avatar.tsx`) instead of the old gradient+initial
 * fallback. Reactive to the current theme: toggling light/dark re-renders
 * any visible fallback avatar with the correct artwork.
 */
export function useAvatarPlaceholder(): ImageSourcePropType {
  const { theme } = useTheme();
  return theme === 'dark' ? DARK_PLACEHOLDER : LIGHT_PLACEHOLDER;
}
