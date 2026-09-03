import { useRouter } from 'expo-router';
import { Bell, Heart, MessageCircle } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LikeReviewModal } from '@/components/explore/like-review-modal';
import { MatchCelebrationOverlay } from '@/components/shared/match-celebration-fx';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useChat } from '@/context/chat-context';
import { useMatch } from '@/context/match-context';
import { useNotification } from '@/context/notification-context';
import { useTheme } from '@/context/theme-context';
import { formatRelativeTime } from '@/lib/relative-time';
import type { Notification } from '@/types';

function NotificationCard({
  notification,
  onStartChat,
  onReviewProfile,
}: {
  notification: Notification;
  onStartChat: () => void;
  onReviewProfile: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation('translation', { keyPrefix: 'notificationsPage' });
  const { t: tTime } = useTranslation('translation', { keyPrefix: 'time' });
  const isMatch = notification.type === 'MATCH';
  const name = notification.fromUser?.name ?? t('someone');

  return (
    <Card
      style={[
        styles.card,
        { borderColor: colors.border, borderWidth: 1 },
        !notification.read && styles.cardUnread,
      ]}
    >
      <View style={styles.cardInner}>
        <View style={styles.avatarWrap}>
          {/* Ported verbatim from the web, which renders `<UserAvatar alt={...} />`
              with no `src` here — the notification list intentionally shows the
              fallback initial rather than the sender's photo. */}
          <Avatar name={notification.fromUser?.name} size="lg" />
          {!notification.read && <View style={[styles.unreadDot, { borderColor: colors.card }]} />}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {isMatch ? (
                t('matchedWith', { name })
              ) : (
                <>
                  <Text style={styles.cardTitleBold}>{name}</Text> {t('likedYourProfile')}
                </>
              )}
            </Text>
            <Text style={[styles.cardTime, { color: colors.mutedForeground }]}>
              {formatRelativeTime(notification.createdAt, tTime)}
            </Text>
          </View>

          <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
            {isMatch ? t('matchSubtitle') : t('likeSubtitle')}
          </Text>

          <Button
            variant="primary"
            size="sm"
            fullWidth
            disabled={!notification.fromUser}
            onPress={isMatch ? onStartChat : onReviewProfile}
            icon={
              isMatch ? (
                <MessageCircle size={16} color={colors.primaryForeground} />
              ) : (
                <Heart size={16} color={colors.primaryForeground} fill={colors.primaryForeground} />
              )
            }
          >
            {isMatch ? t('startChat') : t('reviewProfile')}
          </Button>
        </View>
      </View>
    </Card>
  );
}

/**
 * Ported from the web app's `screens/Notifications.tsx`. Pushed as a
 * top-level stacked route (see `app/_layout.tsx`) rather than nested under
 * `(tabs)`, reached via the bell icon added to the Feed header (Phase 4 had
 * no notifications entry point yet).
 */
export default function NotificationsScreen() {
  const { colors, fonts } = useTheme();
  const { t } = useTranslation('translation', { keyPrefix: 'notificationsPage' });
  const router = useRouter();
  const { notifications, markAsRead, markAllAsRead } = useNotification();
  const { openChat } = useChat();
  const { likeUser } = useMatch();

  const [reviewing, setReviewing] = useState<Notification | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [justMatchedWith, setJustMatchedWith] = useState<string | null>(null);

  const hasUnread = notifications.some((n) => !n.read);

  function handleStartChat(notification: Notification) {
    if (!notification.fromUser) return;
    markAsRead(notification.id);
    const opened = openChat({
      id: notification.fromUser.id,
      name: notification.fromUser.name,
      major: notification.fromUser.major,
    });
    if (opened) {
      router.push(`/chat/${notification.fromUser.id}`);
    }
  }

  async function handleLikeBack() {
    if (!reviewing?.fromUser) return;
    setSubmitting(true);
    const result = await likeUser(reviewing.fromUser.id);
    setSubmitting(false);
    markAsRead(reviewing.id);
    if (result.success && result.matched) {
      setJustMatchedWith(reviewing.fromUser.name);
    }
    setReviewing(null);
  }

  function handleReject() {
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
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {hasUnread && (
          <View style={styles.markAllRow}>
            <Pressable onPress={markAllAsRead} hitSlop={8}>
              <Text style={[styles.markAllText, { color: colors.foreground }]}>{t('markAllAsRead')}</Text>
            </Pressable>
          </View>
        )}

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.secondary }]}>
              <Bell size={40} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>{t('noNotificationsYet')}</Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>{t('hint')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onStartChat={() => handleStartChat(notification)}
                onReviewProfile={() => {
                  markAsRead(notification.id);
                  setReviewing(notification);
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {reviewing?.fromUser && (
        <LikeReviewModal
          user={reviewing.fromUser}
          isSubmitting={submitting}
          onLikeBack={handleLikeBack}
          onReject={handleReject}
          onClose={() => setReviewing(null)}
        />
      )}

      {justMatchedWith && (
        <MatchCelebrationOverlay
          title={t('itsAMatch')}
          subtitle={t('likedEachOther', { name: justMatchedWith })}
          ctaLabel={t('nice')}
          onDismiss={() => setJustMatchedWith(null)}
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
  scrollContent: {
    paddingBottom: 32,
  },
  markAllRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  card: {
    padding: 20,
  },
  cardUnread: {
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.3)',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatarWrap: {
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#000000',
    borderWidth: 2,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  cardTitleBold: {
    fontWeight: '700',
  },
  cardTime: {
    fontSize: 11,
  },
  cardSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 64,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 14,
  },
  emptyHint: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
