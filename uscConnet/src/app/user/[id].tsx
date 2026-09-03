import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Flag,
  Heart,
  MapPin,
  MessageSquare,
  Trophy,
  UserX,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PostCard, type FeedComment, type FeedPost } from '@/components/feed/post-card';
import { UserProfileSkeleton } from '@/components/profile/user-profile-skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Sheet } from '@/components/ui/sheet';
import { useChat } from '@/context/chat-context';
import { useLocale } from '@/context/locale-context';
import { useMatch } from '@/context/match-context';
import { useTheme } from '@/context/theme-context';
import { blocksApi, leaderboardApi, matchesApi, postsApi, reportsApi, usersApi } from '@/lib/api-client';
import type { ReportReason } from '@/types';

const RANKED_USERS_LIMIT = 100;
const RANKED_POSTS_LIMIT = 100;

/** Web: `bg-gradient-to-br from-[#000000] via-[#171717] to-[#404040]` */
const HEADER_GRADIENT = ['#000000', '#171717', '#404040'] as const;
const DIAGONAL = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };

const REPORT_REASONS: ReportReason[] = ['SPAM', 'HARASSMENT', 'FAKE_PROFILE', 'INAPPROPRIATE_CONTENT', 'OTHER'];

interface UserData {
  id: string;
  name: string;
  email: string;
  major: string;
  photoUrl?: string | null;
  createdAt: string;
  posts: FeedPost[];
  isMatched: boolean;
  blockedByMe: boolean;
  blockedMe: boolean;
  _count: {
    posts: number;
    receivedLikes: number;
  };
}

/**
 * Ported from the web app's `screens/UserProfile.tsx` — viewing someone
 * else's profile. Unlike the web version (an `absolute inset-0 z-50`
 * overlay toggled by `onClose`), this is a real stacked route
 * (`app/user/[id].tsx`), reached from every `PostCard.onUserPress` /
 * author-tap call site across the app (Feed, Leaderboard, Matches,
 * Notifications, Chat) — see those files for the `router.push(...)` calls
 * that now replace the "Phase 8" TODO stubs left in earlier phases.
 *
 * Bug fix vs. the web source (same category as Phase 7's Leaderboard fix):
 * the web's `handleLike`/`handleUnlike` bypassed `lib/api-client.ts` with
 * raw `fetch(process.env.NEXT_PUBLIC_API_URL + ...)` calls reading
 * `localStorage.getItem('accessToken')` directly. That doesn't even
 * translate to RN (no `localStorage`), and it skips the SecureStore-backed
 * auth-refresh interceptor every other screen relies on. This port routes
 * both through `postsApi.likePost` / `postsApi.unlikePost` instead.
 *
 * `web`'s `PostCard` usage here passes no `onUserPress` at all (every post
 * shown is already this profile's own — there is nowhere else to navigate
 * to), so this port doesn't wire one up either.
 */
export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = id ?? '';
  const router = useRouter();
  const { colors, fonts, shadows, gradients, gradientDirections } = useTheme();
  const { t } = useTranslation('translation', { keyPrefix: 'userProfile' });
  const { t: tChat } = useTranslation('translation', { keyPrefix: 'chat' });
  const { t: tProfile } = useTranslation('translation', { keyPrefix: 'profile' });
  const { locale } = useLocale();
  const { hasLiked, isMatched, likeUser, refresh: refreshMatches } = useMatch();
  const { openChat } = useChat();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'stats'>('posts');
  const [actionLoading, setActionLoading] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [weeklyRank, setWeeklyRank] = useState<number | undefined>(undefined);
  const [postRanks, setPostRanks] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (userId) loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    leaderboardApi
      .getUsersRanking(RANKED_USERS_LIMIT)
      .then((ranking: { id: string; rank: number }[]) => {
        setWeeklyRank(ranking.find((u) => u.id === userId)?.rank);
      })
      .catch((error) => console.error('Failed to load weekly rank:', error));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    leaderboardApi
      .getPostsRanking(RANKED_POSTS_LIMIT)
      .then((ranking: { id: string; rank: number }[]) => {
        setPostRanks(new Map(ranking.map((p) => [p.id, p.rank])));
      })
      .catch((error) => console.error('Failed to load post rankings:', error));
  }, [userId]);

  const matched = isMatched(userId);
  const pending = !matched && hasLiked(userId);

  async function loadUserProfile() {
    try {
      setLoading(true);
      const data = await usersApi.getUserProfile(userId);
      setUser(data);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMatch() {
    setActionLoading(true);
    try {
      await likeUser(userId);
    } finally {
      setActionLoading(false);
    }
  }

  function handleUnmatch() {
    if (!user) return;
    Alert.alert(t('unmatch'), t('unmatchConfirm', { name: user.name }), [
      { text: tProfile('settings.cancel'), style: 'cancel' },
      {
        text: t('unmatch'),
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await matchesApi.unmatch(userId);
            await refreshMatches();
          } catch (error) {
            console.error('Failed to unmatch:', error);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }

  function handleSendMessage() {
    if (!user) return;
    if (openChat({ id: user.id, name: user.name, major: user.major, photoUrl: user.photoUrl })) {
      router.push(`/chat/${user.id}`);
    }
  }

  function handleBlock() {
    if (!user) return;
    Alert.alert(t('block'), t('blockConfirm', { name: user.name }), [
      { text: tProfile('settings.cancel'), style: 'cancel' },
      {
        text: t('block'),
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await blocksApi.blockUser(userId);
            await Promise.all([refreshMatches(), loadUserProfile()]);
          } catch (error) {
            console.error('Failed to block user:', error);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }

  async function handleUnblock() {
    setActionLoading(true);
    try {
      await blocksApi.unblockUser(userId);
      await loadUserProfile();
    } catch (error) {
      console.error('Failed to unblock user:', error);
    } finally {
      setActionLoading(false);
    }
  }

  function closeReportSheet() {
    if (reportSubmitting) return;
    setShowReportSheet(false);
    setReportReason(null);
    setReportDetails('');
    setReportDone(false);
  }

  async function handleSubmitReport() {
    if (!reportReason) return;
    if (reportReason === 'OTHER' && !reportDetails.trim()) return;
    setReportSubmitting(true);
    try {
      await reportsApi.createReport({
        reportedId: userId,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      setReportDone(true);
    } catch (error) {
      console.error('Failed to submit report:', error);
    } finally {
      setReportSubmitting(false);
    }
  }

  // Bug fix vs. web (see file-level note): routed through `postsApi` instead
  // of a raw `fetch()` + `localStorage` bearer token.
  async function handleLike(postId: string) {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            posts: prev.posts.map((p) =>
              p.id === postId ? { ...p, isLiked: true, likesCount: p.likesCount + 1 } : p
            ),
          }
        : prev
    );
    try {
      await postsApi.likePost(postId);
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  }

  async function handleUnlike(postId: string) {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            posts: prev.posts.map((p) =>
              p.id === postId ? { ...p, isLiked: false, likesCount: p.likesCount - 1 } : p
            ),
          }
        : prev
    );
    try {
      await postsApi.unlikePost(postId);
    } catch (error) {
      console.error('Failed to unlike post:', error);
    }
  }

  async function handleComment(postId: string, content: string): Promise<FeedComment> {
    const comment = await postsApi.addComment(postId, content);
    setUser((prev) =>
      prev
        ? { ...prev, posts: prev.posts.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p)) }
        : prev
    );
    return comment;
  }

  if (loading) {
    return <UserProfileSkeleton />;
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.notFoundWrap}>
          <Pressable onPress={() => router.back()} style={styles.backButtonPlain} hitSlop={8}>
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const joinDate = new Date(user.createdAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    month: 'short',
    year: 'numeric',
  });
  const username = user.name.toLowerCase().replace(/\s+/g, '_');

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.bannerWrap}>
          <LinearGradient
            colors={HEADER_GRADIENT}
            start={DIAGONAL.start}
            end={DIAGONAL.end}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
            accessibilityLabel={tChat('goBack')}
          >
            <ArrowLeft size={15} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.avatarAbsolute}>
            <View style={[styles.avatarRing, { borderColor: colors.background }, shadows.cloudLg]}>
              <Avatar uri={user.photoUrl} name={user.name} size={90} />
            </View>
          </View>

          <View style={styles.actionsRow}>
            {user.blockedByMe ? (
              <Pressable
                onPress={handleUnblock}
                disabled={actionLoading}
                style={[
                  styles.pillButton,
                  { borderColor: colors.border, backgroundColor: colors.card },
                  actionLoading && styles.disabled,
                ]}
              >
                <Text style={[styles.pillButtonText, { color: colors.foreground }]}>{t('unblock')}</Text>
              </Pressable>
            ) : user.blockedMe ? null : (
              <>
                {matched ? (
                  <>
                    <Pressable
                      onPress={handleUnmatch}
                      disabled={actionLoading}
                      accessibilityLabel={t('unmatch')}
                      style={[
                        styles.iconCircleButton,
                        { borderColor: colors.border, backgroundColor: colors.card },
                        actionLoading && styles.disabled,
                      ]}
                    >
                      <UserX size={16} color={colors.foreground} />
                    </Pressable>
                    <Pressable
                      onPress={handleSendMessage}
                      style={[styles.filledPillButton, { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.filledPillButtonText, { color: colors.primaryForeground }]}>
                        {t('sendMessage')}
                      </Text>
                    </Pressable>
                  </>
                ) : pending ? (
                  <Pressable
                    disabled
                    style={[
                      styles.pillButton,
                      { borderColor: colors.border, backgroundColor: colors.card, opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.pillButtonText, { color: colors.mutedForeground }]}>
                      {t('matchPending')}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleSendMatch}
                    disabled={actionLoading}
                    style={[
                      styles.filledPillButton,
                      { backgroundColor: colors.primary },
                      actionLoading && styles.disabled,
                    ]}
                  >
                    <Text style={[styles.filledPillButtonText, { color: colors.primaryForeground }]}>
                      {t('sendMatch')}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setShowReportSheet(true)}
                  accessibilityLabel={t('report')}
                  style={[styles.iconCircleButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <Flag size={15} color={colors.foreground} />
                </Pressable>
                <Pressable
                  onPress={handleBlock}
                  disabled={actionLoading}
                  accessibilityLabel={t('block')}
                  style={[
                    styles.iconCircleButton,
                    { borderColor: colors.border, backgroundColor: colors.card },
                    actionLoading && styles.disabled,
                  ]}
                >
                  <Ban size={15} color={colors.foreground} />
                </Pressable>
              </>
            )}
          </View>

          {(user.blockedByMe || user.blockedMe) && (
            <View style={[styles.blockedNotice, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.blockedNoticeText, { color: colors.mutedForeground }]}>
                {user.blockedByMe ? t('blockedByMeNotice') : t('blockedMeNotice')}
              </Text>
            </View>
          )}

          <View style={styles.infoBlock}>
            <Text style={[styles.name, { color: colors.foreground, fontFamily: fonts.sans.extraBold }]}>
              {user.name}
            </Text>
            <Text style={[styles.username, { color: colors.mutedForeground }]}>@{username}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MapPin size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{user.major}</Text>
              </View>
              <View style={styles.metaItem}>
                <CalendarDays size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {t('joined', { date: joinDate })}
                </Text>
              </View>
              {!!weeklyRank && (
                <LinearGradient
                  colors={gradients.gold}
                  start={gradientDirections.toRight.start}
                  end={gradientDirections.toRight.end}
                  style={styles.rankPill}
                >
                  <Trophy size={11} color="#78350F" />
                  <Text style={styles.rankPillText}>{t('weeklyRank', { rank: weeklyRank })}</Text>
                </LinearGradient>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.foreground }]}>{user._count.posts}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t('posts')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.foreground }]}>{user._count.receivedLikes}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t('likes')}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => setActiveTab('posts')}
            style={[styles.tabButton, activeTab === 'posts' && { borderBottomColor: colors.foreground }]}
          >
            <Text
              style={[styles.tabLabel, { color: activeTab === 'posts' ? colors.foreground : colors.mutedForeground }]}
            >
              {t('postsTab')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('stats')}
            style={[styles.tabButton, activeTab === 'stats' && { borderBottomColor: colors.foreground }]}
          >
            <Text
              style={[styles.tabLabel, { color: activeTab === 'stats' ? colors.foreground : colors.mutedForeground }]}
            >
              {t('activityTab')}
            </Text>
          </Pressable>
        </View>

        {activeTab === 'posts' ? (
          user.posts.length > 0 ? (
            <View style={{ paddingTop: 4 }}>
              {user.posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={userId}
                  onLike={handleLike}
                  onUnlike={handleUnlike}
                  onComment={handleComment}
                  showRanking
                  postRank={postRanks.get(post.id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyPosts}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.secondary }]}>
                <MessageSquare size={32} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{t('noPostsYet')}</Text>
            </View>
          )
        ) : (
          <View style={styles.statsTab}>
            <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }, shadows.cloud]}>
              <Text style={[styles.statsCardTitle, { color: colors.foreground }]}>{t('recentActivity')}</Text>
              <View style={{ gap: 12 }}>
                <View style={styles.activityRow}>
                  <LinearGradient
                    colors={['#F87171', '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.activityIconCircle}
                  >
                    <Heart size={14} color="#FFFFFF" fill="#FFFFFF" />
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.activityText, { color: colors.foreground }]}>
                      {t('receivedLikes', { count: user._count.receivedLikes })}
                    </Text>
                    <Text style={[styles.activitySubtext, { color: colors.mutedForeground }]}>{t('thisWeek')}</Text>
                  </View>
                </View>
                <View style={styles.activityRow}>
                  <View style={[styles.activityIconCircle, { backgroundColor: '#000000' }]}>
                    <MessageSquare size={14} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.activityText, { color: colors.foreground }]}>
                      {t('postedTimes', { count: user._count.posts })}
                    </Text>
                    <Text style={[styles.activitySubtext, { color: colors.mutedForeground }]}>{t('total')}</Text>
                  </View>
                </View>
              </View>
            </View>

            {user._count.posts > 0 && (
              <View
                style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }, shadows.cloud]}
              >
                <Text style={[styles.statsCardTitle, { color: colors.foreground }]}>{t('engagement')}</Text>
                <View style={styles.engagementRow}>
                  <Text style={[styles.engagementLabel, { color: colors.mutedForeground }]}>
                    {t('avgLikesPerPost')}
                  </Text>
                  <Text style={[styles.engagementValue, { color: colors.foreground }]}>
                    {Math.round(user._count.receivedLikes / user._count.posts)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Report sheet ── */}
      <Sheet isOpen={showReportSheet} onClose={closeReportSheet} snapPoints={['70%']} scrollable>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{t('reportTitle', { name: user.name })}</Text>
        </View>
        {reportDone ? (
          <Text style={[styles.reportDoneText, { color: colors.foreground }]}>{t('reportSubmitted')}</Text>
        ) : (
          <>
            <Text style={[styles.reportPrompt, { color: colors.mutedForeground }]}>{t('reportPrompt')}</Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {REPORT_REASONS.map((reason) => {
                const selected = reportReason === reason;
                return (
                  <Pressable
                    key={reason}
                    onPress={() => setReportReason(reason)}
                    style={[
                      styles.reportReasonButton,
                      selected
                        ? { borderColor: colors.foreground, backgroundColor: colors.secondary }
                        : { borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.reportReasonText, { color: colors.foreground }]}>
                      {t(`reportReasons.${reason}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {reportReason && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.reportDetailsLabel, { color: colors.mutedForeground }]}>
                  {reportReason === 'OTHER' ? t('reportDetailsLabelRequired') : t('reportDetailsLabelOptional')}
                </Text>
                <TextInput
                  value={reportDetails}
                  onChangeText={setReportDetails}
                  placeholder={t('reportDetailsPlaceholder')}
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  maxLength={500}
                  style={[
                    styles.reportDetailsInput,
                    { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground },
                  ]}
                />
              </View>
            )}
            <Pressable
              onPress={handleSubmitReport}
              disabled={!reportReason || reportSubmitting || (reportReason === 'OTHER' && !reportDetails.trim())}
              style={[
                styles.reportSubmitButton,
                { backgroundColor: colors.primary },
                (!reportReason || reportSubmitting || (reportReason === 'OTHER' && !reportDetails.trim())) &&
                  styles.disabled,
              ]}
            >
              {reportSubmitting ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.reportSubmitButtonText, { color: colors.primaryForeground }]}>
                  {t('reportSubmit')}
                </Text>
              )}
            </Pressable>
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  notFoundWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backButtonPlain: { padding: 12 },

  bannerWrap: {
    width: '100%',
    height: 110,
    overflow: 'hidden',
  },
  backButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  body: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: 'relative',
  },
  avatarAbsolute: {
    position: 'absolute',
    top: -46,
    left: 16,
    zIndex: 5,
  },
  avatarRing: {
    borderRadius: 49,
    borderWidth: 4,
    overflow: 'hidden',
  },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 12,
  },
  pillButton: {
    height: 36,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filledPillButton: {
    height: 36,
    paddingHorizontal: 20,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledPillButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  iconCircleButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },

  blockedNotice: {
    marginTop: 8,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  blockedNoticeText: {
    fontSize: 12,
  },

  infoBlock: {
    marginTop: 40,
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
  },
  username: {
    fontSize: 14,
    marginTop: 2,
  },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rankPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
  },

  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  emptyPosts: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyIconCircle: {
    height: 64,
    width: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBody: {
    fontSize: 13,
  },

  statsTab: {
    padding: 20,
    gap: 16,
  },
  statsCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  statsCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIconCircle: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: {
    fontSize: 14,
  },
  activitySubtext: {
    fontSize: 12,
    marginTop: 1,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  engagementLabel: {
    fontSize: 14,
  },
  engagementValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Report sheet
  sheetHeader: {
    paddingBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  reportDoneText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  reportPrompt: {
    fontSize: 13,
    marginBottom: 12,
  },
  reportReasonButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  reportReasonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  reportDetailsLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  reportDetailsInput: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  reportSubmitButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSubmitButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
