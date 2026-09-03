import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Skeleton, SkeletonAvatar } from '@/components/ui/skeleton';
import { useTheme } from '@/context/theme-context';

/**
 * Ported from the web app's `components/profile/user-profile-skeleton.tsx`.
 * A real component (not just a spinner) since the web source already builds
 * one out of its own `Skeleton`/`SkeletonAvatar` primitives — this reuses
 * this app's RN equivalents (Phase 1, `components/ui/skeleton.tsx`) the same
 * way. Shown by `app/user/[id].tsx` while `usersApi.getUserProfile` resolves.
 */
export function UserProfileSkeleton() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Banner */}
      <View style={styles.banner} />

      {/* Avatar + info */}
      <View style={styles.body}>
        <View style={styles.avatarWrap}>
          <SkeletonAvatar size="xl" style={[styles.avatarSkeleton, { borderColor: colors.background }]} />
        </View>
        <View style={styles.actionsSpacer} />
        <View style={styles.infoBlock}>
          <Skeleton width={144} height={20} borderRadius={10} />
          <Skeleton width={96} height={14} borderRadius={7} style={{ marginTop: 6 }} />
          <Skeleton width={160} height={14} borderRadius={7} style={{ marginTop: 10 }} />
          <Skeleton width={112} height={14} borderRadius={7} style={{ marginTop: 10 }} />
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
        <Skeleton width={56} height={16} borderRadius={8} />
        <Skeleton width={64} height={16} borderRadius={8} />
      </View>

      {/* Posts skeleton */}
      <View style={styles.postsList}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.postCard, { backgroundColor: colors.card }]}>
            <View style={styles.postHeader}>
              <SkeletonAvatar size="sm" />
              <View style={styles.postHeaderText}>
                <Skeleton width={96} height={12} borderRadius={6} />
                <Skeleton width={128} height={10} borderRadius={5} style={{ marginTop: 6 }} />
              </View>
            </View>
            <View style={styles.postImageWrap}>
              <Skeleton width="100%" height="100%" borderRadius={16} />
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  banner: {
    width: '100%',
    height: 110,
    backgroundColor: '#171717',
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  avatarWrap: {
    marginTop: -46,
    marginLeft: 0,
  },
  avatarSkeleton: {
    borderWidth: 4,
  },
  actionsSpacer: {
    height: 36,
    marginTop: 12,
  },
  infoBlock: {
    marginTop: 40,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  postCard: {
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  postImageWrap: {
    width: '100%',
    aspectRatio: 1,
  },
});
