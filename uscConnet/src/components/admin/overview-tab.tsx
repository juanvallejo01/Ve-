import { Activity, Heart, MessageSquare, Percent, TrendingUp, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { useTheme } from '@/context/theme-context';
import { useAdminStats } from '@/hooks/use-admin-stats';

import { StatCard } from './stat-card';

/**
 * Ported from the web app's `components/admin/overview-tab.tsx`.
 *
 * Real: the 6 `StatCard`s, sourced from `useAdminStats()` -> `GET /admin/stats`.
 * Mock: the "Recent Activity" feed below is hardcoded on the web
 * (`t("activity.newUser", { name: "Taylor Kim" })` etc, not derived from any
 * API response) — ported here verbatim as the same hardcoded strings/times,
 * not wired to a real activity feed endpoint (there isn't one).
 */
export function OverviewTab() {
  const { colors } = useTheme();
  const { t } = useTranslation('translation', { keyPrefix: 'adminOverview' });
  const { t: tTime } = useTranslation('translation', { keyPrefix: 'time' });
  const { stats, isLoading, error } = useAdminStats();

  const recentActivity = [
    { text: t('activity.newUser', { name: 'Taylor Kim' }), time: tTime('minutesAgo', { count: 5 }), type: 'user' as const },
    { text: t('activity.newMatch', { names: 'Sarah & James' }), time: tTime('minutesAgo', { count: 12 }), type: 'match' as const },
    { text: t('activity.newLikes', { count: 42 }), time: tTime('hoursAgo', { count: 1 }), type: 'like' as const },
    {
      text: t('activity.reachedLikes', { name: 'Emily Davis', count: 25 }),
      time: tTime('hoursAgo', { count: 2 }),
      type: 'action' as const,
    },
  ];

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <Text style={[styles.centerText, { color: colors.mutedForeground }]}>{t('loadingStats')}</Text>
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={styles.centerState}>
        <Text style={[styles.centerText, { color: '#EF4444' }]}>{error || t('loadFailed')}</Text>
      </View>
    );
  }

  const adminStats = [
    { key: 'totalUsers', label: t('totalUsers'), value: stats.totalUsers.toString(), icon: Users, color: '#000000' as const },
    {
      key: 'activeUsers',
      label: t('activeUsers'),
      value: stats.activeUsers.toString(),
      icon: Activity,
      color: ['#000000', '#F97316'] as const,
    },
    {
      key: 'totalLikes',
      label: t('totalLikes'),
      value: stats.totalLikes.toString(),
      icon: Heart,
      color: ['#000000', '#EF4444'] as const,
    },
    {
      key: 'totalMatches',
      label: t('totalMatches'),
      value: stats.totalMatches.toString(),
      icon: TrendingUp,
      color: ['#000000', '#404040'] as const,
    },
    {
      key: 'messages',
      label: t('messages'),
      value: stats.totalMessages.toString(),
      icon: MessageSquare,
      color: ['#F59E0B', '#000000'] as const,
    },
    {
      key: 'matchRate',
      label: t('matchRate'),
      value: `${Math.round(stats.matchRate * 100)}%`,
      icon: Percent,
      color: ['#000000', '#171717'] as const,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {adminStats.map((stat) => (
          <View key={stat.key} style={styles.gridItem}>
            <StatCard label={stat.label} value={stat.value} icon={stat.icon} color={stat.color} />
          </View>
        ))}
      </View>

      <Card style={[styles.activityCard, { borderColor: colors.border, borderWidth: 1 }]}>
        <Text style={[styles.activityTitle, { color: colors.foreground }]}>{t('recentActivity')}</Text>
        <View style={styles.activityList}>
          {recentActivity.map((item, i) => (
            <View key={i} style={styles.activityRow}>
              <View style={[styles.activityDot, { backgroundColor: item.type === 'action' ? '#C7C7CC' : '#000000' }]} />
              <Text style={[styles.activityText, { color: colors.foreground }]}>{item.text}</Text>
              <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>{item.time}</Text>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  centerState: {
    height: 256,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
  },
  activityCard: {
    padding: 16,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  activityList: {
    gap: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  activityText: {
    flex: 1,
    fontSize: 12,
  },
  activityTime: {
    fontSize: 10,
    flexShrink: 0,
  },
});
