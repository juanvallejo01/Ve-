import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { Skeleton, SkeletonAvatar, SkeletonText } from '@/components/ui/skeleton';
import { useTheme } from '@/context/theme-context';

/** Ported from the web app's `components/feed/post-card-skeleton.tsx`. */
export function PostCardSkeleton() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={styles.header}>
        <SkeletonAvatar size="md" />
        <View style={styles.headerText}>
          <Skeleton width={112} height={12} borderRadius={6} />
          <Skeleton width={160} height={10} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
      </View>

      <Skeleton width={width} height={width} borderRadius={0} />

      <View style={styles.actions}>
        <Skeleton width={24} height={24} borderRadius={6} />
        <Skeleton width={24} height={24} borderRadius={6} />
        <Skeleton width={24} height={24} borderRadius={6} />
        <View style={{ flex: 1 }} />
        <Skeleton width={24} height={24} borderRadius={6} />
      </View>

      <View style={styles.content}>
        <Skeleton width={64} height={12} borderRadius={6} style={{ marginBottom: 8 }} />
        <SkeletonText lines={2} />
      </View>

      <View style={styles.timestamp}>
        <Skeleton width={80} height={8} borderRadius={4} />
      </View>
    </View>
  );
}

export function PostCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  timestamp: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
