import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { ArrowLeft, Clock, Lock, Send } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { ChatBubble } from '@/components/chat/chat-bubble';
import { useChat, type ChatMessage } from '@/context/chat-context';
import { useTheme } from '@/context/theme-context';
import { usersApi } from '@/lib/api-client';

/**
 * Ported from the web app's `screens/Chat.tsx`. The web version renders as
 * an `absolute inset-0 z-50` overlay pushed over whatever screen is behind
 * it; here it's a real stacked route (`app/chat/[userId].tsx`) so back
 * navigation is a normal `router.back()` instead of an internal
 * `closeChat()`-only state transition.
 *
 * `useChat().openChat()` takes a full `ChatUser` object, not just an id — the
 * screens that navigate here (Matches, Notifications, Explore's match modal)
 * already call `openChat(...)` with the full user right before pushing this
 * route, so `activeUser` is normally already correct on mount. But this
 * route can also be reached directly (deep link, or a stale `activeUser`
 * left over from a previous chat after a fast back/forward), so on mount we
 * double-check `activeUserId` against the route's `userId` param and, if
 * they don't match, fetch the user via `usersApi.getUser` and open the chat
 * ourselves before rendering.
 */
export default function ChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation('translation', { keyPrefix: 'chat' });
  const {
    activeUser,
    activeUserId,
    sendMessage,
    closeChat,
    messages,
    canChatWith,
    loadingMessages,
    sending,
    ephemeralActive,
    ephemeralMine,
    togglingEphemeral,
    toggleEphemeral,
    otherIsTyping,
    notifyTyping,
    reportScreenshot,
    openChat,
  } = useChat();

  const [input, setInput] = useState('');
  const [resolvingUser, setResolvingUser] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const canSend = activeUserId ? canChatWith(activeUserId) : false;

  // Make sure the right chat is open even if we weren't the ones who called
  // `openChat` right before navigating here (see file-level note above).
  useEffect(() => {
    if (!userId || activeUserId === userId) return;
    let cancelled = false;
    setResolvingUser(true);
    usersApi
      .getUser(userId)
      .then((user) => {
        if (cancelled) return;
        openChat({ id: user.id, name: user.name, major: user.major, photoUrl: user.photoUrl });
      })
      .catch((error) => {
        console.error('Failed to load chat user:', error);
      })
      .finally(() => {
        if (!cancelled) setResolvingUser(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, activeUserId, openChat]);

  // Reset chat state when this screen goes away, regardless of whether the
  // user left via the in-header back button or a native swipe/back gesture —
  // otherwise the context's polling effect (tied to `activeUser`) would keep
  // running against a chat the user already navigated away from.
  useEffect(() => {
    return () => {
      closeChat();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Best-effort screenshot detection. Unlike the web's `keydown` heuristic
  // (which only catches OS shortcuts that reach the page as a key event),
  // `expo-screen-capture` gets a real OS-level screenshot notification on
  // iOS. On Android this requires `READ_EXTERNAL_STORAGE` pre-Android 13 /
  // `READ_MEDIA_IMAGES` on Android 13 / nothing post-13 — we request it
  // once on mount so the listener has a chance to fire on older Android
  // versions, but per the package's own docs this is still less reliable
  // there than on iOS (permission can be denied, and some OEM ROMs restrict
  // screenshot broadcasts). This is an accepted fidelity trade-off, not
  // something to build more infrastructure around.
  useEffect(() => {
    ScreenCapture.requestPermissionsAsync().catch(() => {
      // Ignore — worst case, screenshot detection silently doesn't fire on
      // this device, same "best-effort" ceiling the web version already has.
    });
  }, []);

  ScreenCapture.useScreenshotListener(() => {
    if (activeUserId) {
      reportScreenshot();
    }
  });

  function handleBack() {
    closeChat();
    router.back();
  }

  function handleViewProfile() {
    if (activeUserId) {
      router.push(`/user/${activeUserId}`);
    }
  }

  async function handleSend() {
    if (!input.trim() || !canSend || sending) return;
    const text = input.trim();
    setInput('');
    const success = await sendMessage(text);
    if (!success) {
      setInput(text);
    }
  }

  if (!activeUser) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.loadingFill}>
          {resolvingUser ? <ActivityIndicator size="large" color={colors.foreground} /> : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8} accessibilityLabel={t('goBack')}>
            <ArrowLeft size={20} color={colors.foreground} />
          </Pressable>

          <Pressable onPress={handleViewProfile} accessibilityLabel={t('viewProfile')}>
            <Avatar uri={activeUser.photoUrl} name={activeUser.name} size="sm" />
          </Pressable>

          <Pressable onPress={handleViewProfile} style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>
              {activeUser.name}
            </Text>
            <Text
              style={[
                styles.headerStatus,
                { color: otherIsTyping ? colors.foreground : colors.mutedForeground },
                otherIsTyping && styles.headerStatusTyping,
              ]}
            >
              {otherIsTyping ? t('typing') : canSend ? t('activeNow') : t('notMatchedYet')}
            </Text>
          </Pressable>

          {canSend && (
            <Pressable
              onPress={toggleEphemeral}
              disabled={togglingEphemeral}
              accessibilityLabel={t('ephemeralToggle')}
              style={[styles.ephemeralButton, ephemeralActive && styles.ephemeralButtonActive]}
            >
              <Clock size={17} color={ephemeralActive ? '#FFFFFF' : colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {ephemeralActive && (
          <View style={styles.ephemeralBannerWrap}>
            <View style={[styles.ephemeralBanner, { backgroundColor: colors.secondary }]}>
              <Clock size={12} color={colors.mutedForeground} />
              <Text style={[styles.ephemeralBannerText, { color: colors.mutedForeground }]}>
                {ephemeralMine ? t('ephemeralActiveMine') : t('ephemeralActiveOther')}
              </Text>
            </View>
          </View>
        )}

        {!canSend ? (
          <View style={styles.centeredFill}>
            <View style={[styles.lockCircle, { backgroundColor: colors.secondary }]}>
              <Lock size={32} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('matchRequiredTitle')}</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              {t('matchRequiredBody', { name: activeUser.name })}
            </Text>
          </View>
        ) : loadingMessages ? (
          <View style={styles.centeredFill}>
            <ActivityIndicator size="large" color={colors.foreground} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centeredFill}>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              {t('youMatched', { name: activeUser.name })}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ChatBubble message={item} otherUserName={activeUser.name} />}
            contentContainerStyle={styles.messagesList}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          />
        )}

        <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {!canSend && (
            <View style={[styles.matchBanner, { backgroundColor: 'rgba(255,159,10,0.08)', borderColor: 'rgba(255,159,10,0.2)' }]}>
              <Text style={styles.matchBannerText}>{t('matchRequiredBanner')}</Text>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={(text) => {
                setInput(text);
                if (canSend && text) notifyTyping();
              }}
              placeholder={canSend ? t('messagePlaceholder') : t('matchRequiredPlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              editable={canSend}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  color: canSend ? colors.foreground : colors.mutedForeground,
                },
              ]}
              multiline
              onSubmitEditing={canSend ? handleSend : undefined}
            />
            <Pressable
              onPress={handleSend}
              disabled={!input.trim() || !canSend || sending}
              accessibilityLabel={t('sendMessage')}
              style={[
                styles.sendButton,
                { backgroundColor: colors.primary },
                (!input.trim() || !canSend || sending) && styles.sendButtonDisabled,
              ]}
            >
              <Send size={18} color={colors.primaryForeground} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerStatus: {
    fontSize: 12,
    marginTop: 1,
  },
  headerStatusTyping: {
    fontWeight: '600',
  },
  ephemeralButton: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  ephemeralButtonActive: {
    backgroundColor: '#000000',
  },
  ephemeralBannerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  ephemeralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  ephemeralBannerText: {
    fontSize: 12,
  },
  centeredFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  lockCircle: {
    borderRadius: 999,
    padding: 16,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 260,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  matchBanner: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  matchBannerText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#92400E',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 14,
    maxHeight: 120,
  },
  sendButton: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
