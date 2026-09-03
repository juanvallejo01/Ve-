import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronLeft, ChevronRight, Image as ImageIcon, Trash2, X } from 'lucide-react-native';
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

import { Sheet } from '@/components/ui/sheet';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { postsApi } from '@/lib/api-client';
import { compressImageToDataUrl } from '@/lib/image-compress';
import { useTheme } from '@/context/theme-context';

import type { FeedPost } from './post-card';

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export interface CreatePostSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (post: FeedPost) => void;
}

/**
 * Create-post composer. Ported from the inline modal in the web app's
 * `screens/Feed.tsx` (`showCreatePost` block), split out into its own
 * component here since RN's `Sheet` primitive (Phase 1, built on
 * `@gorhom/bottom-sheet`) is a natural boundary for it.
 */
export function CreatePostSheet({ visible, onClose, onCreated }: CreatePostSheetProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation('translation', { keyPrefix: 'feed' });

  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processingImages, setProcessingImages] = useState(false);
  const [creating, setCreating] = useState(false);

  // Fresh compose state every time the sheet opens, regardless of how it was
  // last dismissed (X button, backdrop tap, submit, or a swipe-down gesture
  // — the last of which has no equivalent in the web app's modal).
  useEffect(() => {
    if (visible) {
      setContent('');
      setImages([]);
      setCurrentIndex(0);
      setCreating(false);
    }
  }, [visible]);

  const handleClose = () => {
    onClose();
  };

  const addAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    if (assets.length === 0) return;

    if (images.length + assets.length > MAX_IMAGES) {
      showToast(t('alerts.maxImages'), 'error');
      return;
    }

    const validAssets = assets.filter((asset) => {
      if (asset.fileSize && asset.fileSize > MAX_FILE_BYTES) return false;
      if (asset.mimeType && !asset.mimeType.startsWith('image/')) return false;
      return true;
    });
    if (validAssets.length === 0) return;

    setProcessingImages(true);
    try {
      const compressed = await Promise.all(
        validAssets.map((asset) => compressImageToDataUrl(asset.uri, asset.width, asset.height))
      );
      setImages((prev) => [...prev, ...compressed]);
    } catch (error) {
      console.error('Failed to process picked images:', error);
    } finally {
      setProcessingImages(false);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showToast(t('alerts.cameraPermissionDenied'), 'error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled) {
      await addAssets(result.assets);
    }
  };

  const handleChooseFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast(t('alerts.galleryPermissionDenied'), 'error');
      return;
    }
    const remaining = Math.max(1, MAX_IMAGES - images.length);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    if (!result.canceled) {
      await addAssets(result.assets);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (currentIndex >= next.length && next.length > 0) {
        setCurrentIndex(next.length - 1);
      } else if (next.length === 0) {
        setCurrentIndex(0);
      }
      return next;
    });
  };

  const handleCreatePost = async () => {
    if (creating) return;

    if (images.length === 0 && !content.trim()) {
      Alert.alert(t('alerts.needContentOrImage'));
      return;
    }

    try {
      setCreating(true);
      const newPost: FeedPost = await postsApi.createPost({
        content: content.trim(),
        // Preserve the exact wire contract used by the web app: 0 images
        // omits `imageUrl` entirely, exactly 1 sends a bare data-URL string,
        // 2+ sends a JSON-stringified array. `PostCard`'s `parseImages()`
        // depends on this shape (falls back to `[imageUrl]` when it isn't
        // valid JSON), so do not change it.
        imageUrl: images.length > 1 ? JSON.stringify(images) : images.length === 1 ? images[0] : undefined,
      });
      onCreated(newPost);
      onClose();
    } catch (error: any) {
      console.error('Failed to create post:', error);
      Alert.alert(error?.response?.data?.message || t('alerts.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const canSubmit = !creating && (images.length > 0 || !!content.trim());

  return (
    <Sheet isOpen={visible} onClose={handleClose} snapPoints={['92%']} scrollable>
      <View style={styles.headerRow}>
        <Pressable onPress={handleClose} hitSlop={8} style={styles.headerButton}>
          <X size={20} color={colors.mutedForeground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t('newPost')}</Text>
        <Pressable
          onPress={handleCreatePost}
          disabled={!canSubmit}
          style={[styles.shareButton, { backgroundColor: colors.primary, opacity: canSubmit ? 1 : 0.5 }]}
        >
          {creating ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.shareButtonText, { color: colors.primaryForeground }]}>{t('share')}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.userRow}>
        <View style={[styles.userAvatarFallback, { backgroundColor: colors.primary }]}>
          <Text style={[styles.userAvatarInitial, { color: colors.primaryForeground }]}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
            {user?.name || t('defaultUser')}
          </Text>
          <Text style={[styles.userMajor, { color: colors.mutedForeground }]} numberOfLines={1}>
            {user?.major || t('defaultMajor')}
          </Text>
        </View>
      </View>

      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder={t('writeCaption')}
        placeholderTextColor={colors.mutedForeground}
        multiline
        style={[styles.captionInput, { color: colors.foreground }]}
      />

      {images.length > 0 ? (
        <View style={[styles.previewWrap, { backgroundColor: colors.border }]}>
          <View style={styles.previewMain}>
            <Image source={{ uri: images[currentIndex] }} style={StyleSheet.absoluteFill} contentFit="cover" />

            <Pressable
              onPress={() => handleRemoveImage(currentIndex)}
              style={[styles.overlayButton, { top: 12, right: 12 }]}
            >
              <Trash2 size={16} color="#FFFFFF" />
            </Pressable>

            {images.length > 1 && (
              <View style={[styles.counterBadge, { top: 12, left: 12 }]}>
                <Text style={styles.counterBadgeText}>
                  {currentIndex + 1} / {images.length}
                </Text>
              </View>
            )}

            {images.length > 1 && currentIndex > 0 && (
              <Pressable
                onPress={() => setCurrentIndex(currentIndex - 1)}
                style={[styles.overlayButton, styles.navButton, { left: 12 }]}
              >
                <ChevronLeft size={20} color="#FFFFFF" />
              </Pressable>
            )}
            {images.length > 1 && currentIndex < images.length - 1 && (
              <Pressable
                onPress={() => setCurrentIndex(currentIndex + 1)}
                style={[styles.overlayButton, styles.navButton, { right: 12 }]}
              >
                <ChevronRight size={20} color="#FFFFFF" />
              </Pressable>
            )}

            {processingImages && (
              <View style={[StyleSheet.absoluteFill, styles.processingOverlay]}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            )}
          </View>

          {images.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbStrip}>
              {images.map((preview, index) => (
                <Pressable key={index} onPress={() => setCurrentIndex(index)}>
                  <Image
                    source={{ uri: preview }}
                    style={[
                      styles.thumb,
                      index === currentIndex
                        ? { borderWidth: 2, borderColor: colors.primary }
                        : { opacity: 0.6 },
                    ]}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          )}

          {images.length < MAX_IMAGES && (
            <View style={[styles.addMoreRow, { borderTopColor: colors.border }]}>
              <Pressable onPress={handleTakePhoto} style={[styles.addMoreButton, { borderRightColor: colors.border, borderRightWidth: StyleSheet.hairlineWidth }]}>
                <Camera size={16} color={colors.foreground} />
                <Text style={[styles.addMoreText, { color: colors.foreground }]}>{t('takePhoto')}</Text>
              </Pressable>
              <Pressable onPress={handleChooseFromGallery} style={styles.addMoreButton}>
                <ImageIcon size={16} color={colors.foreground} />
                <Text style={[styles.addMoreText, { color: colors.foreground }]}>
                  {t('gallery')} ({images.length}/{MAX_IMAGES})
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.emptyDropzone, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
          <Text style={[styles.emptyDropzoneTitle, { color: colors.foreground }]}>{t('addPhotos')}</Text>
          <View style={styles.emptyDropzoneRow}>
            <Pressable
              onPress={handleTakePhoto}
              style={[styles.emptyDropzoneButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <View style={[styles.emptyDropzoneIcon, { backgroundColor: colors.secondary }]}>
                <Camera size={20} color={colors.foreground} />
              </View>
              <Text style={[styles.emptyDropzoneButtonText, { color: colors.foreground }]}>{t('takePhoto')}</Text>
            </Pressable>
            <Pressable
              onPress={handleChooseFromGallery}
              style={[styles.emptyDropzoneButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <View style={[styles.emptyDropzoneIcon, { backgroundColor: colors.secondary }]}>
                <ImageIcon size={20} color={colors.foreground} />
              </View>
              <Text style={[styles.emptyDropzoneButtonText, { color: colors.foreground }]}>
                {t('chooseFromGallery')}
              </Text>
            </Pressable>
          </View>
          {processingImages && (
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              <ActivityIndicator color={colors.foreground} />
            </View>
          )}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    fontWeight: '700',
  },
  shareButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  shareButtonText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    fontWeight: '700',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  userAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitial: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    fontWeight: '700',
  },
  userName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
  },
  userMajor: {
    fontSize: 12,
    marginTop: 1,
  },
  captionInput: {
    fontSize: 14,
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top',
    paddingVertical: 4,
  },
  previewWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 16,
  },
  previewMain: {
    width: '100%',
    aspectRatio: 1,
  },
  overlayButton: {
    position: 'absolute',
    padding: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  navButton: {
    top: '50%',
    marginTop: -18,
  },
  counterBadge: {
    position: 'absolute',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  counterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  processingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  thumbStrip: {
    flexDirection: 'row',
    padding: 12,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 8,
  },
  addMoreRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addMoreButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  addMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyDropzone: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  emptyDropzoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyDropzoneRow: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyDropzoneButton: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
  },
  emptyDropzoneIcon: {
    padding: 10,
    borderRadius: 999,
  },
  emptyDropzoneButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
