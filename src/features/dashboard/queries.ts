/**
 * Purpose: Thin server-only orchestration entrypoint for dashboard queries.
 *
 * @module features/dashboard/queries
 */

import 'server-only';

import type { CurrentUser } from '@/lib/current-user';
import {
  getNeedsAttentionItems,
  getRecentDashboardActivity,
  getTodaysScheduleItems,
} from './operational-queries';
import {
  getAdminDashboardSummary,
  getCustomerServiceDashboardSummary,
  getDashboardSummaryForCurrentUser,
  getInstructorDashboardSummary,
} from './summary-queries';
import type { DashboardOverview } from './types';
import {
  assertAuthorizedCapability,
  canAccessPlatform,
} from '@/features/auth/permissions';

export {
  getAdminDashboardSummary,
  getCustomerServiceDashboardSummary,
  getDashboardSummaryForCurrentUser,
  getInstructorDashboardSummary,
  getNeedsAttentionItems,
  getRecentDashboardActivity,
  getTodaysScheduleItems,
};

/**
 * Returns the complete dashboard overview for the current user's role.
 *
 * @param currentUser - The authenticated user whose role scopes dashboard data.
 * @returns Summary cards plus dashboard-ready operational section rows.
 */
export async function getDashboardOverviewForCurrentUser(
  currentUser: CurrentUser,
): Promise<DashboardOverview> {
  assertAuthorizedCapability(canAccessPlatform(currentUser));
  const [summary, needsAttention, todaysSchedule, recentActivity] =
    await Promise.all([
      getDashboardSummaryForCurrentUser(currentUser),
      getNeedsAttentionItems(currentUser),
      getTodaysScheduleItems(currentUser),
      getRecentDashboardActivity(currentUser),
    ]);

  return {
    summary,
    needsAttention,
    todaysSchedule,
    recentActivity,
  };
}
