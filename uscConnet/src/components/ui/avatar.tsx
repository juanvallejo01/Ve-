import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/context/theme-context';
import { useAvatarPlaceholder } from '@/hooks/use-avatar-placeholder';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  /**
   * Remote or local image source. When absent, the themed placeholder
   * artwork is shown instead (dark/light silhouette — see
   * `useAvatarPlaceholder`), matching the web app's `ProfileAvatarImage`.
   * Every call site in this app represents a real user's own profile-photo
   * slot (feed, search, leaderboard, chat, profile), which is exactly the
   * boundary the web app itself draws around that fallback — so unlike the
   * web, which also keeps a separate plain gradient+initial `UserAvatar` for
   * non-profile-photo contexts, this app has no such second consumer and
   * doesn't need to preserve that split.
   */
  uri?: string | null;
  /** User's display name — no longer used to derive an initial (see `uri` above), kept for API stability / possible future accessibility labeling. */
  name?: string;
  /**
   * A named preset (`SIZE_PX` scale) or a raw pixel number for one-off sizes
   * that don't fit the scale — e.g. Profile/UserProfile's 90pt avatar, which
   * overlaps the banner and has no equivalent preset.
   */
  size?: AvatarSize | number;
  /** Wrap the avatar in a padded gradient ring (Instagram-story style). Defaults to the app's monochrome black→gray gradient. */
  gradientRing?: boolean;
  /**
   * Override the ring's gradient colors (defaults to `gradients.primary`, black→gray).
   * Used e.g. by the Matches screen's "New Likes" row, which the web renders
   * with a one-off `bg-gradient-to-br from-[#FF4458] to-[#FF9F0A]` instead of
   * the default monochrome ring. Widened from a strict 2-tuple to also accept
   * the 3-stop `gradients.gold`/`silver`/`bronze` tokens (same shape
   * `LinearGradient`'s own `colors` prop requires) — the Leaderboard podium
   * rings reuse those tokens so a #1/#2/#3 avatar ring matches the
   * corresponding `RankBadge` gradient exactly.
   */
  ringColors?: readonly [string, string, ...string[]];
}

const SIZE_PX: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 56,
  xl: 64,
};

const RING_PADDING = 3;

export function Avatar({ uri, name, size = 'md', gradientRing = false, ringColors }: AvatarProps) {
  const { gradients, gradientDirections } = useTheme();
  const placeholder = useAvatarPlaceholder();
  const dimension = typeof size === 'number' ? size : SIZE_PX[size];

  const avatarNode = (
    <View
      style={[
        styles.container,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
      ]}
    >
      <Image
        source={uri ? { uri } : placeholder}
        accessibilityLabel={name}
        style={{ width: dimension, height: dimension, borderRadius: dimension / 2 }}
        contentFit="cover"
      />
    </View>
  );

  if (!gradientRing) {
    return avatarNode;
  }

  const ringDimension = dimension + RING_PADDING * 2;

  return (
    <LinearGradient
      colors={ringColors ?? gradients.primary}
      start={gradientDirections.diagonal135.start}
      end={gradientDirections.diagonal135.end}
      style={{
        width: ringDimension,
        height: ringDimension,
        borderRadius: ringDimension / 2,
        alignItems: 'center',
        justifyContent: 'center',
        padding: RING_PADDING,
      }}
    >
      <View
        style={{
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {avatarNode}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
