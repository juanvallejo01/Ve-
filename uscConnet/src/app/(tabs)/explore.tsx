import { Heart, RotateCcw, Sparkles, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { PhotoGallery } from '@/components/explore/photo-gallery';
import { SwipeCard, type SwipeCardHandle } from '@/components/explore/swipe-card';
import { BouncingEmoji, Confetti } from '@/components/shared/match-celebration-fx';
import { useChat } from '@/context/chat-context';
import { useMatch } from '@/context/match-context';
import { useNotification } from '@/context/notification-context';
import { useTheme } from '@/context/theme-context';
import { usePressSpring } from '@/hooks/use-press-spring';
import { leaderboardApi, usersApi } from '@/lib/api-client';
import { getDisplayPhotos } from '@/lib/photos';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Same limit as the web's `RANKED_USERS_LIMIT` in `Explore.tsx`.
const RANKED_USERS_LIMIT = 100;
const PROFILES_LIMIT = 20;
// Matches SwipeCard's own exit-animation duration, so the parent advances to
// the next profile right as the current one finishes leaving the screen —
// same ~300ms feel as the web's `setTimeout(..., 300)`.
const ADVANCE_DELAY_MS = 300;

interface ExploreUser {
  id: string;
  name: string;
  major: string;
  likesCount: number;
  photoUrl?: string | null;
  photos?: string[];
}

/**
 * Ported from the web app's `screens/Explore.tsx`. See `swipe-card.tsx` for
 * notes on the gesture-handling port; this file mirrors the web's state
 * machine (profiles/currentIndex/canUndo/match-modal) and API wiring
 * (`useMatch`, `useChat`, `useNotification`) closely. `Confetti`/`BouncingEmoji`
 * live in `components/shared/match-celebration-fx.tsx` — Phase 6 reuses the
 * same pieces for the Matches/Notifications screens' celebration overlays.
 */
export default function ExploreScreen() {
  const { colors, theme } = useTheme();
  const { t } = useTranslation('translation', { keyPrefix: 'explore' });
  const { likeUser, hasLiked, isMatched } = useMatch();
  const { openChat } = useChat();
  const { refresh: refreshNotifications } = useNotification();
  const router = useRouter();

  const [profiles, setProfiles] = useState<ExploreUser[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [userRanks, setUserRanks] = useState<Map<string, number>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<ExploreUser | null>(null);

  const swipeCardRef = useRef<SwipeCardHandle>(null);

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const data = await usersApi.getRandomUsers(PROFILES_LIMIT);
      setProfiles(data);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Failed to load explore profiles:', error);
      setProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  const loadUserRanks = useCallback(async () => {
    try {
      const ranking = await leaderboardApi.getUsersRanking(RANKED_USERS_LIMIT);
      setUserRanks(new Map(ranking.map((u: { id: string; rank: number }) => [u.id, u.rank])));
    } catch (error) {
      console.error('Failed to load user rankings:', error);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
    loadUserRanks();
  }, [loadProfiles, loadUserRanks]);

  const profile = profiles[currentIndex];
  const alreadyLiked = profile ? hasLiked(profile.id) : false;
  const matched = profile ? isMatched(profile.id) : false;
  const outOfProfiles = !loadingProfiles && (!profile || currentIndex >= profiles.length);

  function handleSwipe(direction: 'left' | 'right') {
    if (!profile) return;
    setIsSwiping(true);

    if (direction === 'right' && !alreadyLiked) {
      likeUser(profile.id).then((result) => {
        if (result.success && result.matched) {
          setMatchedProfile(profile);
          setShowMatchModal(true);
        }
        refreshNotifications();
      });
    }

    setTimeout(() => {
      setIsSwiping(false);
      setCurrentIndex((prev) => prev + 1);
      setCanUndo(true);
    }, ADVANCE_DELAY_MS);
  }

  // Nope/Like buttons must play the same off-screen exit animation as a
  // drag-released swipe, not silently jump to the next card — so we trigger
  // the card's imperative `animateExit` directly, then run the exact same
  // downstream logic (like-API call + delayed advance) as a drag swipe does.
  function handleButtonSwipe(direction: 'left' | 'right') {
    if (!profile || isSwiping) return;
    swipeCardRef.current?.animateExit(direction);
    handleSwipe(direction);
  }

  function handleUndo() {
    if (currentIndex > 0 && canUndo) {
      setCurrentIndex((prev) => prev - 1);
      setCanUndo(false);
    }
  }

  function handleOpenChat() {
    if (matchedProfile && openChat({ id: matchedProfile.id, name: matchedProfile.name, major: matchedProfile.major })) {
      router.push(`/chat/${matchedProfile.id}`);
    }
  }

  const actionsRowBg = theme === 'dark' ? colors.card : colors.background;

  const nopePress = usePressSpring(0.88);
  const undoPress = usePressSpring(0.88);
  const likePress = usePressSpring(0.88);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.cardArea}>
        {loadingProfiles ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : outOfProfiles ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Sparkles size={40} color="#000000" />
            </View>
            <Text style={styles.emptyTitle}>{t('allCaughtUpTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('allCaughtUpSubtitle')}</Text>
            <Button onPress={loadProfiles}>{t('refresh')}</Button>
          </View>
        ) : (
          <SwipeCard
            key={`${profile.id}-${currentIndex}`}
            ref={swipeCardRef}
            profile={profile}
            photos={getDisplayPhotos(profile.photoUrl, profile.photos)}
            rank={userRanks.get(profile.id)}
            onSwipe={handleSwipe}
          />
        )}

        {matched && !isSwiping && (
          <View style={styles.matchBannerWrap} pointerEvents="none">
            <View style={styles.matchBanner}>
              <Text style={styles.matchBannerText}>{t('matchBanner')}</Text>
            </View>
          </View>
        )}
      </SafeAreaView>

      <View style={[styles.actionsRow, { backgroundColor: actionsRowBg, borderTopColor: colors.border }]}>
        <AnimatedPressable
          onPress={() => handleButtonSwipe('left')}
          onPressIn={nopePress.onPressIn}
          onPressOut={nopePress.onPressOut}
          disabled={outOfProfiles || loadingProfiles || isSwiping}
          style={[
            styles.actionButton,
            styles.nopeButton,
            (outOfProfiles || loadingProfiles || isSwiping) && styles.actionButtonDisabled,
            nopePress.style,
          ]}
        >
          <X size={34} color="#FF4458" strokeWidth={2.8} />
        </AnimatedPressable>

        <AnimatedPressable
          onPress={handleUndo}
          onPressIn={undoPress.onPressIn}
          onPressOut={undoPress.onPressOut}
          disabled={currentIndex === 0 || !canUndo}
          style={[
            styles.actionButton,
            styles.undoButton,
            (currentIndex === 0 || !canUndo) && styles.actionButtonDisabled,
            undoPress.style,
          ]}
        >
          <RotateCcw size={26} color="#F5A742" strokeWidth={2.2} />
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => handleButtonSwipe('right')}
          onPressIn={likePress.onPressIn}
          onPressOut={likePress.onPressOut}
          disabled={alreadyLiked || outOfProfiles || loadingProfiles || isSwiping}
          style={[
            styles.actionButton,
            styles.likeButton,
            (alreadyLiked || outOfProfiles || loadingProfiles || isSwiping) && styles.actionButtonDisabledStrong,
            likePress.style,
          ]}
        >
          <Heart size={38} color="#4CD964" fill="#4CD964" />
        </AnimatedPressable>
      </View>

      {showMatchModal && matchedProfile && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Confetti />

            <View style={styles.modalContent}>
              <BouncingEmoji />
              <Text style={styles.modalTitle}>{t('itsAMatch')}</Text>
              <Text style={styles.modalSubtitle}>{t('likedEachOther', { name: matchedProfile.name })}</Text>

              <PhotoGallery
                photos={getDisplayPhotos(matchedProfile.photoUrl, matchedProfile.photos)}
                alt={matchedProfile.name}
                style={styles.modalPhotoGallery}
              />

              <View style={styles.modalButtonsRow}>
                <Button
                  variant="outline"
                  style={styles.modalButton}
                  onPress={() => setShowMatchModal(false)}
                >
                  {t('keepSwiping')}
                </Button>
                <Button
                  variant="primary"
                  style={styles.modalButton}
                  onPress={() => {
                    setShowMatchModal(false);
                    handleOpenChat();
                  }}
                >
                  {t('sendMessage')}
                </Button>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  cardArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  centered: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: 24,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 24,
    textAlign: 'center',
  },
  matchBannerWrap: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 20,
  },
  matchBanner: {
    borderRadius: 999,
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  matchBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  actionButtonDisabled: {
    opacity: 0.3,
  },
  actionButtonDisabledStrong: {
    opacity: 0.35,
  },
  // Scaled up from the web's 64/52/72px spec (same relative hierarchy —
  // like > nope > undo) per direct user feedback that the original sizes
  // read as small/sparse on a real device. Backgrounds are soft ~12%-alpha
  // tints of each action's own color instead of a flat neutral card color,
  // for more "life"; press feedback comes from `usePressSpring` (see JSX)
  // rather than a flat pressed-state scale.
  nopeButton: {
    width: 78,
    height: 78,
    backgroundColor: 'rgba(255,68,88,0.12)',
    shadowColor: '#FF4458',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  undoButton: {
    width: 62,
    height: 62,
    backgroundColor: 'rgba(245,167,66,0.12)',
    shadowColor: '#F5A742',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  likeButton: {
    width: 86,
    height: 86,
    backgroundColor: 'rgba(76,217,100,0.12)',
    shadowColor: '#4CD964',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 50,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 32,
    padding: 32,
    overflow: 'hidden',
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalPhotoGallery: {
    width: '100%',
    maxWidth: 220,
    aspectRatio: 3 / 4,
    borderRadius: 24,
    marginBottom: 24,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
  },
});
