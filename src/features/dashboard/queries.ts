/**
 * Purpose: Server-only role-aware summary queries for the dashboard page.
 *
 * @module features/dashboard/queries
 */

import 'server-only';

import { BookingStatus, UserRole } from '@/generated/prisma/enums';
import { db } from '@/lib/db';
import type { CurrentUser } from '@/lib/current-user';

export type AdminDashboardSummary = {
  kind: 'admin';
  pendingApprovalCount: number;
  needsMoreInfoCount: number;
  todayScheduleCount: number;
  tomorrowScheduleCount: number;
  unassignedActivitiesCount: number;
};

export type CustomerServiceDashboardSummary = {
  kind: 'customer-service';
  myDraftsCount: number;
  myPendingApprovalCount: number;
  myNeedsMoreInfoCount: number;
  myApprovedScheduledBookingsCount: number;
};

export type InstructorDashboardSummary = {
  kind: 'instructor';
  todayAssignmentsCount: number;
  tomorrowAssignmentsCount: number;
  myAssignmentsCount: number;
};

export type EmptyDashboardSummary = {
  kind: 'empty';
};

export type DashboardSummary =
  | AdminDashboardSummary
  | CustomerServiceDashboardSummary
  | InstructorDashboardSummary
  | EmptyDashboardSummary;

/**
 * Returns the dashboard summary that matches the current user's role.
 *
 * @param currentUser - The authenticated user whose role scopes dashboard data.
 * @returns Role-specific summary counts, or an empty summary for roles without
 * dashboard cards in this task.
 */
export async function getDashboardSummaryForCurrentUser(
  currentUser: CurrentUser,
): Promise<DashboardSummary> {
  if (
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.MANAGER
  ) {
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
 * @returns Global dashboard counts for authorized roles, or an empty summary for
 * unauthorized roles.
 */
export async function getAdminDashboardSummary(
  currentUser: Pick<CurrentUser, 'role'>,
): Promise<AdminDashboardSummary | EmptyDashboardSummary> {
  if (
    currentUser.role !== UserRole.ADMIN &&
    currentUser.role !== UserRole.MANAGER
  ) {
    return { kind: 'empty' };
  }

  const todayRange = getDateOnlyRange(new Date());
  const tomorrowRange = getDateOnlyRange(addDays(todayRange.start, 1));

  const [
    pendingApprovalCount,
    needsMoreInfoCount,
    todayScheduleCount,
    tomorrowScheduleCount,
    unassignedActivitiesCount,
  ] = await Promise.all([
    db.bookingRequest.count({
      where: {
        status: BookingStatus.PENDING_APPROVAL,
      },
    }),
    db.bookingRequest.count({
      where: {
        status: BookingStatus.NEEDS_MORE_INFO,
      },
    }),
    db.scheduleItem.count({
      where: buildScheduledItemDateWhere(todayRange),
    }),
    db.scheduleItem.count({
      where: buildScheduledItemDateWhere(tomorrowRange),
    }),
    db.scheduleItem.count({
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        assignments: {
          none: {},
        },
      },
    }),
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
 * @param currentUser - The authenticated Customer Service user requesting their
 * dashboard data.
 * @returns Owner-scoped dashboard counts for Customer Service, or an empty
 * summary for unauthorized roles.
 */
export async function getCustomerServiceDashboardSummary(
  currentUser: Pick<CurrentUser, 'id' | 'role'>,
): Promise<CustomerServiceDashboardSummary | EmptyDashboardSummary> {
  if (currentUser.role !== UserRole.CUSTOMER_SERVICE) {
    return { kind: 'empty' };
  }

  const ownedBookingWhere = {
    createdById: currentUser.id,
  };

  const [
    myDraftsCount,
    myPendingApprovalCount,
    myNeedsMoreInfoCount,
    myApprovedScheduledBookingsCount,
  ] = await Promise.all([
    db.bookingRequest.count({
      where: {
        ...ownedBookingWhere,
        status: BookingStatus.DRAFT,
      },
    }),
    db.bookingRequest.count({
      where: {
        ...ownedBookingWhere,
        status: BookingStatus.PENDING_APPROVAL,
      },
    }),
    db.bookingRequest.count({
      where: {
        ...ownedBookingWhere,
        status: BookingStatus.NEEDS_MORE_INFO,
      },
    }),
    db.bookingRequest.count({
      where: {
        ...ownedBookingWhere,
        status: {
          in: [BookingStatus.APPROVED, BookingStatus.SCHEDULED],
        },
      },
    }),
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
 * @param currentUser - The authenticated Instructor user requesting assignment
 * dashboard data.
 * @returns Assignment-scoped dashboard counts for instructors, or an empty
 * summary for unauthorized roles.
 */
export async function getInstructorDashboardSummary(
  currentUser: Pick<CurrentUser, 'id' | 'role'>,
): Promise<InstructorDashboardSummary | EmptyDashboardSummary> {
  if (currentUser.role !== UserRole.INSTRUCTOR) {
    return { kind: 'empty' };
  }

  const todayRange = getDateOnlyRange(new Date());
  const tomorrowRange = getDateOnlyRange(addDays(todayRange.start, 1));

  const [todayAssignmentsCount, tomorrowAssignmentsCount, myAssignmentsCount] =
    await Promise.all([
      db.scheduleItem.count({
        where: buildAssignedScheduledItemDateWhere(currentUser.id, todayRange),
      }),
      db.scheduleItem.count({
        where: buildAssignedScheduledItemDateWhere(
          currentUser.id,
          tomorrowRange,
        ),
      }),
      db.scheduleItem.count({
        where: buildAssignedScheduledItemWhere(currentUser.id),
      }),
    ]);

  return {
    kind: 'instructor',
    todayAssignmentsCount,
    tomorrowAssignmentsCount,
    myAssignmentsCount,
  };
}

type DateOnlyRange = {
  start: Date;
  end: Date;
};

/**
 * Builds a local date-only range for a day stored in a Prisma `@db.Date` field.
 *
 * @param date - Any date within the desired local day.
 * @returns The start of that local day and the start of the following day.
 */
function getDateOnlyRange(date: Date): DateOnlyRange {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  return {
    start,
    end: addDays(start, 1),
  };
}

/**
 * Returns a copy of the provided date moved forward by a whole number of days.
 *
 * @param date - The date to copy and increment.
 * @param days - The number of local calendar days to add.
 * @returns A new Date with the requested day offset applied.
 */
function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

/**
 * Builds a scheduled-item count filter for a specific date range.
 *
 * @param dateRange - The date range to match against `ScheduleItem.date`.
 * @returns A Prisma where object limited to official scheduled bookings.
 */
function buildScheduledItemDateWhere(dateRange: DateOnlyRange) {
  return {
    bookingRequest: {
      status: BookingStatus.SCHEDULED,
    },
    date: {
      gte: dateRange.start,
      lt: dateRange.end,
    },
  };
}

/**
 * Builds a scheduled-item count filter scoped to one assigned staff user.
 *
 * @param userId - The staff user ID that must appear in schedule assignments.
 * @returns A Prisma where object limited to official scheduled assigned items.
 */
function buildAssignedScheduledItemWhere(userId: string) {
  return {
    bookingRequest: {
      status: BookingStatus.SCHEDULED,
    },
    assignments: {
      some: {
        userId,
      },
    },
  };
}

/**
 * Builds an assigned scheduled-item count filter for a specific date range.
 *
 * @param userId - The staff user ID that must appear in schedule assignments.
 * @param dateRange - The date range to match against `ScheduleItem.date`.
 * @returns A Prisma where object scoped by scheduled status, assignment, and date.
 */
function buildAssignedScheduledItemDateWhere(
  userId: string,
  dateRange: DateOnlyRange,
) {
  return {
    ...buildAssignedScheduledItemWhere(userId),
    date: {
      gte: dateRange.start,
      lt: dateRange.end,
    },
  };
}
