import { Ban, CheckCircle, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { useTheme } from '@/context/theme-context';
import { ADMIN_USERS } from '@/constants/admin-mock-data';

import { StatusBadge } from './stat-card';

/**
 * Ported from the web app's `components/admin/users-tab.tsx`.
 *
 * 100% mock, ported 1:1: seeded from the `ADMIN_USERS` mock constant, and
 * verify/suspend/delete only mutate local `useState` — there is no API call
 * anywhere in this file, matching the web source exactly. `adminApi.getUsers`
 * / `adminApi.deleteUser` exist in the client but are deliberately NOT wired
 * up here — the web screen never calls them either.
 */
export function UsersTab() {
  const { colors } = useTheme();
  const { t } = useTranslation('translation', { keyPrefix: 'adminUsers' });
  const [userList, setUserList] = useState(ADMIN_USERS);

  function handleVerify(id: number) {
    setUserList((prev) => prev.map((u) => (u.id === id ? { ...u, verified: true } : u)));
  }

  function handleSuspend(id: number) {
    setUserList((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'suspended' as const } : u)));
  }

  function handleDelete(id: number) {
    setUserList((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t('allUsers')}</Text>
        <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>
          {t('userCount', { count: userList.length })}
        </Text>
      </View>

      {userList.map((user) => (
        <Card key={user.id} style={[styles.userCard, { borderColor: colors.border, borderWidth: 1 }]}>
          <View style={styles.userTopRow}>
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
                  {user.name}
                </Text>
                {user.verified && <ShieldCheck size={14} color="#000000" />}
              </View>
              <Text style={[styles.userMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                {user.email}
              </Text>
              <Text style={[styles.userMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                {user.major}
              </Text>
            </View>
            <StatusBadge status={user.status} />
          </View>

          <View style={styles.actionsRow}>
            {!user.verified && (
              <Pressable
                onPress={() => handleVerify(user.id)}
                style={[styles.actionButton, { backgroundColor: 'rgba(0,0,0,0.08)' }]}
              >
                <CheckCircle size={12} color="#000000" />
                <Text style={[styles.actionText, { color: '#000000' }]}>{t('verify')}</Text>
              </Pressable>
            )}
            {user.status !== 'suspended' && user.status !== 'banned' && (
              <Pressable
                onPress={() => handleSuspend(user.id)}
                style={[styles.actionButton, { backgroundColor: '#FEF3C7' }]}
              >
                <Ban size={12} color="#B45309" />
                <Text style={[styles.actionText, { color: '#B45309' }]}>{t('suspend')}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => handleDelete(user.id)}
              style={[styles.actionButton, { backgroundColor: '#FEE2E2' }]}
            >
              <Trash2 size={12} color="#B91C1C" />
              <Text style={[styles.actionText, { color: '#B91C1C' }]}>{t('delete')}</Text>
            </Pressable>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerCount: {
    fontSize: 12,
  },
  userCard: {
    padding: 16,
  },
  userTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  userMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
