import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Ban,
  Camera,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  LogOut,
  MapPin,
  MessageSquare,
  Moon,
  Plus,
  Settings,
  Shield,
  Sun,
  Trophy,
  CalendarDays,
  X,
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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreatePostSheet } from '@/components/feed/create-post-sheet';
import { PostCard, type FeedComment, type FeedPost } from '@/components/feed/post-card';
import { Avatar } from '@/components/ui/avatar';
import { Sheet } from '@/components/ui/sheet';
import { openLegalPage } from '@/constants/legal';
import { useAuth } from '@/context/auth-context';
import { useBanner } from '@/context/banner-context';
import { useLocale } from '@/context/locale-context';
import { useProfilePhotos } from '@/context/profile-photos-context';
import { useTheme } from '@/context/theme-context';
import { useToast } from '@/context/toast-context';
import { blocksApi, leaderboardApi, postsApi, usersApi } from '@/lib/api-client';
import { compressImageToDataUrl } from '@/lib/image-compress';

const DELETE_CONFIRM_PHRASE = 'borrar cuenta';
const RANKED_USERS_LIMIT = 100;
const RANKED_POSTS_LIMIT = 100;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const GRID_PADDING = 16;
const GRID_GAP = 8;

/** Web: `bg-gradient-to-br from-[#000000] via-[#171717] to-[#404040]` */
const HEADER_GRADIENT = ['#000000', '#171717', '#404040'] as const;
const DIAGONAL = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };

interface BlockedUser {
  id: string;
  name: string;
  major: string;
  photoUrl?: string | null;
}

/**
 * Ported from the web app's `screens/Profile.tsx` — the largest screen in
 * the app (own profile: banner/avatar editing, bio, posts + photos tabs,
 * settings sheet with language/blocked-users/nickname/delete-account).
 *
 * Image uploads go through the shared `compressImageToDataUrl` utility
 * (`src/lib/image-compress.ts`, also used by Feed's create-post composer)
 * instead of a Profile-local copy — see that file's header comment.
 *
 * `handleDeletePost` intentionally has no confirmation dialog, matching the
 * web source exactly (`screens/Profile.tsx`'s own `handleDeletePost` calls
 * `postsApi.deletePost` directly with no `confirm()`) — this differs from
 * Feed's own delete handler, which does confirm. That asymmetry exists in
 * the web app itself; it is preserved here rather than silently "fixed",
 * since it's out of this port's stated scope.
 */
export default function ProfileScreen() {
  const { colors, theme, preference, setPreference, fonts, gradients, gradientDirections } = useTheme();
  const { width } = useWindowDimensions();
  const { t } = useTranslation('translation', { keyPrefix: 'profile' });
  const { t: tFeed } = useTranslation('translation', { keyPrefix: 'feed' });
  const { locale, setLocale } = useLocale();
  const { user, logout, refreshUser } = useAuth();
  const { photos, maxPhotos, addPhoto, removePhoto } = useProfilePhotos();
  const { banner, setBanner, clearBanner } = useBanner();
  const { showToast } = useToast();
  const router = useRouter();

  const TABS = [t('tabs.posts'), t('tabs.photos')];
  const likesReceived = user?.likesCount ?? 0;

  const [activeTab, setActiveTab] = useState(0);
  const [bioDraft, setBioDraft] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingMainPhoto, setUploadingMainPhoto] = useState(false);
  const [uploadingGalleryPhoto, setUploadingGalleryPhoto] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [weeklyRank, setWeeklyRank] = useState<number | undefined>(undefined);
  const [postRanks, setPostRanks] = useState<Map<string, number>>(new Map());

  // ── Settings sheet (blocked users, nickname, delete account) ──
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'blocked'>('main');
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    usersApi
      .getUserProfile(user.id)
      .then((data) => setPosts(data.posts))
      .catch((error) => console.error('Failed to load posts:', error))
      .finally(() => setLoadingPosts(false));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    leaderboardApi
      .getUsersRanking(RANKED_USERS_LIMIT)
      .then((ranking: { id: string; rank: number }[]) => {
        setWeeklyRank(ranking.find((u) => u.id === user.id)?.rank);
      })
      .catch((error) => console.error('Failed to load weekly rank:', error));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    leaderboardApi
      .getPostsRanking(RANKED_POSTS_LIMIT)
      .then((ranking: { id: string; rank: number }[]) => {
        setPostRanks(new Map(ranking.map((p) => [p.id, p.rank])));
      })
      .catch((error) => console.error('Failed to load post rankings:', error));
  }, [user?.id]);

  async function handleLikePost(postId: string) {
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
  }

  async function handleUnlikePost(postId: string) {
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
  }

  async function handleCommentPost(postId: string, content: string): Promise<FeedComment> {
    const comment = await postsApi.addComment(postId, content);
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p)));
    return comment;
  }

  async function handleDeletePost(postId: string) {
    await postsApi.deletePost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  function handlePostCreated(newPost: FeedPost) {
    setPosts((prev) => [newPost, ...prev]);
  }

  // ── Photo-source picker: web's file inputs let mobile browsers choose
  // between camera/gallery natively; RN needs an explicit chooser instead. ──
  async function choosePhotoSource(): Promise<'camera' | 'gallery' | null> {
    return new Promise((resolve) => {
      let resolved = false;
      const settle = (value: 'camera' | 'gallery' | null) => {
        resolved = true;
        resolve(value);
      };
      Alert.alert(
        tFeed('addPhotos'),
        undefined,
        [
          { text: tFeed('takePhoto'), onPress: () => settle('camera') },
          { text: tFeed('chooseFromGallery'), onPress: () => settle('gallery') },
          { text: t('settings.cancel'), style: 'cancel', onPress: () => settle(null) },
        ],
        { onDismiss: () => { if (!resolved) resolve(null); } }
      );
    });
  }

  async function pickImageAsset(preferFrontCamera: boolean): Promise<ImagePicker.ImagePickerAsset | null> {
    const source = await choosePhotoSource();
    if (!source) return null;

    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showToast(tFeed('alerts.cameraPermissionDenied'), 'error');
        return null;
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
      if (preferFrontCamera) options.cameraType = ImagePicker.CameraType.front;
      const result = await ImagePicker.launchCameraAsync(options);
      return result.canceled ? null : (result.assets[0] ?? null);
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast(tFeed('alerts.galleryPermissionDenied'), 'error');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    return result.canceled ? null : (result.assets[0] ?? null);
  }

  async function handlePickMainPhoto() {
    const asset = await pickImageAsset(true);
    if (!asset) return;
    if (asset.fileSize && asset.fileSize > MAX_FILE_BYTES) {
      showToast(t('alerts.photoTooLarge'), 'error');
      return;
    }
    setUploadingMainPhoto(true);
    try {
      const dataUrl = await compressImageToDataUrl(asset.uri, asset.width, asset.height);
      await usersApi.updateProfile({ photoUrl: dataUrl });
      await refreshUser();
    } catch (error) {
      console.error('Failed to save profile photo:', error);
      showToast(t('alerts.photoUploadFailed'), 'error');
    } finally {
      setUploadingMainPhoto(false);
    }
  }

  async function handleRemoveMainPhoto() {
    setUploadingMainPhoto(true);
    try {
      await usersApi.updateProfile({ photoUrl: null });
      await refreshUser();
    } catch (error) {
      console.error('Failed to remove profile photo:', error);
      showToast(t('alerts.photoRemoveFailed'), 'error');
    } finally {
      setUploadingMainPhoto(false);
    }
  }

  async function handlePickGalleryPhoto() {
    if (photos.length >= maxPhotos) {
      showToast(t('alerts.photosLimitReached', { max: maxPhotos }), 'error');
      return;
    }
    const asset = await pickImageAsset(false);
    if (!asset) return;
    if (asset.fileSize && asset.fileSize > MAX_FILE_BYTES) {
      showToast(t('alerts.photoTooLarge'), 'error');
      return;
    }
    setUploadingGalleryPhoto(true);
    try {
      const dataUrl = await compressImageToDataUrl(asset.uri, asset.width, asset.height);
      await addPhoto(dataUrl);
    } catch (error: any) {
      console.error('Failed to add gallery photo:', error);
      const message =
        error?.message === 'PHOTOS_LIMIT_REACHED'
          ? t('alerts.photosLimitReached', { max: maxPhotos })
          : t('alerts.photoUploadFailed');
      showToast(message, 'error');
    } finally {
      setUploadingGalleryPhoto(false);
    }
  }

  async function handleRemoveGalleryPhoto(index: number) {
    try {
      await removePhoto(index);
    } catch (error) {
      console.error('Failed to remove photo:', error);
      showToast(t('alerts.photoRemoveFailed'), 'error');
    }
  }

  async function handlePickBanner() {
    const asset = await pickImageAsset(false);
    if (!asset) return;
    if (asset.fileSize && asset.fileSize > MAX_FILE_BYTES) {
      showToast(t('alerts.photoTooLarge'), 'error');
      return;
    }
    setUploadingBanner(true);
    try {
      const dataUrl = await compressImageToDataUrl(asset.uri, asset.width, asset.height, { maxDimension: 1600 });
      await setBanner(dataUrl);
    } catch (error) {
      console.error('Failed to save banner:', error);
      showToast(t('alerts.photoUploadFailed'), 'error');
    } finally {
      setUploadingBanner(false);
    }
  }

  async function handleClearBanner() {
    try {
      await clearBanner();
    } catch (error) {
      console.error('Failed to clear banner:', error);
      showToast(t('alerts.photoRemoveFailed'), 'error');
    }
  }

  async function handleToggleEditing() {
    if (!isEditing) {
      setBioDraft(user?.bio ?? '');
      setIsEditing(true);
      return;
    }
    const nextBio = bioDraft.trim();
    if (nextBio !== (user?.bio ?? '')) {
      setSavingBio(true);
      try {
        await usersApi.updateProfile({ bio: nextBio });
        await refreshUser();
      } catch (error) {
        console.error('Failed to save bio:', error);
        showToast(t('alerts.bioSaveFailed'), 'error');
      } finally {
        setSavingBio(false);
      }
    }
    setIsEditing(false);
  }

  function handleOpenSettings() {
    setNicknameDraft(user?.nickname ?? '');
    setSettingsView('main');
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
    setShowSettings(true);
  }

  async function loadBlockedUsers() {
    setLoadingBlocked(true);
    try {
      const data = await blocksApi.getBlockedUsers();
      setBlockedUsers(data);
    } catch (error) {
      console.error('Failed to load blocked users:', error);
      showToast(t('settings.loadBlockedFailed'), 'error');
    } finally {
      setLoadingBlocked(false);
    }
  }

  function handleOpenBlockedList() {
    setSettingsView('blocked');
    loadBlockedUsers();
  }

  async function handleUnblock(blockedUserId: string) {
    setUnblockingId(blockedUserId);
    try {
      await blocksApi.unblockUser(blockedUserId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== blockedUserId));
    } catch (error) {
      console.error('Failed to unblock user:', error);
      showToast(t('settings.unblockFailed'), 'error');
    } finally {
      setUnblockingId(null);
    }
  }

  async function handleSaveNickname() {
    const nextNickname = nicknameDraft.trim();
    if (nextNickname === (user?.nickname ?? '')) return;
    setSavingNickname(true);
    try {
      await usersApi.updateProfile({ nickname: nextNickname });
      await refreshUser();
      showToast(t('settings.nicknameSaved'), 'success');
    } catch (error) {
      console.error('Failed to save nickname:', error);
      showToast(t('settings.nicknameSaveFailed'), 'error');
    } finally {
      setSavingNickname(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.trim().toLowerCase() !== DELETE_CONFIRM_PHRASE) return;
    setDeletingAccount(true);
    try {
      await usersApi.deleteAccount();
      await logout();
    } catch (error) {
      console.error('Failed to delete account:', error);
      showToast(t('settings.deleteAccountFailed'), 'error');
      setDeletingAccount(false);
    }
  }

  function handleToggleTheme() {
    setPreference(theme === 'dark' ? 'light' : 'dark');
  }

  const username = user?.name?.toLowerCase().replace(/\s+/g, '_') ?? 'username';
  const tileSize = (width - GRID_PADDING * 2 - GRID_GAP * 2) / 3;
  const nicknameUnchanged = nicknameDraft.trim() === (user?.nickname ?? '');
  const deletePhraseMatches = deleteConfirmText.trim().toLowerCase() === DELETE_CONFIRM_PHRASE;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ── Banner ── */}
        <View style={styles.bannerWrap}>
          {banner ? (
            <>
              <Image source={{ uri: banner }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient
                colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.25)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </>
          ) : (
            <LinearGradient
              colors={HEADER_GRADIENT}
              start={DIAGONAL.start}
              end={DIAGONAL.end}
              style={StyleSheet.absoluteFill}
            />
          )}

          <View style={styles.bannerTopRow}>
            <Pressable onPress={handleToggleTheme} style={styles.roundButton} hitSlop={8}>
              {theme === 'dark' ? <Sun size={15} color="#FFFFFF" /> : <Moon size={15} color="#FFFFFF" />}
            </Pressable>
            <Pressable onPress={() => logout()} style={styles.roundButton} hitSlop={8}>
              <LogOut size={15} color="#FFFFFF" />
            </Pressable>
          </View>

          {isEditing && (
            <View style={styles.bannerBottomRow}>
              {banner && (
                <Pressable
                  onPress={handleClearBanner}
                  accessibilityLabel={t('removeBanner')}
                  style={styles.roundButton}
                  hitSlop={8}
                >
                  <X size={14} color="#FFFFFF" />
                </Pressable>
              )}
              <Pressable
                onPress={handlePickBanner}
                disabled={uploadingBanner}
                accessibilityLabel={t('editBanner')}
                style={[styles.roundButton, uploadingBanner && styles.roundButtonDisabled]}
                hitSlop={8}
              >
                {uploadingBanner ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Camera size={14} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Avatar + action buttons + info ── */}
        <View style={styles.body}>
          <View style={styles.avatarAbsolute}>
            <View style={[styles.avatarRing, { borderColor: theme === 'dark' ? '#FFFFFF' : '#000000' }]}>
              <Avatar uri={user?.photoUrl} name={user?.name || '?'} size={90} />
            </View>
            {isEditing && (
              <Pressable
                onPress={handlePickMainPhoto}
                accessibilityLabel={t('editProfilePhoto')}
                style={[styles.avatarCameraButton, { borderColor: colors.background }]}
                hitSlop={8}
              >
                <Camera size={12} color="#FFFFFF" />
              </Pressable>
            )}
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleToggleEditing}
              disabled={savingBio}
              style={[
                styles.pillButton,
                { borderColor: colors.border, backgroundColor: colors.card },
                savingBio && styles.disabled,
              ]}
            >
              <Text style={[styles.pillButtonText, { color: colors.foreground }]}>
                {savingBio ? t('savingProfile') : isEditing ? t('doneEditing') : t('editProfile')}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleOpenSettings}
              accessibilityLabel={t('settings.title')}
              style={[styles.iconCircleButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              hitSlop={10}
            >
              <Settings size={16} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.infoBlock}>
            <Text style={[styles.name, { color: colors.foreground, fontFamily: fonts.sans.extraBold }]}>
              {user?.name || t('defaultUser')}
            </Text>
            <Text style={[styles.username, { color: colors.mutedForeground }]}>@{username}</Text>

            {isEditing ? (
              <TextInput
                autoFocus
                value={bioDraft}
                onChangeText={setBioDraft}
                placeholder={t('addBio')}
                placeholderTextColor={colors.mutedForeground}
                maxLength={300}
                multiline
                style={[
                  styles.bioInput,
                  { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground },
                ]}
              />
            ) : (
              <Text
                style={[
                  styles.bioText,
                  { color: user?.bio ? colors.foreground : colors.mutedForeground },
                ]}
              >
                {user?.bio || t('addBio')}
              </Text>
            )}

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MapPin size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {user?.major || t('defaultMajorLocation')}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <CalendarDays size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{t('joinedIn')}</Text>
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
                <Text style={[styles.statNumber, { color: colors.foreground }]}>{likesReceived}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t('likesCount')}</Text>
              </View>
              <Pressable onPress={() => setActiveTab(1)} style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.foreground }]}>{photos.length}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t('photosCount')}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Tabs ── */}
        <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
          {TABS.map((label, i) => {
            const active = activeTab === i;
            return (
              <Pressable
                key={i}
                onPress={() => setActiveTab(i)}
                style={[styles.tabButton, active && { borderBottomColor: colors.foreground }]}
              >
                <Text style={[styles.tabLabel, { color: active ? colors.foreground : colors.mutedForeground }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Posts tab ── */}
        {activeTab === 0 &&
          (loadingPosts ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.foreground} />
            </View>
          ) : posts.length > 0 ? (
            <View>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id || ''}
                  onLike={handleLikePost}
                  onUnlike={handleUnlikePost}
                  onComment={handleCommentPost}
                  onDelete={handleDeletePost}
                  onUserPress={(userId) => router.push(`/user/${userId}`)}
                  showRanking
                  postRank={postRanks.get(post.id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyPosts}>
              <View style={[styles.emptyIconCircle, { borderColor: colors.border }]}>
                <MessageSquare size={26} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('noPostsYet')}</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{t('noPostsHint')}</Text>
              <Pressable
                onPress={() => setShowCreatePost(true)}
                style={[styles.emptyCta, { backgroundColor: colors.primary }]}
              >
                <Plus size={16} color={colors.primaryForeground} />
                <Text style={[styles.emptyCtaText, { color: colors.primaryForeground }]}>
                  {t('createFirstPost')}
                </Text>
              </Pressable>
            </View>
          ))}

        {/* ── Photos tab ── */}
        {activeTab === 1 && (
          <View style={styles.photosTab}>
            <Text style={[styles.photosExplainer, { color: colors.mutedForeground }]}>
              {t('photosExplainer')}
            </Text>
            <View style={styles.photosGrid}>
              {/* Slot 0: the principal photo — backend-persisted, shown everywhere else. */}
              <View style={[styles.photoTile, { width: tileSize, height: tileSize }]}>
                {user?.photoUrl ? (
                  <>
                    <Image source={{ uri: user.photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    <View style={styles.mainBadge}>
                      <Text style={styles.mainBadgeText}>{t('main')}</Text>
                    </View>
                    {uploadingMainPhoto ? (
                      <View style={[StyleSheet.absoluteFill, styles.tileOverlaySpinner]}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    ) : (
                      <View style={styles.tileTopRightButtons}>
                        <Pressable
                          onPress={handleRemoveMainPhoto}
                          accessibilityLabel={t('removeProfilePhoto')}
                          style={styles.tileIconButton}
                          hitSlop={4}
                        >
                          <X size={12} color="#FFFFFF" />
                        </Pressable>
                        <Pressable
                          onPress={handlePickMainPhoto}
                          accessibilityLabel={t('editProfilePhoto')}
                          style={styles.tileIconButton}
                          hitSlop={4}
                        >
                          <Camera size={12} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    )}
                  </>
                ) : uploadingMainPhoto ? (
                  <View style={[styles.dashedTile, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                    <ActivityIndicator size="small" color={colors.mutedForeground} />
                  </View>
                ) : (
                  <Pressable
                    onPress={handlePickMainPhoto}
                    accessibilityLabel={t('addFirstPhoto')}
                    style={[styles.dashedTile, { borderColor: colors.border, backgroundColor: colors.secondary }]}
                  >
                    <Plus size={22} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </View>

              {/* Slots 1-8: gallery photos, shown on Explore swipe cards. */}
              {photos.map((photo, i) => (
                <View key={i} style={[styles.photoTile, { width: tileSize, height: tileSize }]}>
                  <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <Pressable
                    onPress={() => handleRemoveGalleryPhoto(i)}
                    style={styles.tileRemoveButton}
                    hitSlop={4}
                  >
                    <X size={12} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}

              {/* Next empty gallery slot — always visible up to maxPhotos. */}
              {photos.length < maxPhotos && (
                <View
                  style={[
                    styles.photoTile,
                    styles.dashedTile,
                    { width: tileSize, height: tileSize, borderColor: colors.border, backgroundColor: colors.secondary },
                  ]}
                >
                  {uploadingGalleryPhoto ? (
                    <ActivityIndicator size="small" color={colors.mutedForeground} />
                  ) : (
                    <Pressable onPress={handlePickGalleryPhoto} style={styles.fillCenter}>
                      <Plus size={22} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Settings sheet ── */}
      <Sheet isOpen={showSettings} onClose={() => setShowSettings(false)} snapPoints={['85%']} scrollable>
        <View style={styles.sheetHeader}>
          {settingsView === 'blocked' && (
            <Pressable
              onPress={() => setSettingsView('main')}
              style={[styles.sheetBackButton, { backgroundColor: colors.secondary }]}
              hitSlop={8}
            >
              <ChevronLeft size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
            {settingsView === 'blocked' ? t('settings.blockedTitle') : t('settings.title')}
          </Text>
        </View>

        {settingsView === 'blocked' ? (
          loadingBlocked ? (
            <View style={styles.sheetLoading}>
              <ActivityIndicator color={colors.foreground} />
            </View>
          ) : blockedUsers.length === 0 ? (
            <Text style={[styles.sheetEmptyText, { color: colors.mutedForeground }]}>
              {t('settings.noBlockedUsers')}
            </Text>
          ) : (
            <View style={{ gap: 4 }}>
              {blockedUsers.map((blockedUser) => (
                <View key={blockedUser.id} style={styles.blockedRow}>
                  <Avatar uri={blockedUser.photoUrl} name={blockedUser.name} size="md" />
                  <View style={styles.blockedInfo}>
                    <Text numberOfLines={1} style={[styles.blockedName, { color: colors.foreground }]}>
                      {blockedUser.name}
                    </Text>
                    <Text numberOfLines={1} style={[styles.blockedMajor, { color: colors.mutedForeground }]}>
                      {blockedUser.major}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleUnblock(blockedUser.id)}
                    disabled={unblockingId === blockedUser.id}
                    style={[
                      styles.unblockButton,
                      { borderColor: colors.border },
                      unblockingId === blockedUser.id && styles.disabled,
                    ]}
                  >
                    <Text style={[styles.unblockButtonText, { color: colors.foreground }]}>
                      {unblockingId === blockedUser.id ? t('settings.unblocking') : t('settings.unblock')}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )
        ) : (
          <View style={{ gap: 20 }}>
            <Pressable
              onPress={() => setLocale(locale === 'es' ? 'en' : 'es')}
              style={[styles.settingsRow, { borderColor: colors.border }]}
            >
              <View style={styles.settingsRowLabel}>
                <Globe size={15} color={colors.foreground} />
                <Text style={[styles.settingsRowLabelText, { color: colors.foreground }]}>
                  {t('settings.language')}
                </Text>
              </View>
              <Text style={[styles.settingsRowValue, { color: colors.mutedForeground }]}>
                {locale.toUpperCase()}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleOpenBlockedList}
              style={[styles.settingsRow, { borderColor: colors.border }]}
            >
              <View style={styles.settingsRowLabel}>
                <Ban size={15} color={colors.foreground} />
                <Text style={[styles.settingsRowLabelText, { color: colors.foreground }]}>
                  {t('settings.blocked')}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </Pressable>

            <View>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                {t('settings.personalInfo')}
              </Text>
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t('nickname')}</Text>
                  <View style={styles.nicknameRow}>
                    <TextInput
                      value={nicknameDraft}
                      onChangeText={setNicknameDraft}
                      placeholder={t('nicknamePlaceholder')}
                      placeholderTextColor={colors.mutedForeground}
                      style={[
                        styles.nicknameInput,
                        { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground },
                      ]}
                    />
                    <Pressable
                      onPress={handleSaveNickname}
                      disabled={savingNickname || nicknameUnchanged}
                      style={[
                        styles.saveNicknameButton,
                        { backgroundColor: colors.primary },
                        (savingNickname || nicknameUnchanged) && styles.disabled,
                      ]}
                    >
                      <Text style={[styles.saveNicknameButtonText, { color: colors.primaryForeground }]}>
                        {savingNickname ? t('settings.saving') : t('settings.save')}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                    {t('settings.nicknameHint')}
                  </Text>
                </View>

                <View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t('fullName')}</Text>
                  <View style={[styles.readonlyField, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.readonlyFieldText, { color: colors.mutedForeground }]}>{user?.name}</Text>
                  </View>
                </View>
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t('email')}</Text>
                  <View style={[styles.readonlyField, { backgroundColor: colors.secondary }]}>
                    <Text numberOfLines={1} style={[styles.readonlyFieldText, { color: colors.mutedForeground }]}>
                      {user?.email}
                    </Text>
                  </View>
                </View>
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t('major')}</Text>
                  <View style={[styles.readonlyField, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.readonlyFieldText, { color: colors.mutedForeground }]}>{user?.major}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.legalSection, { borderTopColor: colors.border }]}>
              <Pressable onPress={() => openLegalPage('terms')} style={styles.legalRow} accessibilityRole="link">
                <FileText size={16} color={colors.mutedForeground} />
                <Text style={[styles.legalText, { color: colors.foreground }]}>{t('settings.terms')}</Text>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </Pressable>
              <Pressable onPress={() => openLegalPage('privacy')} style={styles.legalRow} accessibilityRole="link">
                <Shield size={16} color={colors.mutedForeground} />
                <Text style={[styles.legalText, { color: colors.foreground }]}>{t('settings.privacy')}</Text>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={[styles.deleteSection, { borderTopColor: colors.border }]}>
              {!showDeleteConfirm ? (
                <Pressable onPress={() => setShowDeleteConfirm(true)}>
                  <Text style={[styles.deleteText, { color: colors.destructive }]}>{t('settings.deleteAccount')}</Text>
                </Pressable>
              ) : (
                <View style={{ gap: 8 }}>
                  <Text style={[styles.deleteText, { color: colors.destructive }]}>
                    {t('settings.deleteConfirmPrompt')}
                  </Text>
                  <Text style={[styles.deleteHint, { color: colors.mutedForeground }]}>
                    {t('settings.deleteConfirmInstructions', { phrase: DELETE_CONFIRM_PHRASE })}
                  </Text>
                  <TextInput
                    value={deleteConfirmText}
                    onChangeText={setDeleteConfirmText}
                    placeholder={DELETE_CONFIRM_PHRASE}
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="none"
                    style={[
                      styles.deleteInput,
                      { borderColor: 'rgba(255,59,48,0.3)', backgroundColor: colors.card, color: colors.foreground },
                    ]}
                  />
                  <View style={styles.deleteButtonsRow}>
                    <Pressable
                      onPress={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                      }}
                      style={[styles.cancelButton, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>
                        {t('settings.cancel')}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleDeleteAccount}
                      disabled={!deletePhraseMatches || deletingAccount}
                      style={[
                        styles.confirmDeleteButton,
                        { backgroundColor: colors.destructive },
                        (!deletePhraseMatches || deletingAccount) && styles.disabled,
                      ]}
                    >
                      <Text style={styles.confirmDeleteButtonText}>
                        {deletingAccount ? t('settings.deleting') : t('settings.confirmDelete')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </Sheet>

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
  scrollContent: { paddingBottom: 32 },

  bannerWrap: {
    width: '100%',
    height: 110,
    overflow: 'hidden',
  },
  bannerTopRow: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerBottomRow: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roundButton: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  roundButtonDisabled: {
    opacity: 0.6,
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
  avatarCameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: 28,
    width: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: '#000000',
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
  bioInput: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  bioText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
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

  loadingWrap: {
    paddingVertical: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPosts: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconCircle: {
    height: 64,
    width: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '600',
  },

  photosTab: {
    padding: 16,
  },
  photosExplainer: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  photoTile: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  dashedTile: {
    flex: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#000000',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mainBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tileOverlaySpinner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  tileTopRightButtons: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    gap: 4,
  },
  tileIconButton: {
    height: 24,
    width: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  tileRemoveButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    height: 24,
    width: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

  // Settings sheet
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 16,
  },
  sheetBackButton: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  sheetLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  sheetEmptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 40,
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  blockedInfo: {
    flex: 1,
    minWidth: 0,
  },
  blockedName: {
    fontSize: 14,
    fontWeight: '600',
  },
  blockedMajor: {
    fontSize: 12,
  },
  unblockButton: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingsRowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsRowLabelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  settingsRowValue: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 11,
  },
  nicknameRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  nicknameInput: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  saveNicknameButton: {
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveNicknameButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 11,
    marginTop: 4,
  },
  readonlyField: {
    marginTop: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  readonlyFieldText: {
    fontSize: 13,
  },
  legalSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  legalText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  deleteSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  deleteInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  deleteButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
