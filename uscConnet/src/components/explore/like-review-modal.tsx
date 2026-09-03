import { LinearGradient } from 'expo-linear-gradient';
import { Heart, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { PhotoGallery } from '@/components/explore/photo-gallery';
import { getDisplayPhotos } from '@/lib/photos';

interface LikeReviewUser {
  id: string;
  name: string;
  major: string;
  photoUrl?: string | null;
  photos?: string[] | null;
}

/**
 * Ported from the web app's `components/explore/like-review-modal.tsx`: a
 * full-bleed "as if you were inside Discover" review card — the same photo +
 * bottom-gradient treatment as the swipe deck, but for a single incoming like
 * with accept/reject actions instead of swipe gestures. Presented as a
 * full-screen RN `Modal` in place of the web's `fixed inset-0 z-50` overlay.
 */
export function LikeReviewModal({
  user,
  onLikeBack,
  onReject,
  onClose,
  isSubmitting,
}: {
  user: LikeReviewUser;
  onLikeBack: () => void;
  onReject: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation('translation', { keyPrefix: 'likeReview' });
  const insets = useSafeAreaInsets();

  return (
    <Modal visible animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Full-bleed edge-to-edge photo, matching the immersive full-screen
            treatment of the swipe deck this is reviewing a single card from —
            only the close button and bottom content respect safe-area insets. */}
        <PhotoGallery
          photos={getDisplayPhotos(user.photoUrl, user.photos)}
          alt={user.name}
          style={StyleSheet.absoluteFill}
        />

        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.9)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <Pressable
          onPress={onClose}
          style={[styles.closeButton, { top: insets.top + 12 }]}
          hitSlop={8}
        >
          <X size={18} color="#FFFFFF" />
        </Pressable>

        <View style={[styles.bottomContent, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.major}>{user.major}</Text>
          <Text style={styles.likedText}>💛 {t('likedYourProfile')}</Text>

          <View style={styles.actionsRow}>
            <Button
              variant="outline"
              disabled={isSubmitting}
              onPress={onReject}
              style={[styles.actionButton, styles.rejectButton]}
              textColor="#FFFFFF"
              icon={<X size={18} color="#FFFFFF" />}
            >
              {t('reject')}
            </Button>

            <Button
              variant="primary"
              disabled={isSubmitting}
              loading={isSubmitting}
              onPress={onLikeBack}
              style={styles.actionButton}
              icon={<Heart size={18} color="#FFFFFF" fill="#FFFFFF" />}
            >
              {t('like')}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  bottomContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 64,
  },
  name: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 38,
  },
  major: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  likedText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
  },
  rejectButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 2,
  },
});
