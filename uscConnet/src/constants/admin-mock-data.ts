/**
 * Mock data ported verbatim from the web app's `utils/constants.ts`
 * (`ADMIN_USERS`, `REPORTED_POSTS`, `MAJOR_DISTRIBUTION`).
 *
 * The web admin dashboard's Users tab, Analytics tab, and Moderation tab's
 * "reported content" section are 100% mock/local-state on the web side —
 * no backend calls, just `useState(ADMIN_USERS)` etc. mutated locally by
 * verify/suspend/delete/remove handlers. This is a deliberate, already-
 * approved mock-vs-real split (see `src/app/admin/index.tsx` for the full
 * rundown) — this file ports that mock data as-is so the RN port looks and
 * behaves identically to the current web app, rather than "fixing" it by
 * wiring up real endpoints the web screens never call.
 */

export interface AdminMockUser {
  id: number;
  name: string;
  email: string;
  major: string;
  status: 'active' | 'suspended' | 'banned';
  verified: boolean;
}

export const ADMIN_USERS: AdminMockUser[] = [
  { id: 1, name: 'Sarah Miller', email: 'smiller@usc.edu', major: 'Film Production', status: 'active', verified: true },
  { id: 2, name: 'James Chen', email: 'jchen@usc.edu', major: 'Computer Science', status: 'active', verified: true },
  { id: 3, name: 'Emily Davis', email: 'edavis@usc.edu', major: 'Art History', status: 'suspended', verified: true },
  { id: 4, name: 'Alex Rivera', email: 'arivera@usc.edu', major: 'Business Admin', status: 'active', verified: false },
  { id: 5, name: 'Jordan Lee', email: 'jlee@usc.edu', major: 'Psychology', status: 'banned', verified: false },
  { id: 6, name: 'Taylor Kim', email: 'tkim@usc.edu', major: 'Engineering', status: 'active', verified: true },
];

/** `reason` values match the `adminModeration.reasons` i18n keys verbatim. */
export interface AdminMockReportedPost {
  id: number;
  user: string;
  reason: 'Inappropriate content' | 'Spam' | 'Harassment';
  content: string;
  reports: number;
  time: string;
}

export const REPORTED_POSTS: AdminMockReportedPost[] = [
  {
    id: 1,
    user: 'Anonymous',
    reason: 'Inappropriate content',
    content: 'Post contains offensive language targeting students...',
    reports: 5,
    time: '2h ago',
  },
  {
    id: 2,
    user: 'Jordan Lee',
    reason: 'Spam',
    content: 'Buy followers cheap! DM for details. Best prices guaranteed...',
    reports: 12,
    time: '4h ago',
  },
  {
    id: 3,
    user: 'Unknown',
    reason: 'Harassment',
    content: 'Targeted message about a specific student organization...',
    reports: 3,
    time: '6h ago',
  },
];

/** `major` values match the `adminAnalytics.majors` i18n keys verbatim. */
export interface AdminMockMajorDistribution {
  major: string;
  count: number;
  pct: number;
}

export const MAJOR_DISTRIBUTION: AdminMockMajorDistribution[] = [
  { major: 'Computer Science', count: 520, pct: 18 },
  { major: 'Business Admin', count: 445, pct: 16 },
  { major: 'Film Production', count: 380, pct: 13 },
  { major: 'Engineering', count: 340, pct: 12 },
  { major: 'Art & Design', count: 290, pct: 10 },
  { major: 'Psychology', count: 260, pct: 9 },
  { major: 'Other', count: 612, pct: 22 },
];
