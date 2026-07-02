/**
 * Purpose: Server-only role-aware queries for the operational dashboard page.
 *
 * @module features/dashboard/queries
 */

import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import {
  BookingCustomerRole,
  BookingStatus,
  UserRole,
} from '@/generated/prisma/enums';
import { formatEnumLabel } from '@/lib/format';
import { db } from '@/lib/db';
import type { CurrentUser } from '@/lib/current-user';
import { formatScheduleActivityLabel } from '@/features/schedule/utils';
import type {
  AdminDashboardSummary,
  CustomerServiceDashboardSummary,
  DashboardNeedsAttentionItem,
  DashboardOverview,
  DashboardRecentActivityItem,
  DashboardScheduleAssignment,
  DashboardScheduleItem,
  DashboardSummary,
  EmptyDashboardSummary,
  InstructorDashboardSummary,
} from './types';

export type {
  AdminDashboardSummary,
  CustomerServiceDashboardSummary,
  DashboardNeedsAttentionItem,
  DashboardOverview,
  DashboardRecentActivityItem,
  DashboardScheduleAssignment,
  DashboardScheduleItem,
  DashboardSummary,
  EmptyDashboardSummary,
  InstructorDashboardSummary,
} from './types';

const NEEDS_ATTENTION_BOOKING_LIMIT = 8;
const NEEDS_ATTENTION_UNASSIGNED_LIMIT = 4;
const TODAY_SCHEDULE_LIMIT = 12;
const RECENT_ACTIVITY_LIMIT = 8;

const dashboardBookingArgs = {
  select: {
    id: true,
    status: true,
    activityType: true,
    requestedDate: true,
    requestedTime: true,
    numberOfPeople: true,
    needsMoreInfoReason: true,
    updatedAt: true,
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
} satisfies Prisma.BookingRequestDefaultArgs;

const dashboardScheduleItemArgs = {
  select: {
    id: true,
    bookingRequestId: true,
    date: true,
    startTime: true,
    activityType: true,
    updatedAt: true,
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
        status: true,
        activityType: true,
        numberOfPeople: true,
        updatedAt: true,
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

type DashboardBooking = Prisma.BookingRequestGetPayload<
  typeof dashboardBookingArgs
>;

type DashboardScheduleItemRecord = Prisma.ScheduleItemGetPayload<
  typeof dashboardScheduleItemArgs
>;

type DateOnlyRange = {
  start: Date;
  end: Date;
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
  if (isOperationsUser(currentUser)) {
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
  if (!isOperationsUser(currentUser)) {
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

/**
 * Returns role-scoped dashboard rows that require operational attention.
 *
 * @param currentUser - The authenticated user whose role scopes the result.
 * @returns Booking and unassigned schedule items that should be reviewed soon.
 */
export async function getNeedsAttentionItems(
  currentUser: CurrentUser,
): Promise<DashboardNeedsAttentionItem[]> {
  if (isOperationsUser(currentUser)) {
    const todayRange = getDateOnlyRange(new Date());
    const [bookings, unassignedScheduleItems] = await Promise.all([
      db.bookingRequest.findMany({
        ...dashboardBookingArgs,
        where: {
          status: {
            in: [BookingStatus.PENDING_APPROVAL, BookingStatus.NEEDS_MORE_INFO],
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: NEEDS_ATTENTION_BOOKING_LIMIT,
      }),
      db.scheduleItem.findMany({
        ...dashboardScheduleItemArgs,
        where: {
          bookingRequest: {
            status: BookingStatus.SCHEDULED,
          },
          date: {
            gte: todayRange.start,
          },
          assignments: {
            none: {},
          },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
        take: NEEDS_ATTENTION_UNASSIGNED_LIMIT,
      }),
    ]);

    return [
      ...bookings.map(mapBookingToNeedsAttentionItem),
      ...unassignedScheduleItems.map(mapScheduleItemToNeedsAttentionItem),
    ];
  }

  if (currentUser.role === UserRole.CUSTOMER_SERVICE) {
    const bookings = await db.bookingRequest.findMany({
      ...dashboardBookingArgs,
      where: {
        createdById: currentUser.id,
        status: {
          in: [
            BookingStatus.NEEDS_MORE_INFO,
            BookingStatus.DRAFT,
            BookingStatus.PENDING_APPROVAL,
          ],
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: NEEDS_ATTENTION_BOOKING_LIMIT,
    });

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
  const todayRange = getDateOnlyRange(new Date());
  const where = buildDashboardScheduleWhere(currentUser, todayRange);

  if (!where) {
    return [];
  }

  const scheduleItems = await db.scheduleItem.findMany({
    ...dashboardScheduleItemArgs,
    where,
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
    take: TODAY_SCHEDULE_LIMIT,
  });

  return scheduleItems.map(mapScheduleItemToDashboardScheduleItem);
}

/**
 * Returns simple recent activity rows from the best available current source.
 *
 * @param currentUser - The authenticated user whose role scopes activity rows.
 * @returns Recent booking activity labels derived from recently updated bookings.
 */
export async function getRecentDashboardActivity(
  currentUser: CurrentUser,
): Promise<DashboardRecentActivityItem[]> {
  const where = buildRecentActivityWhere(currentUser);

  if (!where) {
    return [];
  }

  const bookings = await db.bookingRequest.findMany({
    ...dashboardBookingArgs,
    where,
    orderBy: [{ updatedAt: 'desc' }],
    take: RECENT_ACTIVITY_LIMIT,
  });

  return bookings.map(mapBookingToRecentActivityItem);
}

/**
 * Checks whether a user can see global operational dashboard data.
 *
 * @param currentUser - The user role to inspect.
 * @returns True for Admin and Manager users.
 */
function isOperationsUser(currentUser: Pick<CurrentUser, 'role'>) {
  return (
    currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER
  );
}

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
function buildScheduledItemDateWhere(
  dateRange: DateOnlyRange,
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
 * Builds a scheduled-item count filter scoped to one assigned staff user.
 *
 * @param userId - The staff user ID that must appear in schedule assignments.
 * @returns A Prisma where object limited to official scheduled assigned items.
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
 * Builds an assigned scheduled-item count filter for a specific date range.
 *
 * @param userId - The staff user ID that must appear in schedule assignments.
 * @param dateRange - The date range to match against `ScheduleItem.date`.
 * @returns A Prisma where object scoped by scheduled status, assignment, and date.
 */
function buildAssignedScheduledItemDateWhere(
  userId: string,
  dateRange: DateOnlyRange,
): Prisma.ScheduleItemWhereInput {
  return {
    ...buildAssignedScheduledItemWhere(userId),
    date: {
      gte: dateRange.start,
      lt: dateRange.end,
    },
  };
}

/**
 * Builds today's schedule visibility filter for the dashboard.
 *
 * @param currentUser - The authenticated user whose role scopes schedule rows.
 * @param dateRange - The date-only range that defines today.
 * @returns A Prisma where object, or null for unsupported roles.
 */
function buildDashboardScheduleWhere(
  currentUser: Pick<CurrentUser, 'id' | 'role'>,
  dateRange: DateOnlyRange,
): Prisma.ScheduleItemWhereInput | null {
  const where = buildScheduledItemDateWhere(dateRange);

  if (isOperationsUser(currentUser)) {
    return where;
  }

  if (currentUser.role === UserRole.CUSTOMER_SERVICE) {
    return {
      bookingRequest: {
        status: BookingStatus.SCHEDULED,
        createdById: currentUser.id,
      },
      date: {
        gte: dateRange.start,
        lt: dateRange.end,
      },
    };
  }

  if (currentUser.role === UserRole.INSTRUCTOR) {
    return {
      ...where,
      assignments: {
        some: {
          userId: currentUser.id,
        },
      },
    };
  }

  return null;
}

/**
 * Builds the role-safe recent activity booking filter.
 *
 * @param currentUser - The authenticated user whose role scopes activity rows.
 * @returns A Prisma booking filter, or null for unsupported roles.
 */
function buildRecentActivityWhere(
  currentUser: Pick<CurrentUser, 'id' | 'role'>,
): Prisma.BookingRequestWhereInput | null {
  if (isOperationsUser(currentUser)) {
    return {};
  }

  if (currentUser.role === UserRole.CUSTOMER_SERVICE) {
    return {
      createdById: currentUser.id,
    };
  }

  if (currentUser.role === UserRole.INSTRUCTOR) {
    return {
      status: BookingStatus.SCHEDULED,
      scheduleItem: {
        is: {
          assignments: {
            some: {
              userId: currentUser.id,
            },
          },
        },
      },
    };
  }

  return null;
}

/**
 * Maps a booking row into a dashboard needs-attention item.
 *
 * @param booking - The selected booking request and compact relations.
 * @returns A display-ready attention item for booking workflow queues.
 */
function mapBookingToNeedsAttentionItem(
  booking: DashboardBooking,
): DashboardNeedsAttentionItem {
  return {
    id: `booking-${booking.id}`,
    kind: 'booking',
    label: getNeedsAttentionBookingLabel(booking.status),
    bookingId: booking.id,
    scheduleItemId: null,
    status: booking.status,
    activitySummary: summarizeActivities(booking.activities, booking.activityType),
    primaryCustomerName: getPrimaryCustomerName(booking.customers),
    detail: getNeedsAttentionBookingDetail(booking),
    date: booking.requestedDate,
    updatedAt: booking.updatedAt,
  };
}

/**
 * Maps an unassigned schedule row into a dashboard needs-attention item.
 *
 * @param scheduleItem - The selected schedule row and compact relations.
 * @returns A display-ready attention item for unassigned scheduled activities.
 */
function mapScheduleItemToNeedsAttentionItem(
  scheduleItem: DashboardScheduleItemRecord,
): DashboardNeedsAttentionItem {
  return {
    id: `schedule-${scheduleItem.id}`,
    kind: 'schedule',
    label: 'scheduled activity needs staff assignment',
    bookingId: scheduleItem.bookingRequestId,
    scheduleItemId: scheduleItem.id,
    status: scheduleItem.bookingRequest.status,
    activitySummary: summarizeActivities(
      scheduleItem.bookingRequest.activities,
      scheduleItem.activityType,
    ),
    primaryCustomerName: getPrimaryCustomerName(
      scheduleItem.bookingRequest.customers,
    ),
    detail: scheduleItem.startTime?.trim() || 'TBD',
    date: scheduleItem.date,
    updatedAt: scheduleItem.updatedAt,
  };
}

/**
 * Maps a schedule row into the compact dashboard schedule shape.
 *
 * @param scheduleItem - The selected schedule row and compact relations.
 * @returns A dashboard-friendly schedule item without raw Prisma nesting.
 */
function mapScheduleItemToDashboardScheduleItem(
  scheduleItem: DashboardScheduleItemRecord,
): DashboardScheduleItem {
  const booking = scheduleItem.bookingRequest;
  const startTime = scheduleItem.startTime?.trim() || null;
  const assignments = mapDashboardScheduleAssignments(scheduleItem.assignments);

  return {
    scheduleItemId: scheduleItem.id,
    bookingId: booking.id,
    date: scheduleItem.date,
    startTime,
    isTimeTbd: startTime === null,
    activityType: scheduleItem.activityType,
    activityLabel: formatScheduleActivityLabel(scheduleItem.activityType),
    activitySummary: summarizeActivities(booking.activities, scheduleItem.activityType),
    primaryCustomerName: getPrimaryCustomerName(booking.customers),
    customers: mapDashboardScheduleCustomers(booking.customers),
    numberOfPeople: booking.numberOfPeople,
    hotel: getScheduleHotel(booking.customers),
    assignments,
    assignedStaffNames: assignments.map((assignment) => assignment.user.name),
    isUnassigned: assignments.length === 0,
  };
}

/**
 * Maps a booking row into a recent dashboard activity item.
 *
 * @param booking - The selected booking request and compact relations.
 * @returns A simple activity item derived from the booking's current status.
 */
function mapBookingToRecentActivityItem(
  booking: DashboardBooking,
): DashboardRecentActivityItem {
  return {
    id: `activity-${booking.id}`,
    bookingId: booking.id,
    label: getRecentActivityLabel(booking.status),
    status: booking.status,
    occurredAt: booking.updatedAt,
    activitySummary: summarizeActivities(booking.activities, booking.activityType),
    primaryCustomerName: getPrimaryCustomerName(booking.customers),
  };
}

/**
 * Maps selected assignment rows into dashboard-safe assignment details.
 *
 * @param assignments - Assignment rows selected with a schedule item.
 * @returns Staff assignment details safe for dashboard display.
 */
function mapDashboardScheduleAssignments(
  assignments: DashboardScheduleItemRecord['assignments'],
): DashboardScheduleAssignment[] {
  return assignments.map((assignment) => ({
    id: assignment.id,
    userId: assignment.userId,
    role: assignment.role,
    user: {
      id: assignment.user.id,
      name: assignment.user.name,
      email: assignment.user.email,
      role: assignment.user.role,
    },
  }));
}

/**
 * Maps booking customer links into compact dashboard customer rows.
 *
 * @param customers - Booking customer rows selected through a schedule item.
 * @returns Customer/diver rows in query order with safe display names.
 */
function mapDashboardScheduleCustomers(
  customers: DashboardScheduleItemRecord['bookingRequest']['customers'],
) {
  return customers.map((bookingCustomer) => ({
    name: formatCustomerDisplayName(bookingCustomer.customer),
    chineseName: bookingCustomer.customer.chineseName?.trim() || null,
    isPrimaryContact:
      bookingCustomer.role === BookingCustomerRole.PRIMARY_CONTACT,
    role: bookingCustomer.role,
  }));
}

/**
 * Summarizes the activity list for compact dashboard display.
 *
 * @param activities - Ordered activity rows selected with a booking or schedule.
 * @param fallbackActivityType - The booking or schedule activity used as fallback.
 * @returns A compact activity summary.
 */
function summarizeActivities(
  activities: Array<{ activityType: DashboardScheduleItem['activityType'] | null }>,
  fallbackActivityType: DashboardScheduleItem['activityType'] | null,
) {
  const labels = activities
    .map((activity) =>
      activity.activityType
        ? formatScheduleActivityLabel(activity.activityType)
        : null,
    )
    .filter((label): label is string => label !== null);

  if (labels.length === 0) {
    return fallbackActivityType
      ? formatScheduleActivityLabel(fallbackActivityType)
      : formatEnumLabel(null);
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} + ${labels[1]}`;
  }

  return `${labels[0]} + ${labels.length - 1} more`;
}

/**
 * Returns the primary contact name for compact dashboard display.
 *
 * @param customers - Booking customer rows ordered by creation time.
 * @returns Primary contact name, first customer name, or null.
 */
function getPrimaryCustomerName(
  customers: Array<{
    role: BookingCustomerRole;
    customer: {
      fullName: string | null;
      firstName: string | null;
      lastName: string | null;
      chineseName: string | null;
    };
  }>,
) {
  const displayCustomer =
    customers.find(
      (bookingCustomer) =>
        bookingCustomer.role === BookingCustomerRole.PRIMARY_CONTACT,
    ) ?? customers[0];

  return displayCustomer
    ? formatCustomerName(displayCustomer.customer)
    : null;
}

/**
 * Returns the best available hotel for a scheduled booking.
 *
 * @param customers - Booking customer rows selected through a schedule item.
 * @returns Hotel-at-booking, customer hotel, or null.
 */
function getScheduleHotel(
  customers: DashboardScheduleItemRecord['bookingRequest']['customers'],
) {
  const displayCustomer =
    customers.find(
      (bookingCustomer) =>
        bookingCustomer.role === BookingCustomerRole.PRIMARY_CONTACT,
    ) ?? customers[0];

  return (
    displayCustomer?.hotelAtBooking?.trim() ||
    displayCustomer?.customer.hotel?.trim() ||
    null
  );
}

/**
 * Formats a customer name for compact dashboard display.
 *
 * @param customer - Customer name fields selected from the booking relation.
 * @returns English name, Chinese name, or null.
 */
function formatCustomerName(customer: {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  chineseName: string | null;
}) {
  const englishName = formatCustomerEnglishName(customer);
  const chineseName = customer.chineseName?.trim();

  return englishName || chineseName || null;
}

/**
 * Formats a customer name for detailed dashboard customer/diver lists.
 *
 * @param customer - Customer name fields selected from the booking relation.
 * @returns English and Chinese names together, Chinese-only, or a safe fallback.
 */
function formatCustomerDisplayName(customer: {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  chineseName: string | null;
}) {
  const englishName = formatCustomerEnglishName(customer);
  const chineseName = customer.chineseName?.trim();

  if (englishName && chineseName) {
    return `${englishName} / ${chineseName}`;
  }

  return englishName || chineseName || 'Unnamed customer';
}

/**
 * Formats the English portion of a customer name.
 *
 * @param customer - Customer name fields selected from the booking relation.
 * @returns Full name, first/last name, or null when no English name is available.
 */
function formatCustomerEnglishName(customer: {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  const fullName = customer.fullName?.trim();
  if (fullName) {
    return fullName;
  }

  const name = [customer.firstName, customer.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .trim();

  return name || null;
}

/**
 * Returns the operational label for a booking attention item.
 *
 * @param status - Current booking workflow status.
 * @returns A short dashboard label.
 */
function getNeedsAttentionBookingLabel(status: BookingStatus) {
  if (status === BookingStatus.PENDING_APPROVAL) {
    return 'booking pending approval';
  }

  if (status === BookingStatus.NEEDS_MORE_INFO) {
    return 'booking needs more information';
  }

  if (status === BookingStatus.DRAFT) {
    return 'draft booking not submitted';
  }

  return 'booking needs attention';
}

/**
 * Returns compact extra detail for a booking attention item.
 *
 * @param booking - The booking row being mapped.
 * @returns Needs-more-info reason, requested time, or null.
 */
function getNeedsAttentionBookingDetail(booking: DashboardBooking) {
  if (booking.status === BookingStatus.NEEDS_MORE_INFO) {
    return booking.needsMoreInfoReason?.trim() || null;
  }

  return booking.requestedTime?.trim() || null;
}

/**
 * Returns the simple recent activity label for a booking status.
 *
 * @param status - Current booking workflow status.
 * @returns A short activity label for dashboard display.
 */
function getRecentActivityLabel(status: BookingStatus) {
  if (status === BookingStatus.PENDING_APPROVAL) {
    return 'booking submitted for approval';
  }

  if (status === BookingStatus.NEEDS_MORE_INFO) {
    return 'more information requested';
  }

  if (status === BookingStatus.SCHEDULED) {
    return 'booking approved and scheduled';
  }

  return 'booking updated';
}
