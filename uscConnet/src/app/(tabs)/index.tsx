import { useRouter } from 'expo-router';
import { Bell, Plus, Search } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreatePostSheet } from '@/components/feed/create-post-sheet';
import { PostCard, type FeedComment, type FeedPost } from '@/components/feed/post-card';
import { PostCardSkeletonList } from '@/components/feed/post-card-skeleton';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { useNotification } from '@/context/notification-context';
import { useTheme } from '@/context/theme-context';
import { leaderboardApi, postsApi, usersApi } from '@/lib/api-client';

const FEED_PAGE_SIZE = 20;
const RANKED_POSTS_LIMIT = 100;
const RANKED_USERS_LIMIT = 100;

interface SearchResult {
  id: string;
  name: string;
  major: string;
  photoUrl?: string | null;
}

export default function FeedScreen() {
  const { colors, fonts } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation('translation', { keyPrefix: 'feed' });
  const { t: tNotifications } = useTranslation('translation', { keyPrefix: 'notificationsPage' });
  const router = useRouter();
  const { unreadCount } = useNotification();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [postRanks, setPostRanks] = useState<Map<string, number>>(new Map());
  const [userRanks, setUserRanks] = useState<Map<string, number>>(new Map());
  const [showCreatePost, setShowCreatePost] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const offsetRef = useRef(0);
  const fetchingFeedRef = useRef(false);
  const listRef = useRef<FlatList<FeedPost>>(null);

  const loadFeed = async (opts?: { silent?: boolean }) => {
    if (fetchingFeedRef.current) return;
    fetchingFeedRef.current = true;
    try {
      if (!opts?.silent) setLoading(true);
      const data: FeedPost[] = await postsApi.getFeed(0, FEED_PAGE_SIZE);
      setPosts(data);
      offsetRef.current = data.length;
      setHasMore(data.length === FEED_PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      if (!opts?.silent) setLoading(false);
      fetchingFeedRef.current = false;
    }
  };

  const loadMorePosts = async () => {
    if (loading || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const data: FeedPost[] = await postsApi.getFeed(offsetRef.current, FEED_PAGE_SIZE);
      setPosts((prev) => [...prev, ...data]);
      offsetRef.current += data.length;
      setHasMore(data.length === FEED_PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const loadPostRanks = async () => {
    try {
      const ranking: Array<{ id: string; rank: number }> = await leaderboardApi.getPostsRanking(RANKED_POSTS_LIMIT);
      setPostRanks(new Map(ranking.map((p) => [p.id, p.rank])));
    } catch (error) {
      console.error('Failed to load post rankings:', error);
    }
  };

  const loadUserRanks = async () => {
    try {
      const ranking: Array<{ id: string; rank: number }> = await leaderboardApi.getUsersRanking(RANKED_USERS_LIMIT);
      setUserRanks(new Map(ranking.map((u) => [u.id, u.rank])));
    } catch (error) {
      console.error('Failed to load user rankings:', error);
    }
  };

  useEffect(() => {
    loadFeed();
    loadPostRanks();
    loadUserRanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced (300ms) user search, matching the web app's Feed search box.
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const data: SearchResult[] = await usersApi.searchUsers(query);
        setSearchResults(data);
      } catch (error) {
        console.error('Failed to search users:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleSelectSearchResult = (id: string) => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    router.push(`/user/${id}`);
  };

  const handleLogoPress = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    loadFeed();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed({ silent: true });
    setRefreshing(false);
  };

  const handleLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isLiked: true, likesCount: p.likesCount + 1 } : p))
    );
    try {
      await postsApi.likePost(postId);
    } catch (error) {
      console.error('Failed to like post:', error);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isLiked: false, likesCount: p.likesCount - 1 } : p))
      );
    }
  };

  const handleUnlike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isLiked: false, likesCount: p.likesCount - 1 } : p))
    );
    try {
      await postsApi.unlikePost(postId);
    } catch (error) {
      console.error('Failed to unlike post:', error);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isLiked: true, likesCount: p.likesCount + 1 } : p))
      );
    }
  };

  const handleComment = async (postId: string, content: string): Promise<FeedComment> => {
    const comment: FeedComment = await postsApi.addComment(postId, content);
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p)));
    return comment;
  };

  const handleDelete = (postId: string) => {
    // web uses `confirm()`; RN's `Alert.alert` is the platform-native
    // equivalent for a destructive confirmation dialog. Its two buttons
    // have no localized-string source in the shared catalogs (the browser
    // supplied "OK"/"Cancel" for `confirm()`), so they're plain literals.
    Alert.alert(t('alerts.deleteConfirm'), undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await postsApi.deletePost(postId);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
            offsetRef.current = Math.max(0, offsetRef.current - 1);
          } catch (error) {
            console.error('Failed to delete post:', error);
            Alert.alert(t('alerts.deleteFailed'));
          }
        },
      },
    ]);
  };

  const handlePostCreated = (newPost: FeedPost) => {
    setPosts((prev) => [newPost, ...prev]);
    offsetRef.current += 1;
  };

  const composerInitial = user?.name?.charAt(0).toUpperCase() || 'U';

  const renderComposerBar = useMemo(
    () => (
      <Pressable
        onPress={() => setShowCreatePost(true)}
        style={[styles.composerBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <View style={[styles.composerAvatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.composerAvatarText, { color: colors.primaryForeground }]}>{composerInitial}</Text>
        </View>
        <View style={[styles.composerPill, { borderColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{t('whatsOnYourMind')}</Text>
        </View>
      </Pressable>
    ),
    [colors, composerInitial, t]
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.headerRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={handleLogoPress} hitSlop={8} style={styles.logoPressable}>
          <Text style={[styles.logoText, { color: colors.foreground, fontFamily: fonts.caveat.bold }]}>Ve!</Text>
        </Pressable>

        <View style={styles.searchWrapper}>
          <View style={[styles.searchInputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Search size={15} color={colors.mutedForeground} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 150)}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
            />
          </View>

          {showSearchResults && searchQuery.trim().length > 0 && (
            <View
              style={[styles.searchDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {searching ? (
                <Text style={[styles.searchDropdownMessage, { color: colors.mutedForeground }]}>
                  {t('searching')}
                </Text>
              ) : searchResults.length === 0 ? (
                <Text style={[styles.searchDropdownMessage, { color: colors.mutedForeground }]}>
                  {t('noPeopleFound')}
                </Text>
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 280 }}>
                  {searchResults.map((result) => (
                    <Pressable
                      key={result.id}
                      onPress={() => handleSelectSearchResult(result.id)}
                      style={styles.searchResultRow}
                    >
                      <Avatar uri={result.photoUrl} name={result.name} size="sm" />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.searchResultName, { color: colors.foreground }]} numberOfLines={1}>
                          {result.name}
                        </Text>
                        <Text
                          style={[styles.searchResultMajor, { color: colors.mutedForeground }]}
                          numberOfLines={1}
                        >
                          {result.major}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        <Pressable
          onPress={() => router.push('/notifications')}
          hitSlop={8}
          style={styles.bellButton}
          accessibilityLabel={tNotifications('title')}
        >
          <Bell size={22} color={colors.foreground} />
          {unreadCount > 0 && (
            <View style={[styles.bellBadge, { backgroundColor: colors.destructive, borderColor: colors.background }]}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={() => setShowCreatePost(true)}
          hitSlop={8}
          style={styles.plusButton}
        >
          <Text style={[styles.plusText, { color: colors.foreground, fontFamily: fonts.caveat.bold }]}>+</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={loading ? [] : posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?.id || ''}
            onLike={handleLike}
            onUnlike={handleUnlike}
            onComment={handleComment}
            onDelete={handleDelete}
            onUserPress={(userId) => router.push(`/user/${userId}`)}
            showRanking
            authorRank={userRanks.get(item.user.id)}
            postRank={postRanks.get(item.id)}
          />
        )}
        ListHeaderComponent={renderComposerBar}
        ListEmptyComponent={
          loading ? (
            <PostCardSkeletonList count={4} />
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.secondary }]}>
                <Plus size={32} color={colors.foreground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('noPostsYet')}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>{t('beFirstToShare')}</Text>
              <Pressable
                onPress={() => setShowCreatePost(true)}
                style={[styles.emptyCta, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: colors.primaryForeground, fontWeight: '600', fontSize: 14 }}>
                  {t('createPost')}
                </Text>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerSpinner}>
              <ActivityIndicator color={colors.foreground} />
            </View>
          ) : null
        }
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.foreground} />
        }
        keyboardShouldPersistTaps="handled"
      />

      <CreatePostSheet
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onCreated={handlePostCreated}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
    elevation: 20,
  },
  // Caveat is a script font whose ascenders overshoot a tight lineHeight —
  // at 34 (barely above the 30 fontSize) iOS clips the "V"'s left stroke
  // against its own line box. A generous lineHeight plus a little left
  // padding on the wrapping Pressable gives the glyph the headroom it needs
  // (the Auth screen's identical wordmark isn't visibly affected only
  // because it sits centered in an 80x80 box with plenty of slack on every
  // side). The "!"'s stylized comma-shaped stroke and separated dot are the
  // font's actual glyph design, not clipping — verified against the raw
  // outline in Caveat_700Bold.ttf.
  logoPressable: {
    paddingLeft: 3,
    marginLeft: -8,
  },
  logoText: {
    fontSize: 30,
    lineHeight: 44,
  },
  plusButton: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: {
    fontSize: 30,
    lineHeight: 36,
  },
  bellButton: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchWrapper: {
    flex: 1,
    minWidth: 0,
    marginLeft: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    height: 36,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  searchDropdown: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  searchDropdownMessage: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchResultName: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchResultMajor: {
    fontSize: 11,
  },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  composerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerAvatarText: {
    fontSize: 12,
    fontWeight: '700',
  },
  composerPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 48,
  },
  emptyIconWrap: {
    padding: 24,
    borderRadius: 999,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 16,
  },
  emptyCta: {
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  footerSpinner: {
    alignItems: 'center',
    paddingVertical: 24,
  },
});
