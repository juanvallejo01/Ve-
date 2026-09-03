import { useRouter } from 'expo-router';
import { Heart, MessageCircle } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikeReviewModal } from '@/components/explore/like-review-modal';
import { MatchCelebrationOverlay } from '@/components/shared/match-celebration-fx';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { useChat } from '@/context/chat-context';
import { useMatch } from '@/context/match-context';
import { useNotification } from '@/context/notification-context';
import { useTheme } from '@/context/theme-context';
import { messagesApi } from '@/lib/api-client';
import { formatIcuPlural } from '@/lib/icu-plural';
import { getDisplayPhotos } from '@/lib/photos';
import { formatRelativeTime } from '@/lib/relative-time';
import type { Conversation, Notification } from '@/types';

/** "New Likes" ring gradient — a one-off override of Avatar's default monochrome ring, matching the web's `bg-gradient-to-br from-[#FF4458] to-[#FF9F0A]`. */
const NEW_LIKE_RING: [string, string] = ['#FF4458', '#FF9F0A'];

function PendingLikeCircle({ notification, onOpen }: { notification: Notification; onOpen: () => void }) {
  const { colors } = useTheme();
  if (!notification.fromUser) return null;
  const firstName = notification.fromUser.name.split(' ')[0];

  return (
    <Pressable onPress={onOpen} style={styles.pendingCircle}>
      <Avatar
        uri={notification.fromUser.photoUrl}
        name={notification.fromUser.name}
        size="lg"
        gradientRing
        ringColors={NEW_LIKE_RING}
      />
      <Text style={[styles.pendingName, { color: colors.foreground }]} numberOfLines={1}>
        {firstName}
      </Text>
    </Pressable>
  );
}

function ConversationRow({ entry, onOpen }: { entry: Conversation; onOpen: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation('translation', { keyPrefix: 'matches' });
  const { t: tTime } = useTranslation('translation', { keyPrefix: 'time' });
  const timestamp = formatRelativeTime(entry.lastMessage?.createdAt ?? entry.matchedAt, tTime);

  return (
    <Pressable onPress={onOpen}>
      <Card style={[styles.row, { borderColor: colors.border, borderWidth: 1 }]}>
        <View style={styles.rowInner}>
          <Avatar uri={entry.matchedUser.photoUrl} name={entry.matchedUser.name} size="lg" gradientRing />

          <View style={styles.rowContent}>
            <View style={styles.rowTop}>
              <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={1}>
                {entry.matchedUser.name}
              </Text>
              <Text style={[styles.rowTime, { color: colors.mutedForeground }]}>{timestamp}</Text>
            </View>

            <Text style={[styles.rowMajor, { color: colors.mutedForeground }]} numberOfLines={1}>
              {entry.matchedUser.major}
            </Text>

            {entry.lastMessage ? (
              <Text style={[styles.rowLastMessage, { color: colors.mutedForeground }]} numberOfLines={1}>
                {entry.lastMessage.content}
              </Text>
            ) : (
              <View style={styles.startChattingRow}>
                <MessageCircle size={14} color={colors.foreground} />
                <Text style={[styles.startChattingText, { color: colors.foreground }]}>
                  {t('startChatting')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

/**
 * Ported from the web app's `screens/Matches.tsx`. See `LikeReviewModal` for
 * the full-screen incoming-like review flow, and
 * `components/shared/match-celebration-fx.tsx` for the "It's a Match!"
 * overlay shared with the Notifications screen.
 */
export default function MatchesScreen() {
  const { colors, fonts } = useTheme();
  const { t } = useTranslation('translation', { keyPrefix: 'matches' });
  const router = useRouter();
  const { openChat } = useChat();
  const { likeUser, isMatched } = useMatch();
  const { notifications, markAsRead, refresh: refreshNotifications } = useNotification();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<Notification | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [justMatchedWith, setJustMatchedWith] = useState<Notification['fromUser'] | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data: Conversation[] = await messagesApi.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    refreshNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadConversations]);

  const pendingLikes = notifications.filter(
    (n) => n.type === 'LIKE_RECEIVED' && !n.read && n.fromUser && !isMatched(n.fromUser.id)
  );

  function handleOpenChat(entry: Conversation) {
    const opened = openChat({
      id: entry.matchedUser.id,
      name: entry.matchedUser.name,
      major: entry.matchedUser.major,
      photoUrl: entry.matchedUser.photoUrl,
    });
    if (opened) {
      router.push(`/chat/${entry.matchedUser.id}`);
    }
  }

  async function handleLikeBack() {
    if (!reviewing?.fromUser) return;
    setReviewSubmitting(true);
    const result = await likeUser(reviewing.fromUser.id);
    setReviewSubmitting(false);
    markAsRead(reviewing.id);
    const matchedFromUser = reviewing.fromUser;
    setReviewing(null);
    if (result.success && result.matched) {
      setJustMatchedWith(matchedFromUser);
      loadConversations();
    }
  }

  function handleRejectReview() {
    if (!reviewing) return;
    markAsRead(reviewing.id);
    setReviewing(null);
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: fonts.sans.extraBold }]}>
          {t('title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {loading ? t('loading') : formatIcuPlural(t('matchCount'), conversations.length)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {pendingLikes.length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={[styles.pendingLabel, { color: colors.mutedForeground }]}>{t('newLikes')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pendingRow}>
              {pendingLikes.map((n) => (
                <PendingLikeCircle key={n.id} notification={n} onOpen={() => setReviewing(n)} />
              ))}
            </ScrollView>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.foreground} />
          </View>
        ) : conversations.length === 0 && pendingLikes.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.secondary }]}>
              <Heart size={48} color={colors.foreground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('noMatchesYet')}</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{t('startExploring')}</Text>
          </View>
        ) : (
          <View style={styles.conversationsList}>
            {conversations.map((entry) => (
              <ConversationRow key={entry.matchId} entry={entry} onOpen={() => handleOpenChat(entry)} />
            ))}
          </View>
        )}
      </ScrollView>

      {reviewing?.fromUser && (
        <LikeReviewModal
          user={reviewing.fromUser}
          isSubmitting={reviewSubmitting}
          onLikeBack={handleLikeBack}
          onReject={handleRejectReview}
          onClose={() => setReviewing(null)}
        />
      )}

      {justMatchedWith && (
        <MatchCelebrationOverlay
          title={t('itsAMatch')}
          subtitle={t('likedEachOther', { name: justMatchedWith.name })}
          ctaLabel={t('nice')}
          onDismiss={() => setJustMatchedWith(null)}
          photo={{
            photos: getDisplayPhotos(justMatchedWith.photoUrl, justMatchedWith.photos),
            alt: justMatchedWith.name,
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  pendingSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pendingLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  pendingRow: {
    gap: 12,
    paddingBottom: 4,
  },
  pendingCircle: {
    alignItems: 'center',
    gap: 6,
    width: 68,
  },
  pendingName: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 68,
  },
  loadingWrap: {
    paddingVertical: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyIconCircle: {
    borderRadius: 999,
    padding: 24,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
  },
  conversationsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  row: {
    padding: 16,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  rowName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  rowTime: {
    fontSize: 11,
  },
  rowMajor: {
    fontSize: 12,
    marginBottom: 6,
  },
  rowLastMessage: {
    fontSize: 14,
  },
  startChattingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  startChattingText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
