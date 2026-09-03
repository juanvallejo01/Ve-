import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

import { notificationsApi, messagesApi } from '@/lib/api-client';
import type { Notification } from '@/types';

import { useAuth } from './auth-context';

// TODO: pause/resume the 15s poll based on AppState (foreground/background)
// as a battery/network optimization. Not required for functional parity —
// see the same note in chat-context.tsx.

interface NotificationState {
  notifications: Notification[];
  // Total combinado para el badge: notificaciones sin leer (likes pendientes +
  // matches que aún no se vieron/respondieron) + mensajes pendientes por leer.
  // Un match deja de contar en cuanto el usuario abre esa conversación (ya sea
  // que lea o responda) — eso pasa en el backend, en ChatService.getConversation.
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationState | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // Se mantienen separados para que markAsRead/markAllAsRead (que solo tocan
  // notificaciones) nunca pisen el conteo de mensajes pendientes.
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const [messagesUnread, setMessagesUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const [list, unread, unreadMessages] = await Promise.all([
        notificationsApi.getNotifications(),
        notificationsApi.getUnreadCount(),
        messagesApi.getUnreadCount(),
      ]);
      setNotifications(list);
      setNotificationsUnread(unread.count);
      setMessagesUnread(unreadMessages.count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      refresh();
      // Light polling so likes/matches/messages from other users show up without a manual refresh
      const interval = setInterval(refresh, 15000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setNotificationsUnread(0);
      setMessagesUnread(0);
    }
  }, [isLoggedIn, refresh]);

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setNotificationsUnread((prev) => Math.max(0, prev - 1));
    try {
      await notificationsApi.markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setNotificationsUnread(0);
    try {
      await notificationsApi.markAllRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount: notificationsUnread + messagesUnread,
        loading,
        refresh,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}
