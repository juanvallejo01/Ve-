import { ArrowLeft, Activity, AlertTriangle, BarChart3, LogOut, type LucideIcon, Users } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnalyticsTab } from '@/components/admin/analytics-tab';
import { ModerationTab } from '@/components/admin/moderation-tab';
import { OverviewTab } from '@/components/admin/overview-tab';
import { UsersTab } from '@/components/admin/users-tab';
import { useAuth } from '@/context/auth-context';

type AdminTab = 'overview' | 'users' | 'moderation' | 'analytics';

const ADMIN_TABS: { id: AdminTab; labelKey: AdminTab; icon: LucideIcon }[] = [
  { id: 'overview', labelKey: 'overview', icon: BarChart3 },
  { id: 'users', labelKey: 'users', icon: Users },
  { id: 'moderation', labelKey: 'moderation', icon: AlertTriangle },
  { id: 'analytics', labelKey: 'analytics', icon: Activity },
];

/**
 * Ported from the web app's `screens/AdminDashboard.tsx`.
 *
 * Reached via the three-way `Stack.Protected` split in `app/_layout.tsx`:
 * users with `role === 'ADMIN'` are routed here instead of `(tabs)`, and see
 * ONLY this screen — no bottom tab bar, no access to Feed/Explore/etc. —
 * matching the web app's `if (isAdmin) return <AdminDashboardPage
 * onClose={() => {}} /> ` with nothing else rendered.
 *
 * The web's `onClose` prop (wired to the back button) is a literal no-op at
 * the web app's only call site (`app/page.tsx`: `onClose={() => {}}`) —
 * there's nowhere for an admin to "go back" to, since this is the entire
 * app for them. The back button is kept here for visual parity but is
 * likewise inert.
 *
 * No nested navigator: like the 90-line web component, tab switching is a
 * single local `activeTab` state conditionally rendering one of the 4 tab
 * components below — not a route per tab.
 */
export default function AdminDashboardScreen() {
  const { t } = useTranslation('translation', { keyPrefix: 'admin' });
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  async function handleLogout() {
    await logout();
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => {}} style={styles.circleButton} hitSlop={8} accessibilityLabel={t('goBack')}>
              <ArrowLeft size={18} color="#FFFFFF" />
            </Pressable>
            <View>
              <Text style={styles.headerTitle}>{t('title')}</Text>
              <Text style={styles.headerSubtitle}>{t('subtitle')}</Text>
            </View>
          </View>
          <Pressable onPress={handleLogout} style={styles.circleButton} hitSlop={8} accessibilityLabel={t('logout')}>
            <LogOut size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {ADMIN_TABS.map(({ id, labelKey, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <Pressable
                key={id}
                onPress={() => setActiveTab(id)}
                style={[styles.tabPill, isActive ? styles.tabPillActive : styles.tabPillInactive]}
              >
                <Icon size={13} color={isActive ? '#000000' : 'rgba(255,255,255,0.8)'} />
                <Text style={[styles.tabPillText, { color: isActive ? '#000000' : 'rgba(255,255,255,0.8)' }]}>
                  {t(`tabs.${labelKey}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'moderation' && <ModerationTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F8FA',
  },
  headerSafeArea: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  circleButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tabPillActive: {
    backgroundColor: '#FFFFFF',
  },
  tabPillInactive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    flexGrow: 1,
  },
});
