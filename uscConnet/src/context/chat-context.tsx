import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';

import { messagesApi, matchesApi } from '@/lib/api-client';

import { useAuth } from './auth-context';
import { useMatch } from './match-context';

const POLL_INTERVAL_MS = 2500;
const TYPING_IDLE_MS = 2000;

// TODO: pause/resume polling based on AppState (foreground/background) to
// avoid burning battery/network while the app isn't visible. Not required
// for functional parity in this phase — the web version has no equivalent
// concept, and the poll intervals are harmless while backgrounded on RN too
// (though wasteful). Revisit as an optimization pass.

export interface ChatMessage {
  id: string;
  text: string;
  sent: boolean;
  time: string;
  type: 'TEXT' | 'SCREENSHOT_ALERT';
}

export interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  major: string;
  photoUrl?: string | null;
}

interface ChatState {
  activeUser: ChatUser | null;
  activeUserId: string | null;
  messages: ChatMessage[];
  sending: boolean;
  loadingMessages: boolean;
  ephemeralActive: boolean;
  ephemeralMine: boolean;
  togglingEphemeral: boolean;
  otherIsTyping: boolean;
  openChat: (user: ChatUser) => boolean;
  closeChat: () => void;
  sendMessage: (text: string) => Promise<boolean>;
  canChatWith: (userId: string) => boolean;
  toggleEphemeral: () => Promise<void>;
  notifyTyping: () => void;
  reportScreenshot: () => Promise<void>;
}

const ChatContext = createContext<ChatState | null>(null);

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { canChat } = useMatch();
  const [activeUser, setActiveUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [ephemeralActive, setEphemeralActive] = useState(false);
  const [ephemeralMine, setEphemeralMine] = useState(false);
  const [togglingEphemeral, setTogglingEphemeral] = useState(false);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = useRef(false);

  const canChatWith = useCallback((userId: string) => canChat(userId), [canChat]);

  const loadMessages = useCallback(
    async (otherUserId: string, silent = false) => {
      if (!user) return;
      if (!silent) setLoadingMessages(true);
      try {
        const data = await messagesApi.getConversation(otherUserId);
        setMessages(
          data.map((m: { id: string; content: string; senderId: string; createdAt: string; type: 'TEXT' | 'SCREENSHOT_ALERT' }) => ({
            id: m.id,
            text: m.content,
            sent: m.senderId === user.id,
            time: formatTime(m.createdAt),
            type: m.type,
          }))
        );
      } catch (error) {
        console.error('Failed to load conversation:', error);
        if (!silent) setMessages([]);
      } finally {
        if (!silent) setLoadingMessages(false);
      }
    },
    [user]
  );

  const loadEphemeralStatus = useCallback(async (otherUserId: string) => {
    try {
      const status = await matchesApi.getEphemeral(otherUserId);
      setEphemeralActive(status.active);
      setEphemeralMine(status.mine);
    } catch (error) {
      console.error('Failed to load ephemeral status:', error);
    }
  }, []);

  const pollTyping = useCallback(async (otherUserId: string) => {
    try {
      const status = await messagesApi.getTypingStatus(otherUserId);
      setOtherIsTyping(status.typing);
    } catch (error) {
      // Silent — typing status is best-effort, not worth surfacing errors for.
    }
  }, []);

  // Live-ish updates while a chat is open: poll for new messages and the other
  // person's typing status. There's no websocket layer in this app, so a short
  // poll is the simplest way to approximate real-time without adding one.
  useEffect(() => {
    if (!activeUser) return;
    const otherId = activeUser.id;
    const interval = setInterval(() => {
      loadMessages(otherId, true);
      pollTyping(otherId);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeUser, loadMessages, pollTyping]);

  const openChat = useCallback(
    (chatUser: ChatUser): boolean => {
      if (!canChatWith(chatUser.id)) {
        console.warn('Cannot chat - users are not matched');
        return false;
      }
      setActiveUser(chatUser);
      setMessages([]);
      setOtherIsTyping(false);
      loadMessages(chatUser.id);
      loadEphemeralStatus(chatUser.id);
      return true;
    },
    [canChatWith, loadMessages, loadEphemeralStatus]
  );

  const closeChat = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    typingActiveRef.current = false;
    setActiveUser(null);
    setMessages([]);
    setEphemeralActive(false);
    setEphemeralMine(false);
    setOtherIsTyping(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      if (!text.trim() || !activeUser || !canChatWith(activeUser.id)) return false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      typingActiveRef.current = false;
      setSending(true);
      try {
        const message = await messagesApi.sendMessage({ receiverId: activeUser.id, content: text.trim() });
        setMessages((prev) => [
          ...prev,
          { id: message.id, text: message.content, sent: true, time: formatTime(message.createdAt), type: 'TEXT' },
        ]);
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        return false;
      } finally {
        setSending(false);
      }
    },
    [activeUser, canChatWith]
  );

  const notifyTyping = useCallback(() => {
    if (!activeUser) return;
    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      messagesApi.setTyping(activeUser.id, true).catch(() => {});
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingActiveRef.current = false;
      if (activeUser) messagesApi.setTyping(activeUser.id, false).catch(() => {});
    }, TYPING_IDLE_MS);
  }, [activeUser]);

  const reportScreenshot = useCallback(async () => {
    if (!activeUser) return;
    try {
      const message = await messagesApi.reportScreenshot(activeUser.id);
      setMessages((prev) => [
        ...prev,
        { id: message.id, text: '', sent: true, time: formatTime(message.createdAt), type: 'SCREENSHOT_ALERT' },
      ]);
    } catch (error) {
      console.error('Failed to report screenshot:', error);
    }
  }, [activeUser]);

  const toggleEphemeral = useCallback(async () => {
    if (!activeUser || togglingEphemeral) return;
    setTogglingEphemeral(true);
    try {
      const status = await matchesApi.setEphemeral(activeUser.id, !ephemeralMine);
      setEphemeralActive(status.active);
      setEphemeralMine(status.mine);
    } catch (error) {
      console.error('Failed to toggle ephemeral mode:', error);
    } finally {
      setTogglingEphemeral(false);
    }
  }, [activeUser, ephemeralMine, togglingEphemeral]);

  return (
    <ChatContext.Provider
      value={{
        activeUser,
        activeUserId: activeUser?.id ?? null,
        messages,
        sending,
        loadingMessages,
        ephemeralActive,
        ephemeralMine,
        togglingEphemeral,
        otherIsTyping,
        openChat,
        closeChat,
        sendMessage,
        canChatWith,
        toggleEphemeral,
        notifyTyping,
        reportScreenshot,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
