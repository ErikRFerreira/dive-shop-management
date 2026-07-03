/**
 * Purpose: Server-only schedule data readers used by the dashboard query layer.
 *
 * @module features/schedule/dashboard-queries
 */

import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import { BookingStatus } from '@/generated/prisma/enums';
import { db } from '@/lib/db';
import {
  addUtcDateOnlyDays,
  getShopDateOnlyRange,
  type DateOnlyRange,
} from '@/lib/operational-date';

export type DashboardDateOnlyRange = DateOnlyRange;

const dashboardScheduleAttentionArgs = {
  select: {
    id: true,
    bookingRequestId: true,
    date: true,
    startTime: true,
    activityType: true,
    updatedAt: true,
    bookingRequest: {
      select: {
        id: true,
        status: true,
        activities: {
          select: {
            activityType: true,
            sortOrder: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        customers: {
          select: {
            role: true,
            createdAt: true,
            customer: {
              select: {
                fullName: true,
                firstName: true,
                lastName: true,
                chineseName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    },
  },
} satisfies Prisma.ScheduleItemDefaultArgs;

const dashboardTodayScheduleArgs = {
  select: {
    id: true,
    bookingRequestId: true,
    date: true,
    startTime: true,
    activityType: true,
    assignments: {
      select: {
        id: true,
        userId: true,
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
    bookingRequest: {
      select: {
        id: true,
        activityType: true,
        numberOfPeople: true,
        activities: {
          select: {
            activityType: true,
            sortOrder: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        customers: {
          select: {
            role: true,
            hotelAtBooking: true,
            createdAt: true,
            customer: {
              select: {
                fullName: true,
                firstName: true,
                lastName: true,
                chineseName: true,
                hotel: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    },
  },
} satisfies Prisma.ScheduleItemDefaultArgs;

export type DashboardScheduleAttentionRecord = Prisma.ScheduleItemGetPayload<
  typeof dashboardScheduleAttentionArgs
>;

export type DashboardTodayScheduleRecord = Prisma.ScheduleItemGetPayload<
  typeof dashboardTodayScheduleArgs
>;

/**
 * Builds the shop-timezone date-only range for dashboard schedule queries.
 *
 * @param date - Instant within the desired shop operational day.
 * @returns Inclusive start and exclusive end boundaries for a date-only field.
 */
export function getDashboardDateOnlyRange(date: Date): DashboardDateOnlyRange {
  return getShopDateOnlyRange(date);
}

/**
 * Returns a copy of a dashboard date moved forward by whole date-only days.
 *
 * @param date - The source date to copy.
 * @param days - Number of UTC date-only calendar days to add.
 * @returns A new Date offset by the requested number of days.
 */
export function addDashboardDays(date: Date, days: number) {
  return addUtcDateOnlyDays(date, days);
}

/**
 * Counts official scheduled items within a dashboard date range.
 *
 * @param dateRange - Date-only range to match against `ScheduleItem.date`.
 * @returns The number of scheduled items in the provided range.
 */
export async function getScheduledItemCountForDateRange(
  dateRange: DashboardDateOnlyRange,
) {
  return db.scheduleItem.count({
    where: buildScheduledItemDateWhere(dateRange),
  });
}

/**
 * Counts official scheduled items that do not have staff assignments.
 *
 * @returns The number of scheduled activities without assignments.
 */
export async function getUnassignedScheduledItemCount() {
  return db.scheduleItem.count({
    where: {
      bookingRequest: {
        status: BookingStatus.SCHEDULED,
      },
      assignments: {
        none: {},
      },
    },
  });
}

/**
 * Counts official scheduled items assigned to a specific staff user.
 *
 * @param userId - The assigned staff user's ID.
 * @returns The number of scheduled items assigned to the user.
 */
export async function getAssignedScheduledItemCount(userId: string) {
  return db.scheduleItem.count({
    where: buildAssignedScheduledItemWhere(userId),
  });
}

/**
 * Counts official scheduled items assigned to a user within a date range.
 *
 * @param userId - The assigned staff user's ID.
 * @param dateRange - Date-only range to match against `ScheduleItem.date`.
 * @returns The number of assigned scheduled items in the provided range.
 */
export async function getAssignedScheduledItemCountForDateRange(
  userId: string,
  dateRange: DashboardDateOnlyRange,
) {
  return db.scheduleItem.count({
    where: buildAssignedScheduledItemDateWhere(userId, dateRange),
  });
}

/**
 * Returns upcoming unassigned schedule rows for the dashboard attention section.
 *
 * @param startDate - Earliest schedule date to include.
 * @param limit - Maximum number of schedule rows to return.
 * @returns Unassigned official scheduled items ordered by date and time.
 */
export async function getUnassignedDashboardScheduleItemsFromDate(
  startDate: Date,
  limit: number,
): Promise<DashboardScheduleAttentionRecord[]> {
  return db.scheduleItem.findMany({
    ...dashboardScheduleAttentionArgs,
    where: {
      bookingRequest: {
        status: BookingStatus.SCHEDULED,
      },
      date: {
        gte: startDate,
      },
      assignments: {
        none: {},
      },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  });
}

/**
 * Returns today's global schedule rows for Admin and Manager dashboards.
 *
 * @param dateRange - Date-only range that defines today.
 * @param limit - Maximum number of schedule rows to return.
 * @returns Official scheduled items ordered by date and time.
 */
export async function getTodaysDashboardScheduleItemsForOperations(
  dateRange: DashboardDateOnlyRange,
  limit: number,
): Promise<DashboardTodayScheduleRecord[]> {
  return getTodaysDashboardScheduleItems(buildScheduledItemDateWhere(dateRange), limit);
}

/**
 * Returns today's owner-scoped schedule rows for a Customer Service dashboard.
 *
 * @param userId - The Customer Service user who created the bookings.
 * @param dateRange - Date-only range that defines today.
 * @param limit - Maximum number of schedule rows to return.
 * @returns Official owner-scoped scheduled items ordered by date and time.
 */
export async function getTodaysDashboardScheduleItemsForCustomerService(
  userId: string,
  dateRange: DashboardDateOnlyRange,
  limit: number,
): Promise<DashboardTodayScheduleRecord[]> {
  return getTodaysDashboardScheduleItems(
    {
      bookingRequest: {
        status: BookingStatus.SCHEDULED,
        createdById: userId,
      },
      date: {
        gte: dateRange.start,
        lt: dateRange.end,
      },
    },
    limit,
  );
}

/**
 * Returns today's assigned schedule rows for an Instructor dashboard.
 *
 * @param userId - The assigned instructor user's ID.
 * @param dateRange - Date-only range that defines today.
 * @param limit - Maximum number of schedule rows to return.
 * @returns Official assigned scheduled items ordered by date and time.
 */
export async function getTodaysDashboardScheduleItemsForInstructor(
  userId: string,
  dateRange: DashboardDateOnlyRange,
  limit: number,
): Promise<DashboardTodayScheduleRecord[]> {
  return getTodaysDashboardScheduleItems(
    buildAssignedScheduledItemDateWhere(userId, dateRange),
    limit,
  );
}

/**
 * Reads today's schedule rows using a caller-provided visibility-safe predicate.
 *
 * @param where - Schedule item predicate containing role visibility rules.
 * @param limit - Maximum number of schedule rows to return.
 * @returns Official scheduled items ordered by date and time.
 */
async function getTodaysDashboardScheduleItems(
  where: Prisma.ScheduleItemWhereInput,
  limit: number,
): Promise<DashboardTodayScheduleRecord[]> {
  return db.scheduleItem.findMany({
    ...dashboardTodayScheduleArgs,
    where,
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  });
}

/**
 * Builds an official scheduled-item predicate for a date range.
 *
 * @param dateRange - Date-only range to match against `ScheduleItem.date`.
 * @returns A Prisma filter limited to scheduled bookings in the date range.
 */
function buildScheduledItemDateWhere(
  dateRange: DashboardDateOnlyRange,
): Prisma.ScheduleItemWhereInput {
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
 * Builds an official scheduled-item predicate scoped to one assigned user.
 *
 * @param userId - The assigned staff user's ID.
 * @returns A Prisma filter limited to scheduled bookings assigned to the user.
 */
function buildAssignedScheduledItemWhere(
  userId: string,
): Prisma.ScheduleItemWhereInput {
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
 * Builds an assigned scheduled-item predicate scoped to a date range.
 *
 * @param userId - The assigned staff user's ID.
 * @param dateRange - Date-only range to match against `ScheduleItem.date`.
 * @returns A Prisma filter scoped by scheduled status, assignment, and date.
 */
function buildAssignedScheduledItemDateWhere(
  userId: string,
  dateRange: DashboardDateOnlyRange,
): Prisma.ScheduleItemWhereInput {
  return {
    ...buildAssignedScheduledItemWhere(userId),
    date: {
      gte: dateRange.start,
      lt: dateRange.end,
    },
  };
}
