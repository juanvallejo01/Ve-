import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Crown,
  Flame,
  Heart,
  Sparkles,
  Trophy,
  TrendingUp,
  Users,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { RankBadge } from '@/components/leaderboard/rank-badge';
import { Avatar } from '@/components/ui/avatar';
import { Sheet } from '@/components/ui/sheet';
import { useLocale } from '@/context/locale-context';
import { useTheme } from '@/context/theme-context';
import { leaderboardApi } from '@/lib/api-client';

// ─── Types ──────────────────────────────────────────────────────────────
// Mirrors the web app's screen-local interfaces in `screens/Leaderboard.tsx`
// (defined inline there too, not hoisted to `types/index.ts`) — kept local
// here for the same reason: nothing outside this screen needs them.
interface TopPost {
  id: string;
  content: string;
  imageUrl: string | null;
  likesCount: number;
  createdAt: string;
}

interface UserRanking {
  rank: number;
  id: string;
  name: string;
  major: string;
  photoUrl?: string | null;
  weeklyLikes: number;
  topPost: TopPost | null;
}

interface PostRanking {
  rank: number;
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  likesCount: number;
  user: {
    id: string;
    name: string;
    major: string;
    photoUrl?: string | null;
  };
}

interface MyRank {
  rank: number;
  id: string;
  name: string;
  major: string;
  weeklyLikes: number;
}

type RankingType = 'users' | 'posts';

/** Web: `bg-gradient-to-br from-[#000000] via-[#171717] to-[#404040]` */
const HEADER_GRADIENT = ['#000000', '#171717', '#404040'] as const;
const DIAGONAL = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
const TO_RIGHT = { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };
const BOTTOM_TO_TOP = { start: { x: 0, y: 1 }, end: { x: 0, y: 0 } };

// ─── Entrance animation hooks ───────────────────────────────────────────
// Web used CSS keyframes `podiumRise` / `rankSlideIn` (translateY + opacity)
// with a per-item `animationDelay`. Reanimated equivalent: shared values
// nudged via `withDelay` on mount, staggered by the same delay math as web.

/** Web: `animate-podiumRise` with `animationDelay: '0.1s' | '0.2s' | '0.3s'`. */
function usePodiumRise(delayMs: number) {
  const translateY = useSharedValue(24);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(delayMs, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 380 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));
}

/** Web: `animate-rankSlideIn` with `animationDelay: ${200 + index * 60}ms` (users) or `${index * 80}ms` (posts). */
function useRankSlideIn(delayMs: number) {
  const translateY = useSharedValue(14);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(delayMs, withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }));
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 320 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));
}

/** Web: `animate-glowPulse` on the #1 avatar ring — a subtle looping breathe. */
function useGlowPulse() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1.05, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

// ─── Podium slots ───────────────────────────────────────────────────────

function SecondPlaceSlot({ user, onPress }: { user: UserRanking; onPress: () => void }) {
  const { colors, gradients } = useTheme();
  const riseStyle = usePodiumRise(200);
  const firstName = user.name.split(' ')[0];

  return (
    <Animated.View style={[styles.slot, riseStyle]}>
      <Pressable onPress={onPress} style={styles.slotPressable}>
        <View style={styles.avatarBadgeWrap}>
          <Avatar uri={user.photoUrl} name={user.name} size="lg" gradientRing ringColors={gradients.silver} />
          <View style={[styles.cornerBadge, styles.cornerBadgeTopRight]}>
            <RankBadge rank={2} size="sm" />
          </View>
        </View>
        <Text style={[styles.podiumName, { color: colors.foreground }]} numberOfLines={1}>
          {firstName}
        </Text>
        <Text style={[styles.podiumMajor, { color: colors.mutedForeground }]} numberOfLines={1}>
          {user.major}
        </Text>
        <View style={[styles.likesPillSmall, { backgroundColor: colors.secondary }]}>
          <Heart size={9} color={colors.foreground} fill={colors.foreground} />
          <Text style={[styles.likesPillSmallText, { color: colors.foreground }]}>{user.weeklyLikes}</Text>
        </View>
        <LinearGradient
          colors={['rgba(100,116,139,0.40)', 'rgba(148,163,184,0.18)']}
          start={BOTTOM_TO_TOP.start}
          end={BOTTOM_TO_TOP.end}
          style={[styles.podiumBlock, styles.silverBlock, { borderColor: 'rgba(148,163,184,0.3)' }]}
        >
          <Text style={[styles.podiumNumeral, { color: '#94A3B8', fontSize: 24 }]}>2</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function FirstPlaceSlot({ user, onPress }: { user: UserRanking; onPress: () => void }) {
  const { colors, gradients, gradientDirections } = useTheme();
  const riseStyle = usePodiumRise(100);
  const glowStyle = useGlowPulse();
  const firstName = user.name.split(' ')[0];

  return (
    <Animated.View style={[styles.slot, riseStyle]}>
      <Pressable onPress={onPress} style={styles.slotPressable}>
        <Crown size={22} color="#EAB308" fill="#EAB308" style={styles.crownIcon} />
        <Animated.View style={[styles.avatarBadgeWrap, glowStyle]}>
          <Avatar uri={user.photoUrl} name={user.name} size="xl" gradientRing ringColors={gradients.gold} />
          <View style={[styles.cornerBadge, styles.cornerBadgeBottomRight]}>
            <RankBadge rank={1} size="md" />
          </View>
        </Animated.View>
        <Text style={[styles.podiumNameFirst, { color: colors.foreground }]} numberOfLines={1}>
          {firstName}
        </Text>
        <Text style={[styles.podiumMajor, { color: colors.mutedForeground }]} numberOfLines={1}>
          {user.major}
        </Text>
        <LinearGradient
          colors={gradients.gold}
          start={gradientDirections.toRight.start}
          end={gradientDirections.toRight.end}
          style={styles.likesPillGold}
        >
          <Heart size={10} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={styles.likesPillGoldText}>{user.weeklyLikes}</Text>
        </LinearGradient>
        <LinearGradient
          colors={['rgba(234,179,8,0.32)', 'rgba(250,204,21,0.12)']}
          start={BOTTOM_TO_TOP.start}
          end={BOTTOM_TO_TOP.end}
          style={[styles.podiumBlock, styles.goldBlock, { borderColor: 'rgba(250,204,21,0.3)' }]}
        >
          <Text style={[styles.podiumNumeral, { color: '#EAB308', fontSize: 30 }]}>1</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function ThirdPlaceSlot({ user, onPress }: { user: UserRanking; onPress: () => void }) {
  const { colors, gradients } = useTheme();
  const riseStyle = usePodiumRise(300);
  const firstName = user.name.split(' ')[0];

  return (
    <Animated.View style={[styles.slot, riseStyle]}>
      <Pressable onPress={onPress} style={styles.slotPressable}>
        <View style={styles.avatarBadgeWrap}>
          <Avatar uri={user.photoUrl} name={user.name} size="md" gradientRing ringColors={gradients.bronze} />
          <View style={[styles.cornerBadge, styles.cornerBadgeTopRight]}>
            <RankBadge rank={3} size="sm" />
          </View>
        </View>
        <Text style={[styles.podiumName, { color: colors.foreground }]} numberOfLines={1}>
          {firstName}
        </Text>
        <Text style={[styles.podiumMajor, { color: colors.mutedForeground }]} numberOfLines={1}>
          {user.major}
        </Text>
        <View style={[styles.likesPillSmall, { backgroundColor: colors.secondary }]}>
          <Heart size={9} color={colors.foreground} fill={colors.foreground} />
          <Text style={[styles.likesPillSmallText, { color: colors.foreground }]}>{user.weeklyLikes}</Text>
        </View>
        <LinearGradient
          colors={['rgba(217,119,6,0.32)', 'rgba(251,191,36,0.12)']}
          start={BOTTOM_TO_TOP.start}
          end={BOTTOM_TO_TOP.end}
          style={[styles.podiumBlock, styles.bronzeBlock, { borderColor: 'rgba(252,211,77,0.3)' }]}
        >
          <Text style={[styles.podiumNumeral, { color: '#FBBF24', fontSize: 20 }]}>3</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function PodiumSection({
  topThree,
  onSelect,
}: {
  topThree: UserRanking[];
  onSelect: (user: UserRanking) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.podiumSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={styles.podiumRow}>
        {topThree[1] && <SecondPlaceSlot user={topThree[1]} onPress={() => onSelect(topThree[1])} />}
        {topThree[0] && <FirstPlaceSlot user={topThree[0]} onPress={() => onSelect(topThree[0])} />}
        {topThree[2] && <ThirdPlaceSlot user={topThree[2]} onPress={() => onSelect(topThree[2])} />}
      </View>
    </View>
  );
}

// ─── Rest-of-ranking row ────────────────────────────────────────────────

function RankRow({ user, index, onPress }: { user: UserRanking; index: number; onPress: () => void }) {
  const { colors } = useTheme();
  const rowStyle = useRankSlideIn(200 + index * 60);

  return (
    <Animated.View style={rowStyle}>
      <Pressable
        onPress={onPress}
        style={[styles.rankRow, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <RankBadge rank={user.rank} size="md" />
        <Avatar uri={user.photoUrl} name={user.name} size="md" />
        <View style={styles.rankRowInfo}>
          <Text numberOfLines={1} style={[styles.rankRowName, { color: colors.foreground }]}>
            {user.name}
          </Text>
          <Text numberOfLines={1} style={[styles.rankRowMajor, { color: colors.mutedForeground }]}>
            {user.major}
          </Text>
        </View>
        <View style={[styles.likesPill, { backgroundColor: colors.secondary }]}>
          <Heart size={10} color={colors.foreground} fill={colors.foreground} />
          <Text style={[styles.likesPillText, { color: colors.foreground }]}>{user.weeklyLikes}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Posts tab card ─────────────────────────────────────────────────────

function PostRankCard({
  post,
  index,
  dateLocale,
  likesLabel,
  onUserPress,
}: {
  post: PostRanking;
  index: number;
  dateLocale: string;
  likesLabel: string;
  onUserPress: () => void;
}) {
  const { colors } = useTheme();
  const cardStyle = useRankSlideIn(index * 80);
  // Web: `new Date(post.createdAt).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })`
  const dateLabel = new Date(post.createdAt).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });

  return (
    <Animated.View
      style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }, cardStyle]}
    >
      <View style={styles.postHeader}>
        <RankBadge rank={post.rank} size="md" />
        <Pressable onPress={onUserPress} style={styles.postAuthorRow}>
          <Avatar uri={post.user.photoUrl} name={post.user.name} size="sm" />
          <View style={styles.postAuthorInfo}>
            <Text numberOfLines={1} style={[styles.postAuthorName, { color: colors.foreground }]}>
              {post.user.name}
            </Text>
            <Text numberOfLines={1} style={[styles.postAuthorMajor, { color: colors.mutedForeground }]}>
              {post.user.major}
            </Text>
          </View>
        </Pressable>
      </View>

      {!!post.content && (
        <Text numberOfLines={3} style={[styles.postContent, { color: colors.foreground }]}>
          {post.content}
        </Text>
      )}

      {post.imageUrl && (
        <View style={styles.postImageWrap}>
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} contentFit="cover" />
        </View>
      )}

      <View
        style={[styles.postFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}
      >
        <LinearGradient colors={HEADER_GRADIENT} start={TO_RIGHT.start} end={TO_RIGHT.end} style={styles.postLikesPill}>
          <Heart size={11} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={styles.postLikesText}>{likesLabel}</Text>
        </LinearGradient>
        <Text style={[styles.postDate, { color: colors.mutedForeground }]}>{dateLabel}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Winning-post sheet content ────────────────────────────────────────

function WinningPostSheetContent({
  user,
  post,
  dateLocale,
  onClose,
}: {
  user: UserRanking;
  post: TopPost;
  dateLocale: string;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation('translation', { keyPrefix: 'leaderboard' });
  const initial = user.name.trim().charAt(0).toUpperCase() || '?';
  // Web: `toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' })`
  const dateLabel = new Date(post.createdAt).toLocaleDateString(dateLocale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.sheetRoot}>
      <LinearGradient colors={HEADER_GRADIENT} start={DIAGONAL.start} end={DIAGONAL.end} style={styles.sheetHeader}>
        <View style={styles.sheetHeaderRow}>
          <View style={styles.sheetInitialBox}>
            <Text style={styles.sheetInitialText}>{initial}</Text>
          </View>
          <View style={styles.sheetHeaderText}>
            <Text numberOfLines={1} style={styles.sheetName}>
              {user.name}
            </Text>
            <Text style={styles.sheetMajor}>{user.major}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.sheetCloseButton} hitSlop={8}>
            <X size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.sheetBestPostBanner}>
          <Trophy size={15} color="#FDE68A" />
          <Text style={styles.sheetBestPostText}>{t('bestPost', { count: post.likesCount })}</Text>
        </View>
      </LinearGradient>

      <View style={styles.sheetBody}>
        {post.imageUrl && (
          <View style={styles.sheetImageWrap}>
            <Image source={{ uri: post.imageUrl }} style={styles.sheetImage} contentFit="cover" />
          </View>
        )}
        <Text style={[styles.sheetContentText, { color: colors.foreground }]}>{post.content}</Text>
        <View style={[styles.sheetFooterRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.sheetDate, { color: colors.mutedForeground }]}>{dateLabel}</Text>
          <LinearGradient colors={HEADER_GRADIENT} start={TO_RIGHT.start} end={TO_RIGHT.end} style={styles.sheetLikesPill}>
            <Heart size={12} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.sheetLikesText}>{post.likesCount}</Text>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────

/**
 * Ported from the web app's `screens/Leaderboard.tsx`.
 *
 * Bug fix vs. the web source: the web screen bypassed `lib/api-client.ts`
 * entirely, doing raw `fetch(process.env.NEXT_PUBLIC_API_URL + '/leaderboard/...')`
 * calls with a manually-read `localStorage.getItem('accessToken')` bearer
 * header — the only screen in the app that does this; every other screen
 * goes through the shared `api-client.ts`/context layer. There is no
 * `localStorage` in RN, so that pattern doesn't even translate; it also
 * bypasses the SecureStore-backed auth-refresh interceptor the rest of the
 * app relies on. This port routes all three calls through `leaderboardApi`
 * (`getUsersRanking` / `getPostsRanking` / `getMyRank`, already wired in
 * Phase 2) instead, which is what the web app should have done.
 *
 * `components/leaderboard/leaderboard-row.tsx` was NOT ported as a
 * standalone component: `Leaderboard.tsx` never imports it — the screen
 * inlines its own row markup (`getRankDisplay` + a raw row `<div>`) instead.
 * Porting the unused `LeaderboardRow` would just be dead code; this file's
 * `RankRow`/`PostRankCard` are the ported equivalent of what the screen
 * actually renders. The existing `RankBadge` (Phase 4) already reproduces
 * `getRankDisplay`'s gradient-tier + numbered-fallback behavior exactly, so
 * it's reused directly instead of re-implementing that switch here.
 */
export default function LeaderboardScreen() {
  const { colors, fonts } = useTheme();
  const { locale } = useLocale();
  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US';
  const { t } = useTranslation('translation', { keyPrefix: 'leaderboard' });
  const router = useRouter();

  const [rankingType, setRankingType] = useState<RankingType>('users');
  const [usersRanking, setUsersRanking] = useState<UserRanking[]>([]);
  const [postsRanking, setPostsRanking] = useState<PostRanking[]>([]);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserRanking | null>(null);
  // Retains the last non-null selection while the sheet plays its close
  // animation, so the content doesn't blank out before the sheet has
  // finished sliding down (unlike the web's instant-unmount overlay `<div>`).
  const [sheetUser, setSheetUser] = useState<UserRanking | null>(null);

  const loadRankings = useCallback(async () => {
    try {
      setLoading(true);
      const [users, posts, rank] = await Promise.all([
        leaderboardApi.getUsersRanking(),
        leaderboardApi.getPostsRanking(),
        leaderboardApi.getMyRank(),
      ]);
      setUsersRanking(users);
      setPostsRanking(posts);
      setMyRank(rank);
    } catch (error) {
      console.error('Failed to load rankings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  useEffect(() => {
    if (selectedUser?.topPost) {
      setSheetUser(selectedUser);
    }
  }, [selectedUser]);

  function handleViewProfile(userId: string) {
    router.push(`/user/${userId}`);
  }

  const topThree = usersRanking.slice(0, 3);
  const restRanking = usersRanking.slice(3);
  const isInTop10 = !!myRank && myRank.rank <= 10;
  const sheetOpen = !!selectedUser?.topPost;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── Header ── */}
      <LinearGradient colors={HEADER_GRADIENT} start={DIAGONAL.start} end={DIAGONAL.end} style={styles.header}>
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />
        <View style={[styles.decorCircle, styles.decorCircle3]} />

        <View style={styles.headerTitleRow}>
          <View style={styles.headerIconBox}>
            <Trophy size={20} color="#FFFFFF" />
          </View>
          <View style={styles.headerTitleText}>
            <Text style={[styles.headerTitle, { fontFamily: fonts.sans.extraBold }]}>{t('title')}</Text>
            <Text style={styles.headerSubtitle}>{t('subtitle')}</Text>
          </View>
        </View>

        <View style={styles.segmentedToggle}>
          <Pressable
            onPress={() => setRankingType('users')}
            style={[styles.segment, rankingType === 'users' && styles.segmentActive]}
          >
            <Users size={15} color={rankingType === 'users' ? '#000000' : 'rgba(255,255,255,0.75)'} />
            <Text style={[styles.segmentText, { color: rankingType === 'users' ? '#000000' : 'rgba(255,255,255,0.75)' }]}>
              {t('topUsers')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setRankingType('posts')}
            style={[styles.segment, rankingType === 'posts' && styles.segmentActive]}
          >
            <Flame size={15} color={rankingType === 'posts' ? '#000000' : 'rgba(255,255,255,0.75)'} />
            <Text style={[styles.segmentText, { color: rankingType === 'posts' ? '#000000' : 'rgba(255,255,255,0.75)' }]}>
              {t('hotPosts')}
            </Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.foreground} />
        </View>
      ) : rankingType === 'users' ? (
        <View style={styles.contentColumn}>
          {topThree.length > 0 && <PodiumSection topThree={topThree} onSelect={setSelectedUser} />}

          <ScrollView contentContainerStyle={styles.listContent}>
            {restRanking.length > 0 && (
              <View style={styles.sectionLabelRow}>
                <Sparkles size={14} color={colors.foreground} />
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t('leaderboardLabel')}</Text>
              </View>
            )}
            <View style={styles.rowsList}>
              {restRanking.map((user, index) => (
                <RankRow key={user.id} user={user} index={index} onPress={() => setSelectedUser(user)} />
              ))}
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={styles.contentColumn}>
          <ScrollView contentContainerStyle={styles.listContent}>
            <View style={styles.sectionLabelRow}>
              <Flame size={14} color={colors.foreground} />
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t('trendingPosts')}</Text>
            </View>
            <View style={styles.postsList}>
              {postsRanking.map((post, index) => (
                <PostRankCard
                  key={post.id}
                  post={post}
                  index={index}
                  dateLocale={dateLocale}
                  likesLabel={t('likesCount', { count: post.likesCount })}
                  onUserPress={() => handleViewProfile(post.user.id)}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── My Rank Footer ── */}
      {rankingType === 'users' && myRank && !isInTop10 && (
        <LinearGradient colors={['#000000', '#404040']} start={TO_RIGHT.start} end={TO_RIGHT.end} style={styles.myRankFooter}>
          <Text style={styles.myRankLabel}>{t('yourRank')}</Text>
          <View style={styles.myRankPill}>
            <TrendingUp size={13} color="#FFFFFF" />
            <Text style={styles.myRankValue}>#{myRank.rank}</Text>
          </View>
        </LinearGradient>
      )}

      {/* ── Info Footer ── */}
      <View style={[styles.infoFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.infoFooterText, { color: colors.mutedForeground }]}>
          {rankingType === 'users' ? t('resetNotice') : t('trendingNotice')}
        </Text>
      </View>

      {/* ── Winning Post Modal ── */}
      <Sheet isOpen={sheetOpen} onClose={() => setSelectedUser(null)} snapPoints={['75%']} scrollable>
        {sheetUser?.topPost && (
          <WinningPostSheetContent
            user={sheetUser}
            post={sheetUser.topPost}
            dateLocale={dateLocale}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle1: { top: -24, right: -24, width: 112, height: 112 },
  decorCircle2: { top: 64, left: -40, width: 80, height: 80, backgroundColor: 'rgba(255,255,255,0.04)' },
  decorCircle3: { bottom: 8, right: 48, width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.05)' },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  headerIconBox: {
    height: 40,
    width: 40,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  segmentedToggle: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 6,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentColumn: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rowsList: {
    gap: 8,
  },
  postsList: {
    gap: 12,
  },

  // Podium
  podiumSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  slot: {
    flex: 1,
  },
  slotPressable: {
    alignItems: 'center',
  },
  crownIcon: {
    marginBottom: 6,
  },
  avatarBadgeWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  cornerBadge: {
    position: 'absolute',
  },
  cornerBadgeTopRight: {
    top: -6,
    right: -6,
  },
  cornerBadgeBottomRight: {
    bottom: -4,
    right: -4,
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 90,
    textAlign: 'center',
  },
  podiumNameFirst: {
    fontSize: 14,
    fontWeight: '800',
    maxWidth: 100,
    textAlign: 'center',
  },
  podiumMajor: {
    fontSize: 10,
    maxWidth: 85,
    textAlign: 'center',
    marginTop: 2,
  },
  likesPillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  likesPillSmallText: {
    fontSize: 11,
    fontWeight: '700',
  },
  likesPillGold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  likesPillGoldText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  podiumBlock: {
    marginTop: 12,
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  silverBlock: { height: 64 },
  goldBlock: { height: 96 },
  bronzeBlock: { height: 48 },
  podiumNumeral: {
    fontWeight: '900',
  },

  // Rest-of-ranking rows
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  rankRowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rankRowName: {
    fontSize: 14,
    fontWeight: '600',
  },
  rankRowMajor: {
    fontSize: 11,
    marginTop: 1,
  },
  likesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  likesPillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Posts tab
  postCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingBottom: 10,
  },
  postAuthorRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postAuthorInfo: {
    flex: 1,
    minWidth: 0,
  },
  postAuthorName: {
    fontSize: 13,
    fontWeight: '600',
  },
  postAuthorMajor: {
    fontSize: 10,
    marginTop: 1,
  },
  postContent: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  postImageWrap: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  postImage: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 12,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  postLikesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  postLikesText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  postDate: {
    fontSize: 11,
    fontWeight: '500',
  },

  // My-rank footer
  myRankFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  myRankLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  myRankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  myRankValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Info footer
  infoFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  infoFooterText: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Winning-post sheet
  sheetRoot: {
    marginHorizontal: -20,
    marginTop: -8,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sheetInitialBox: {
    height: 56,
    width: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetInitialText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sheetHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  sheetName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sheetMajor: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  sheetCloseButton: {
    height: 36,
    width: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBestPostBanner: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 10,
  },
  sheetBestPostText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sheetBody: {
    padding: 20,
  },
  sheetImageWrap: {
    marginBottom: 16,
  },
  sheetImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
  },
  sheetContentText: {
    fontSize: 14,
    lineHeight: 21,
  },
  sheetFooterRow: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  sheetLikesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sheetLikesText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
