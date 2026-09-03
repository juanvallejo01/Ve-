import { LinearGradient } from 'expo-linear-gradient';
import { type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { useTheme } from '@/context/theme-context';

/**
 * Ported from the web app's `components/admin/stat-card.tsx`. Two small
 * presentational pieces reused across the Overview, Users, and Moderation
 * tabs: `StatCard` (icon + label + value tile) and `StatusBadge`
 * (active/suspended/banned pill).
 */

export interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /**
   * Web passes a Tailwind class per stat — either a flat color
   * (`bg-[#000000]`) or a gradient (`bg-gradient-to-br from-X to-Y`). Callers
   * here pass either a single hex string (flat) or a `[from, to]` tuple
   * (gradient), rendered via `expo-linear-gradient` for the gradient case.
   */
  color: string | readonly [string, string];
}

export function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const { colors } = useTheme();
  const isGradient = Array.isArray(color);

  return (
    <Card style={[styles.card, { borderColor: colors.border, borderWidth: 1 }]}>
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
          <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
        </View>
        {isGradient ? (
          <LinearGradient
            colors={color as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBox}
          >
            <Icon size={18} color="#FFFFFF" />
          </LinearGradient>
        ) : (
          <View style={[styles.iconBox, { backgroundColor: color as string }]}>
            <Icon size={18} color="#FFFFFF" />
          </View>
        )}
      </View>
    </Card>
  );
}

type UserStatus = 'active' | 'suspended' | 'banned';

/** Web: `bg-green-100 text-green-700` / `bg-amber-100 text-amber-700` / `bg-red-100 text-red-700`. */
const STATUS_STYLES: Record<UserStatus, { bg: string; fg: string }> = {
  active: { bg: '#DCFCE7', fg: '#15803D' },
  suspended: { bg: '#FEF3C7', fg: '#B45309' },
  banned: { bg: '#FEE2E2', fg: '#B91C1C' },
};

export function StatusBadge({ status }: { status: UserStatus }) {
  const { t } = useTranslation('translation', { keyPrefix: 'adminUsers.status' });
  const style = STATUS_STYLES[status];

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.fg }]}>{t(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  iconBox: {
    height: 40,
    width: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
