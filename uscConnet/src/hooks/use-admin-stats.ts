import { useEffect, useState } from 'react';

import { adminApi } from '@/lib/api-client';
import type { AdminStats } from '@/types';

/**
 * Ported from the web app's `hooks/use-admin-stats.ts`. Fetches real stats
 * from `GET /admin/stats` via `adminApi.getStats()` — this is the one part
 * of the admin Overview tab backed by a real endpoint. (The tab's "recent
 * activity" feed is separately hardcoded mock data, kept inline in
 * `components/admin/overview-tab.tsx` exactly as the web source has it.)
 */
export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        setIsLoading(true);
        const data = await adminApi.getStats();
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch (err: any) {
        console.error('Failed to fetch admin stats:', err);
        if (!cancelled) {
          setError(err?.message || 'Failed to load statistics');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, isLoading, error };
}
