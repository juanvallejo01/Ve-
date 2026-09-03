import {
  AlertTriangle,
  Ban,
  CalendarX,
  Check,
  Clock,
  Eye,
  Flag,
  ShieldCheck,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { useTheme } from '@/context/theme-context';
import { adminApi } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/relative-time';
import { REPORTED_POSTS } from '@/constants/admin-mock-data';
import type { Report, ReportAction } from '@/types';

/**
 * Ported from the web app's `components/admin/moderation-tab.tsx`.
 *
 * MIXED tab, ported with the exact same split as the web source:
 * - "Reported users" section is REAL: `adminApi.getReports('PENDING')` on
 *   mount, `adminApi.resolveReport(id, action)` for dismiss/resolve/
 *   suspend-1-week/suspend-1-month/ban. Web used `confirm()` for the three
 *   destructive actions — replaced here with `Alert.alert`, same pattern as
 *   the unmatch/block confirmations in `app/user/[id].tsx`.
 * - "Reported content" (posts) section is MOCK: seeded from the
 *   `REPORTED_POSTS` constant, remove/warn/review are local-only (`review`
 *   and `warnUser` have no handler on the web either — the buttons are
 *   inert there, ported as inert here too).
 */
export function ModerationTab() {
  const { colors } = useTheme();
  const { t } = useTranslation('translation', { keyPrefix: 'adminModeration' });
  const { t: tReasons } = useTranslation('translation', { keyPrefix: 'adminModeration.reasons' });
  const { t: tReports } = useTranslation('translation', { keyPrefix: 'adminReports' });
  const { t: tReportReasons } = useTranslation('translation', { keyPrefix: 'adminReports.reasons' });
  const { t: tTime } = useTranslation('translation', { keyPrefix: 'time' });
  const { t: tCancel } = useTranslation('translation', { keyPrefix: 'profile.settings' });

  const [posts, setPosts] = useState(REPORTED_POSTS);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoadingReports(true);
      const data = await adminApi.getReports('PENDING');
      setReports(data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoadingReports(false);
    }
  }

  async function resolve(report: Report, action: ReportAction) {
    try {
      await adminApi.resolveReport(report.id, action);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (error) {
      console.error('Failed to resolve report:', error);
    }
  }

  function handleResolve(report: Report, action: ReportAction) {
    const needsConfirm = action === 'suspend_1w' || action === 'suspend_1m' || action === 'ban';
    if (!needsConfirm) {
      resolve(report, action);
      return;
    }
    Alert.alert(
      tReports(`actions.${action}`),
      tReports('confirmAction', { action: tReports(`actions.${action}`), name: report.reported?.name ?? '?' }),
      [
        { text: tCancel('cancel'), style: 'cancel' },
        { text: tReports(`actions.${action}`), style: 'destructive', onPress: () => resolve(report, action) },
      ]
    );
  }

  function handleRemovePost(id: number) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <View style={styles.container}>
      {/* ── Reported users (real data) ── */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{tReports('title')}</Text>
        {!loadingReports && (
          <View style={styles.pendingPill}>
            <Text style={styles.pendingPillText}>{tReports('pendingCount', { count: reports.length })}</Text>
          </View>
        )}
      </View>

      {loadingReports ? (
        <View style={styles.spinnerWrap}>
          <ActivityIndicator size="small" color={colors.foreground} />
        </View>
      ) : reports.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ShieldCheck size={32} color={colors.mutedForeground} style={styles.emptyIcon} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{tReports('allClear')}</Text>
        </View>
      ) : (
        reports.map((report) => (
          <Card key={report.id} style={[styles.reportCard, { borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.reportTopRow}>
              <View style={styles.reportInfo}>
                <View style={styles.reportBadgeRow}>
                  <Text style={[styles.reportedName, { color: colors.foreground }]}>{report.reported?.name}</Text>
                  <View style={styles.reasonBadge}>
                    <Text style={styles.reasonBadgeText}>{tReportReasons(report.reason)}</Text>
                  </View>
                  {report.reported?.accountStatus === 'SUSPENDED' && (
                    <View style={styles.suspendedBadge}>
                      <Text style={styles.suspendedBadgeText}>{tReports('alreadySuspended')}</Text>
                    </View>
                  )}
                  {report.reported?.accountStatus === 'BANNED' && (
                    <View style={styles.reasonBadge}>
                      <Text style={styles.reasonBadgeText}>{tReports('alreadyBanned')}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.reportMeta, { color: colors.mutedForeground }]}>
                  {tReports('reportedBy', { name: report.reporter?.name ?? '?' })}
                </Text>
                <Text style={styles.reportTotalCount}>
                  {tReports('totalReportsCount', { count: report.reportedTotalCount ?? 1 })}
                </Text>
                {!!report.details && (
                  <View style={[styles.detailsBox, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.detailsText, { color: colors.foreground }]}>{report.details}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.reportTime, { color: colors.mutedForeground }]}>
                {formatRelativeTime(report.createdAt, tTime)}
              </Text>
            </View>

            <View style={styles.actionsRowWrap}>
              <Pressable
                onPress={() => handleResolve(report, 'dismiss')}
                style={[styles.secondaryButton, { backgroundColor: colors.secondary }]}
              >
                <Flag size={12} color={colors.foreground} />
                <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>{tReports('dismiss')}</Text>
              </Pressable>
              <Pressable
                onPress={() => handleResolve(report, 'resolve')}
                style={[styles.secondaryButton, { backgroundColor: colors.secondary }]}
              >
                <Check size={12} color={colors.foreground} />
                <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>{tReports('resolve')}</Text>
              </Pressable>
            </View>

            <View style={styles.actionsRowWrap}>
              <Pressable onPress={() => handleResolve(report, 'suspend_1w')} style={styles.amberButton}>
                <Clock size={12} color="#B45309" />
                <Text style={styles.amberButtonText}>{tReports('actions.suspend_1w')}</Text>
              </Pressable>
              <Pressable onPress={() => handleResolve(report, 'suspend_1m')} style={styles.amberButton}>
                <CalendarX size={12} color="#B45309" />
                <Text style={styles.amberButtonText}>{tReports('actions.suspend_1m')}</Text>
              </Pressable>
              <Pressable onPress={() => handleResolve(report, 'ban')} style={styles.redButton}>
                <Ban size={12} color="#B91C1C" />
                <Text style={styles.redButtonText}>{tReports('actions.ban')}</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}

      {/* ── Reported content (posts, mock) ── */}
      <View style={[styles.headerRow, styles.contentSectionSpacing]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t('reportedContent')}</Text>
        <View style={styles.pendingPill}>
          <Text style={styles.pendingPillText}>{t('pendingCount', { count: posts.length })}</Text>
        </View>
      </View>

      {posts.length === 0 ? (
        <View style={[styles.emptyStateLarge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ShieldCheck size={40} color={colors.mutedForeground} style={styles.emptyIcon} />
          <Text style={[styles.emptyTextLarge, { color: colors.mutedForeground }]}>{t('allClear')}</Text>
        </View>
      ) : (
        posts.map((post) => (
          <Card key={post.id} style={[styles.reportCard, { borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.reportTopRow}>
              <View style={styles.reportInfo}>
                <View style={styles.reportBadgeRow}>
                  <Text style={[styles.reportedName, { color: colors.foreground }]}>{post.user}</Text>
                  <View style={styles.reasonBadge}>
                    <Text style={styles.reasonBadgeText}>{t('reportsCount', { count: post.reports })}</Text>
                  </View>
                </View>
                <Text style={[styles.reportMeta, { color: colors.mutedForeground }]}>{tReasons(post.reason)}</Text>
              </View>
              <Text style={[styles.reportTime, { color: colors.mutedForeground }]}>{post.time}</Text>
            </View>

            <View style={[styles.detailsBox, { backgroundColor: colors.secondary, marginBottom: 12 }]}>
              <Text style={[styles.detailsText, { color: colors.foreground }]}>{post.content}</Text>
            </View>

            <View style={styles.actionsRowWrap}>
              <Pressable style={[styles.secondaryButton, { backgroundColor: colors.secondary }]}>
                <Eye size={12} color={colors.foreground} />
                <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>{t('review')}</Text>
              </Pressable>
              <Pressable style={styles.amberButton}>
                <AlertTriangle size={12} color="#B45309" />
                <Text style={styles.amberButtonText}>{t('warnUser')}</Text>
              </Pressable>
              <Pressable onPress={() => handleRemovePost(post.id)} style={styles.redButton}>
                <Trash2 size={12} color="#B91C1C" />
                <Text style={styles.redButtonText}>{t('remove')}</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}
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
  contentSectionSpacing: {
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  pendingPill: {
    backgroundColor: '#FEE2E2',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  pendingPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
  },
  spinnerWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyStateLarge: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyIcon: {
    marginBottom: 8,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyTextLarge: {
    fontSize: 14,
    fontWeight: '500',
  },
  reportCard: {
    padding: 16,
  },
  reportTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  reportInfo: {
    flex: 1,
    minWidth: 0,
  },
  reportBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  reportedName: {
    fontSize: 12,
    fontWeight: '600',
  },
  reasonBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  reasonBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B91C1C',
  },
  suspendedBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  suspendedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B45309',
  },
  reportMeta: {
    fontSize: 12,
  },
  reportTotalCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#B91C1C',
    marginTop: 2,
  },
  detailsBox: {
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  detailsText: {
    fontSize: 12,
    lineHeight: 17,
  },
  reportTime: {
    fontSize: 10,
    flexShrink: 0,
  },
  actionsRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  amberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF3C7',
  },
  amberButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#B45309',
  },
  redButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
  },
  redButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#B91C1C',
  },
});
