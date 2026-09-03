import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, Heart, MessageSquare, Share2, Trash2, Trophy, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { RankBadge } from '@/components/leaderboard/rank-badge';
import { postsApi } from '@/lib/api-client';
import { formatIcuPlural } from '@/lib/icu-plural';
import { formatRelativeTime } from '@/lib/relative-time';
import { useTheme } from '@/context/theme-context';

export interface FeedComment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    major: string;
    photoUrl?: string | null;
  };
}

export interface FeedPost {
  id: string;
  content: string;
  imageUrl?: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    major: string;
    photoUrl?: string | null;
  };
}

export interface PostCardProps {
  post: FeedPost;
  currentUserId: string;
  onLike: (postId: string) => void;
  onUnlike: (postId: string) => void;
  onComment: (postId: string, content: string) => Promise<FeedComment>;
  onDelete?: (postId: string) => void;
  /**
   * Navigates to the author's profile. The web app opens `UserProfile`
   * in-place (an `absolute inset-0` overlay); the RN equivalent is a real
   * stacked route at `app/user/[id].tsx` (Phase 8) — callers should pass
   * `(userId) => router.push(\`/user/${userId}\`)`. Left optional (with a
   * console-warn fallback) rather than required, since a couple of call
   * sites intentionally don't wire it up — e.g. `UserProfile` itself lists
   * only the profile owner's own posts, so there is nowhere else to go.
   */
  onUserPress?: (userId: string) => void;
  /** Weekly top-100 rankings (same data as "Populares"): only Feed opts into showing them. */
  showRanking?: boolean;
  /** Author's weekly top-100 users rank — omitted entirely outside the top 100. */
  authorRank?: number;
  /** This post's weekly top-100 posts rank — shows "+100" outside the top 100. */
  postRank?: number;
}

/** Parses `post.imageUrl`, which packs multiple images as a JSON-stringified
 * array — ported verbatim from the web app's `parseImages()`. Do not change
 * this: it is the wire contract shared with `createPost`. */
function parseImages(imageUrl?: string): string[] {
  if (!imageUrl) return [];
  try {
    const parsed = JSON.parse(imageUrl);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Not JSON — single URL.
  }
  return [imageUrl];
}

/** Reusable press-scale micro-animation, matching the web's `.micro-press` utility class. */
function usePressScale(target = 0.85) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => {
    scale.value = withTiming(target, { duration: 100 });
  };
  const onPressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };
  return { style, onPressIn, onPressOut };
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Tiered pill for a post's own weekly top-100 rank (distinct from the
 * author's `RankBadge`) — gold/silver/bronze for #1-3, light blue for
 * #4-100. Kept local to this file, mirroring the web's `PostRankPill`,
 * which is likewise private to `post-card.tsx` rather than shared.
 */
function PostRankPill({ rank, label }: { rank: number; label: string }) {
  const { gradients, gradientDirections } = useTheme();

  const tierByRank: Record<number, { gradient: readonly string[]; textColor: string; Icon: LucideIcon }> = {
    1: { gradient: gradients.gold, textColor: '#78350F', Icon: Trophy },
    2: { gradient: gradients.silver, textColor: '#334155', Icon: Award },
    3: { gradient: gradients.bronze, textColor: '#78350F', Icon: Trophy },
  };
  const tier = tierByRank[rank] ?? {
    gradient: ['#7DD3FC', '#38BDF8', '#0EA5E9'] as const,
    textColor: '#0C4A6E',
    Icon: Trophy,
  };

  return (
    <LinearGradient
      colors={tier.gradient as [string, string, ...string[]]}
      start={gradientDirections.diagonal135.start}
      end={gradientDirections.diagonal135.end}
      style={styles.rankPill}
    >
      <tier.Icon size={11} color={tier.textColor} />
      <Text style={[styles.rankPillText, { color: tier.textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </LinearGradient>
  );
}

export function PostCard({
  post,
  currentUserId,
  onLike,
  onUnlike,
  onComment,
  onDelete,
  onUserPress,
  showRanking = false,
  authorRank,
  postRank,
}: PostCardProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { t } = useTranslation('translation', { keyPrefix: 'post' });
  const { t: tTime } = useTranslation('translation', { keyPrefix: 'time' });

  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const images = parseImages(post.imageUrl);
  const isOwnPost = post.user.id === currentUserId;

  const likeScale = usePressScale();
  const commentScale = usePressScale();
  const shareScale = usePressScale();

  const handleLike = () => {
    if (post.isLiked) {
      onUnlike(post.id);
    } else {
      onLike(post.id);
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const data: FeedComment[] = await postsApi.getComments(post.id);
      // Backend returns newest-first; show oldest-first like a normal thread.
      setComments([...data].reverse());
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    if (!showComments) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    const content = commentInput.trim();
    if (!content || postingComment) return;
    setCommentInput('');
    setPostingComment(true);
    try {
      const comment = await onComment(post.id, content);
      setComments((prev) => [...prev, comment]);
    } catch (error) {
      console.error('Failed to add comment:', error);
      setCommentInput(content);
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await postsApi.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: `${post.user.name} en Ve!`,
        message: post.content || t('shareText'),
      });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  const handleUserPress = () => {
    if (onUserPress) {
      onUserPress(post.user.id);
    } else {
      console.warn('PostCard: onUserPress not wired up by this caller');
    }
  };

  const relativeTime = formatRelativeTime(post.createdAt, tTime);
  const likesLabel = formatIcuPlural(t('likes'), post.likesCount);
  const canShowAuthorRank = showRanking && !!authorRank;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleUserPress} hitSlop={4}>
          <Avatar uri={post.user.photoUrl} name={post.user.name} size="md" />
        </Pressable>
        <View style={styles.headerText}>
          <Pressable onPress={handleUserPress} hitSlop={4}>
            <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
              {post.user.name}
            </Text>
          </Pressable>
          <Text style={[styles.userMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {post.user.major} · {relativeTime}
          </Text>
        </View>
        {canShowAuthorRank && <RankBadge rank={authorRank!} size="sm" />}
        {isOwnPost && onDelete && (
          <Pressable onPress={() => onDelete(post.id)} hitSlop={8} style={styles.iconButton}>
            <Trash2 size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* Image carousel — swipeable like Instagram */}
      {images.length > 0 && (
        <View style={{ width, height: width }}>
          <FlatList
            data={images}
            keyExtractor={(_, i) => `${post.id}-img-${i}`}
            renderItem={({ item }) => (
              <View style={{ width, height: width, backgroundColor: '#F0F0F5' }}>
                <Image source={{ uri: item }} style={{ width, height: width }} contentFit="cover" />
              </View>
            )}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(index);
            }}
          />

          {images.length > 1 && (
            <View style={styles.dotsRow} pointerEvents="none">
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i === activeImageIndex ? '#FFFFFF' : 'rgba(255,255,255,0.5)' },
                  ]}
                />
              ))}
            </View>
          )}

          {images.length > 1 && (
            <View style={styles.counterBadge} pointerEvents="none">
              <Text style={styles.counterBadgeText}>
                {activeImageIndex + 1}/{images.length}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <View style={styles.actionsLeft}>
          <AnimatedPressable
            onPress={handleLike}
            onPressIn={likeScale.onPressIn}
            onPressOut={likeScale.onPressOut}
            style={likeScale.style}
            hitSlop={8}
          >
            <Heart
              size={24}
              color={colors.foreground}
              fill={post.isLiked ? colors.foreground : 'transparent'}
              strokeWidth={post.isLiked ? 0 : 1.8}
            />
          </AnimatedPressable>

          <AnimatedPressable
            onPress={toggleComments}
            onPressIn={commentScale.onPressIn}
            onPressOut={commentScale.onPressOut}
            style={commentScale.style}
            hitSlop={8}
          >
            <MessageSquare size={22} color={colors.foreground} strokeWidth={1.8} />
          </AnimatedPressable>

          {showRanking &&
            (postRank ? (
              <PostRankPill rank={postRank} label={t('postTopLabel', { rank: postRank })} />
            ) : (
              <View style={[styles.beyond100Pill, { backgroundColor: colors.secondary }]}>
                <Trophy size={10} color={colors.mutedForeground} />
                <Text style={[styles.beyond100Text, { color: colors.mutedForeground }]}>+100</Text>
              </View>
            ))}
        </View>

        <View style={{ flex: 1 }} />

        <AnimatedPressable
          onPress={handleShare}
          onPressIn={shareScale.onPressIn}
          onPressOut={shareScale.onPressOut}
          style={shareScale.style}
          hitSlop={8}
        >
          <Share2 size={22} color={colors.foreground} strokeWidth={1.8} />
        </AnimatedPressable>
      </View>

      {/* Likes count */}
      {post.likesCount > 0 && (
        <View style={styles.likesRow}>
          <Text style={[styles.likesText, { color: colors.foreground }]}>{likesLabel}</Text>
        </View>
      )}

      {/* Content */}
      {!!post.content && (
        <View style={styles.contentRow}>
          <Text style={[styles.contentText, { color: colors.foreground }]}>
            <Text style={styles.contentAuthor}>{post.user.name} </Text>
            {post.content}
          </Text>
        </View>
      )}

      {/* View comments link */}
      {post.commentsCount > 0 && !showComments && (
        <Pressable onPress={toggleComments} style={styles.viewCommentsRow}>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            {t('viewAllComments', { count: post.commentsCount })}
          </Text>
        </Pressable>
      )}

      {/* Comments section */}
      {showComments && (
        <View style={styles.commentsSection}>
          {loadingComments ? (
            <View style={styles.commentsLoading}>
              <ActivityIndicator color={colors.foreground} />
            </View>
          ) : comments.length > 0 ? (
            <View style={styles.commentsList}>
              {comments.map((comment) => {
                const canDelete = comment.user.id === currentUserId || isOwnPost;
                return (
                  <View key={comment.id} style={styles.commentRow}>
                    <Avatar uri={comment.user.photoUrl} name={comment.user.name} size="xs" />
                    <View style={styles.commentBody}>
                      <Text style={[styles.contentText, { color: colors.foreground }]}>
                        <Text style={styles.contentAuthor}>{comment.user.name} </Text>
                        {comment.content}
                      </Text>
                      <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>
                        {formatRelativeTime(comment.createdAt, tTime)}
                      </Text>
                    </View>
                    {canDelete && (
                      <Pressable
                        onPress={() => handleDeleteComment(comment.id)}
                        hitSlop={8}
                        style={styles.commentDeleteButton}
                      >
                        <Trash2 size={13} color={colors.mutedForeground} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: colors.mutedForeground, fontSize: 13, marginBottom: 12 }}>
              {t('noComments')}
            </Text>
          )}

          <View style={[styles.commentInputRow, { borderTopColor: colors.border }]}>
            <TextInput
              value={commentInput}
              onChangeText={setCommentInput}
              placeholder={t('addComment')}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.commentInput, { color: colors.foreground }]}
              onSubmitEditing={handleAddComment}
              returnKeyType="send"
            />
            <Pressable onPress={handleAddComment} disabled={!commentInput.trim() || postingComment} hitSlop={8}>
              <Text
                style={[
                  styles.postCommentButton,
                  { color: colors.foreground, opacity: !commentInput.trim() || postingComment ? 0.3 : 1 },
                ]}
              >
                {t('post')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Timestamp at bottom */}
      <View style={styles.footerTimestamp}>
        <Text style={[styles.footerTimestampText, { color: colors.mutedForeground }]}>{relativeTime}</Text>
      </View>
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
    minWidth: 0,
  },
  userName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    fontWeight: '700',
  },
  userMeta: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  iconButton: {
    padding: 6,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  counterBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  counterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rankPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  beyond100Pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  beyond100Text: {
    fontSize: 10,
    fontWeight: '700',
  },
  likesRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  likesText: {
    fontSize: 13,
    fontWeight: '700',
  },
  contentRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  contentText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  contentAuthor: {
    fontWeight: '700',
  },
  viewCommentsRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  commentsSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  commentsLoading: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  commentsList: {
    gap: 10,
    marginBottom: 12,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  commentBody: {
    flex: 1,
    minWidth: 0,
  },
  commentTime: {
    fontSize: 11,
    marginTop: 2,
  },
  commentDeleteButton: {
    padding: 4,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  commentInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 4,
  },
  postCommentButton: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerTimestamp: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  footerTimestampText: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
