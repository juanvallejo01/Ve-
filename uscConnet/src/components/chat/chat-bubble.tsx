import { Camera } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/theme-context';
import type { ChatMessage } from '@/context/chat-context';

/**
 * Ported from the web app's `components/chat/chat-bubble.tsx`. Sent bubbles
 * use the app's black/white `primary` token with a sharp bottom-right
 * corner; received bubbles use the `secondary` (light-gray/dark-gray) token
 * with a sharp bottom-left corner — same asymmetric-corner "tail" look as
 * the web's `rounded-br-lg` / `rounded-bl-lg`. `SCREENSHOT_ALERT` messages
 * render as a centered pill instead of a bubble, same as the web.
 */
export function ChatBubble({ message, otherUserName }: { message: ChatMessage; otherUserName: string }) {
  const { colors } = useTheme();
  const { t } = useTranslation('translation', { keyPrefix: 'chat' });

  if (message.type === 'SCREENSHOT_ALERT') {
    return (
      <View style={styles.screenshotRow}>
        <View style={[styles.screenshotPill, { backgroundColor: colors.secondary }]}>
          <Camera size={12} color={colors.mutedForeground} />
          <Text style={[styles.screenshotText, { color: colors.mutedForeground }]}>
            {message.sent ? t('youScreenshotted') : t('theyScreenshotted', { name: otherUserName })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, message.sent ? styles.rowSent : styles.rowReceived]}>
      <View style={styles.bubbleWrap}>
        <View
          style={[
            styles.bubble,
            message.sent
              ? [styles.bubbleSent, { backgroundColor: colors.primary }]
              : [styles.bubbleReceived, { backgroundColor: colors.secondary }],
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              { color: message.sent ? colors.primaryForeground : colors.foreground },
            ]}
          >
            {message.text}
          </Text>
        </View>
        <Text
          style={[
            styles.time,
            { color: colors.mutedForeground },
            message.sent ? styles.timeSent : styles.timeReceived,
          ]}
        >
          {message.time}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  rowSent: {
    justifyContent: 'flex-end',
  },
  rowReceived: {
    justifyContent: 'flex-start',
  },
  bubbleWrap: {
    maxWidth: '75%',
    gap: 4,
  },
  bubble: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleSent: {
    borderBottomRightRadius: 6,
  },
  bubbleReceived: {
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  time: {
    fontSize: 10,
    paddingHorizontal: 4,
  },
  timeSent: {
    textAlign: 'right',
  },
  timeReceived: {
    textAlign: 'left',
  },
  screenshotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 4,
  },
  screenshotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  screenshotText: {
    fontSize: 11,
  },
});
