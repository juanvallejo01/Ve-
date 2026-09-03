import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { useTheme } from '@/context/theme-context';
import { MAJOR_DISTRIBUTION } from '@/constants/admin-mock-data';

const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/**
 * Ported from the web app's `components/admin/analytics-tab.tsx`.
 *
 * 100% mock, ported 1:1: static engagement numbers, static bar-chart data
 * arrays, and the `MAJOR_DISTRIBUTION` mock constant — none of it comes from
 * an API on the web side, so nothing here does either. The web's CSS
 * percentage-height/width bars (plain `<div style={{ height/width: pct% }}>`)
 * become plain RN `View`s with percentage `height`/`width`, no charting
 * library needed.
 */
export function AnalyticsTab() {
  const { colors } = useTheme();
  const { t } = useTranslation('translation', { keyPrefix: 'adminAnalytics' });

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        <EngagementCard
          label={t('avgDailyPosts')}
          value="47"
          change={t('vsLastWeek', { sign: '+', percent: 12 })}
          positive
        />
        <EngagementCard
          label={t('avgDailySparks')}
          value="186"
          change={t('vsLastWeek', { sign: '+', percent: 8 })}
          positive
        />
        <EngagementCard
          label={t('engagementRate')}
          value="73%"
          change={t('vsLastWeek', { sign: '+', percent: 3 })}
          positive
        />
        <EngagementCard
          label={t('retention')}
          value="68%"
          change={t('vsLastWeek', { sign: '-', percent: 2 })}
          positive={false}
        />
      </View>

      <BarChartCard
        title={t('postsPerDay')}
        data={[28, 35, 42, 38, 55, 47, 51]}
        max={55}
        gradient={['#171717', '#000000']}
      />

      <BarChartCard
        title={t('sparksGrowth')}
        data={[120, 145, 162, 178, 186, 198, 210]}
        max={210}
        gradient={['#000000', '#000000']}
      />

      <Card style={[styles.majorsCard, { borderColor: colors.border, borderWidth: 1 }]}>
        <Text style={[styles.majorsTitle, { color: colors.foreground }]}>{t('usersByMajor')}</Text>
        <View style={styles.majorsList}>
          {MAJOR_DISTRIBUTION.map((item) => (
            <View key={item.major} style={styles.majorRow}>
              <Text style={[styles.majorLabel, { color: colors.foreground }]} numberOfLines={1}>
                {t(`majors.${item.major}`)}
              </Text>
              <View style={[styles.majorTrack, { backgroundColor: colors.secondary }]}>
                <LinearGradient
                  colors={['#171717', '#000000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.majorFill, { width: `${item.pct}%` }]}
                />
              </View>
              <Text style={[styles.majorPct, { color: colors.mutedForeground }]}>{item.pct}%</Text>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

function EngagementCard({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Card style={[styles.engagementCard, { borderColor: colors.border, borderWidth: 1 }]}>
      <Text style={[styles.engagementLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.engagementValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.engagementChange, { color: positive ? '#16A34A' : '#DC2626' }]}>{change}</Text>
    </Card>
  );
}

function BarChartCard({
  title,
  data,
  max,
  gradient,
}: {
  title: string;
  data: number[];
  max: number;
  gradient: readonly [string, string];
}) {
  const { colors } = useTheme();
  const { t } = useTranslation('translation', { keyPrefix: 'adminAnalytics.days' });

  return (
    <Card style={[styles.barCard, { borderColor: colors.border, borderWidth: 1 }]}>
      <Text style={[styles.barTitle, { color: colors.foreground }]}>{title}</Text>
      <View style={styles.barRow}>
        {data.map((val, i) => (
          <View key={i} style={styles.barCol}>
            <View style={styles.barTrack}>
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={[styles.barFill, { height: `${(val / max) * 100}%` }]}
              />
            </View>
            <Text style={[styles.barDayLabel, { color: colors.mutedForeground }]}>{t(DAY_KEYS[i])}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  engagementCard: {
    width: '48%',
    padding: 16,
  },
  engagementLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  engagementValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  engagementChange: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  barCard: {
    padding: 16,
  },
  barTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 128,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  barDayLabel: {
    fontSize: 9,
  },
  majorsCard: {
    padding: 16,
  },
  majorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  majorsList: {
    gap: 10,
  },
  majorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  majorLabel: {
    fontSize: 12,
    width: 112,
    flexShrink: 0,
  },
  majorTrack: {
    flex: 1,
    height: 20,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  majorFill: {
    height: '100%',
    borderRadius: 9999,
  },
  majorPct: {
    fontSize: 12,
    width: 32,
    textAlign: 'right',
    flexShrink: 0,
  },
});
