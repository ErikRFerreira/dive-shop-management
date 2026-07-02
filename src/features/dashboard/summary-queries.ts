/**
 * Purpose: Role-specific summary card queries for the dashboard.
 *
 * @module features/dashboard/summary-queries
 */

import { UserRole } from '@/generated/prisma/enums';
import {
  getCustomerServiceApprovedScheduledBookingCount,
  getCustomerServiceDraftBookingCount,
  getCustomerServiceNeedsMoreInfoBookingCount,
  getCustomerServicePendingApprovalBookingCount,
  getNeedsMoreInfoBookingCount,
  getPendingApprovalBookingCount,
} from '@/features/bookings/dashboard-queries';
import {
  addDashboardDays,
  getAssignedScheduledItemCount,
  getAssignedScheduledItemCountForDateRange,
  getDashboardDateOnlyRange,
  getScheduledItemCountForDateRange,
  getUnassignedScheduledItemCount,
} from '@/features/schedule/dashboard-queries';
import type { CurrentUser } from '@/lib/current-user';
import type {
  AdminDashboardSummary,
  CustomerServiceDashboardSummary,
  DashboardSummary,
  EmptyDashboardSummary,
  InstructorDashboardSummary,
} from './types';

/**
 * Returns the dashboard summary that matches the current user's role.
 *
 * @param currentUser - The authenticated user whose role scopes dashboard data.
 * @returns Role-specific summary counts, or an empty summary for unsupported roles.
 */
export async function getDashboardSummaryForCurrentUser(
  currentUser: CurrentUser,
): Promise<DashboardSummary> {
  if (isDashboardOperationsUser(currentUser)) {
    return getAdminDashboardSummary(currentUser);
  }

  if (currentUser.role === UserRole.CUSTOMER_SERVICE) {
    return getCustomerServiceDashboardSummary(currentUser);
  }

  if (currentUser.role === UserRole.INSTRUCTOR) {
    return getInstructorDashboardSummary(currentUser);
  }

  return { kind: 'empty' };
}

/**
 * Returns global operational summary counts for Admin and Manager users.
 *
 * @param currentUser - The authenticated user requesting global dashboard data.
 * @returns Global dashboard counts for authorized roles, or an empty summary.
 */
export async function getAdminDashboardSummary(
  currentUser: Pick<CurrentUser, 'role'>,
): Promise<AdminDashboardSummary | EmptyDashboardSummary> {
  if (!isDashboardOperationsUser(currentUser)) {
    return { kind: 'empty' };
  }

  const todayRange = getDashboardDateOnlyRange(new Date());
  const tomorrowRange = getDashboardDateOnlyRange(
    addDashboardDays(todayRange.start, 1),
  );

  const [
    pendingApprovalCount,
    needsMoreInfoCount,
    todayScheduleCount,
    tomorrowScheduleCount,
    unassignedActivitiesCount,
  ] = await Promise.all([
    getPendingApprovalBookingCount(),
    getNeedsMoreInfoBookingCount(),
    getScheduledItemCountForDateRange(todayRange),
    getScheduledItemCountForDateRange(tomorrowRange),
    getUnassignedScheduledItemCount(),
  ]);

  return {
    kind: 'admin',
    pendingApprovalCount,
    needsMoreInfoCount,
    todayScheduleCount,
    tomorrowScheduleCount,
    unassignedActivitiesCount,
  };
}

/**
 * Returns owner-scoped booking summary counts for a Customer Service user.
 *
 * @param currentUser - The authenticated Customer Service user requesting data.
 * @returns Owner-scoped dashboard counts for Customer Service, or an empty summary.
 */
export async function getCustomerServiceDashboardSummary(
  currentUser: Pick<CurrentUser, 'id' | 'role'>,
): Promise<CustomerServiceDashboardSummary | EmptyDashboardSummary> {
  if (currentUser.role !== UserRole.CUSTOMER_SERVICE) {
    return { kind: 'empty' };
  }

  const [
    myDraftsCount,
    myPendingApprovalCount,
    myNeedsMoreInfoCount,
    myApprovedScheduledBookingsCount,
  ] = await Promise.all([
    getCustomerServiceDraftBookingCount(currentUser.id),
    getCustomerServicePendingApprovalBookingCount(currentUser.id),
    getCustomerServiceNeedsMoreInfoBookingCount(currentUser.id),
    getCustomerServiceApprovedScheduledBookingCount(currentUser.id),
  ]);

  return {
    kind: 'customer-service',
    myDraftsCount,
    myPendingApprovalCount,
    myNeedsMoreInfoCount,
    myApprovedScheduledBookingsCount,
  };
}

/**
 * Returns assignment-scoped schedule summary counts for an Instructor user.
 *
 * @param currentUser - The authenticated Instructor user requesting data.
 * @returns Assignment-scoped dashboard counts for instructors, or an empty summary.
 */
export async function getInstructorDashboardSummary(
  currentUser: Pick<CurrentUser, 'id' | 'role'>,
): Promise<InstructorDashboardSummary | EmptyDashboardSummary> {
  if (currentUser.role !== UserRole.INSTRUCTOR) {
    return { kind: 'empty' };
  }

  const todayRange = getDashboardDateOnlyRange(new Date());
  const tomorrowRange = getDashboardDateOnlyRange(
    addDashboardDays(todayRange.start, 1),
  );

  const [todayAssignmentsCount, tomorrowAssignmentsCount, myAssignmentsCount] =
    await Promise.all([
      getAssignedScheduledItemCountForDateRange(currentUser.id, todayRange),
      getAssignedScheduledItemCountForDateRange(currentUser.id, tomorrowRange),
      getAssignedScheduledItemCount(currentUser.id),
    ]);

  return {
    kind: 'instructor',
    todayAssignmentsCount,
    tomorrowAssignmentsCount,
    myAssignmentsCount,
  };
}

/**
 * Checks whether a user can see global operational dashboard data.
 *
 * @param currentUser - The user role to inspect.
 * @returns True for Admin and Manager users.
 */
function isDashboardOperationsUser(currentUser: Pick<CurrentUser, 'role'>) {
  return (
    currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER
  );
}
