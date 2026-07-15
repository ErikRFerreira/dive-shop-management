/**
 * Purpose: Role-scoped operational section queries for the dashboard.
 *
 * @module features/dashboard/operational-queries
 */

import { UserRole } from '@/generated/prisma/enums';
import {
  getCustomerServiceDashboardNeedsAttentionBookings,
  getDashboardNeedsAttentionBookings,
  getRecentDashboardBookingsForCustomerService,
  getRecentDashboardBookingsForInstructor,
  getRecentDashboardBookingsForOperations,
} from '@/features/bookings/dashboard-queries';
import {
  getDashboardDateOnlyRange,
  getTodaysDashboardScheduleItemsForCustomerService,
  getTodaysDashboardScheduleItemsForInstructor,
  getTodaysDashboardScheduleItemsForOperations,
  getUnassignedDashboardScheduleItemsFromDate,
} from '@/features/schedule/dashboard-queries';
import type { CurrentUser } from '@/lib/current-user';
import { hasFullOperationalAccess } from '@/features/auth/permissions';
import {
  mapBookingToNeedsAttentionItem,
  mapBookingToRecentActivityItem,
  mapScheduleItemToDashboardScheduleItem,
  mapScheduleItemToNeedsAttentionItem,
} from './mappers';
import type {
  DashboardNeedsAttentionItem,
  DashboardRecentActivityItem,
  DashboardScheduleItem,
} from './types';

const NEEDS_ATTENTION_BOOKING_LIMIT = 8;
const NEEDS_ATTENTION_UNASSIGNED_LIMIT = 4;
const TODAY_SCHEDULE_LIMIT = 12;
const RECENT_ACTIVITY_LIMIT = 3;

/**
 * Returns role-scoped dashboard rows that require operational attention.
 *
 * @param currentUser - The authenticated user whose role scopes the result.
 * @returns Booking and unassigned schedule items that should be reviewed soon.
 */
export async function getNeedsAttentionItems(
  currentUser: CurrentUser,
): Promise<DashboardNeedsAttentionItem[]> {
  if (isDashboardOperationsUser(currentUser)) {
    const todayRange = getDashboardDateOnlyRange(new Date());
    const [bookings, unassignedScheduleItems] = await Promise.all([
      getDashboardNeedsAttentionBookings(NEEDS_ATTENTION_BOOKING_LIMIT),
      getUnassignedDashboardScheduleItemsFromDate(
        todayRange.start,
        NEEDS_ATTENTION_UNASSIGNED_LIMIT,
      ),
    ]);

    return [
      ...bookings.map(mapBookingToNeedsAttentionItem),
      ...unassignedScheduleItems.map(mapScheduleItemToNeedsAttentionItem),
    ];
  }

  if (currentUser.role === UserRole.CUSTOMER_SERVICE) {
    const bookings = await getCustomerServiceDashboardNeedsAttentionBookings(
      currentUser.id,
      NEEDS_ATTENTION_BOOKING_LIMIT,
    );

    return bookings.map(mapBookingToNeedsAttentionItem);
  }

  return [];
}

/**
 * Returns today's official schedule items for the current dashboard user.
 *
 * @param currentUser - The authenticated user whose role scopes schedule rows.
 * @returns Dashboard-shaped schedule rows limited to official scheduled bookings.
 */
export async function getTodaysScheduleItems(
  currentUser: CurrentUser,
): Promise<DashboardScheduleItem[]> {
  const todayRange = getDashboardDateOnlyRange(new Date());

  if (isDashboardOperationsUser(currentUser)) {
    const scheduleItems = await getTodaysDashboardScheduleItemsForOperations(
      todayRange,
      TODAY_SCHEDULE_LIMIT,
    );

    return scheduleItems.map(mapScheduleItemToDashboardScheduleItem);
  }

  if (currentUser.role === UserRole.CUSTOMER_SERVICE) {
    const scheduleItems = await getTodaysDashboardScheduleItemsForCustomerService(
      currentUser.id,
      todayRange,
      TODAY_SCHEDULE_LIMIT,
    );

    return scheduleItems.map(mapScheduleItemToDashboardScheduleItem);
  }

  if (currentUser.role === UserRole.INSTRUCTOR) {
    const scheduleItems = await getTodaysDashboardScheduleItemsForInstructor(
      currentUser.id,
      todayRange,
      TODAY_SCHEDULE_LIMIT,
    );

    return scheduleItems.map(mapScheduleItemToDashboardScheduleItem);
  }

  return [];
}

/**
 * Returns simple recent activity rows from recently updated booking records.
 *
 * @param currentUser - The authenticated user whose role scopes activity rows.
 * @returns Recent booking activity labels derived from recently updated bookings.
 */
export async function getRecentDashboardActivity(
  currentUser: CurrentUser,
): Promise<DashboardRecentActivityItem[]> {
  if (isDashboardOperationsUser(currentUser)) {
    const bookings =
      await getRecentDashboardBookingsForOperations(RECENT_ACTIVITY_LIMIT);

    return bookings.map(mapBookingToRecentActivityItem);
  }

  if (currentUser.role === UserRole.CUSTOMER_SERVICE) {
    const bookings = await getRecentDashboardBookingsForCustomerService(
      currentUser.id,
      RECENT_ACTIVITY_LIMIT,
    );

    return bookings.map(mapBookingToRecentActivityItem);
  }

  if (currentUser.role === UserRole.INSTRUCTOR) {
    const bookings = await getRecentDashboardBookingsForInstructor(
      currentUser.id,
      RECENT_ACTIVITY_LIMIT,
    );

    return bookings.map(mapBookingToRecentActivityItem);
  }

  return [];
}

/**
 * Checks whether a user can see global operational dashboard data.
 *
 * @param currentUser - The user role to inspect.
 * @returns True for Admin and Manager users.
 */
function isDashboardOperationsUser(currentUser: Pick<CurrentUser, 'role'>) {
  return hasFullOperationalAccess(currentUser);
}
