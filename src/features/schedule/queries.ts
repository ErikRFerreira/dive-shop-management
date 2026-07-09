/**
 * Purpose: Server-only queries for the internal schedule page.
 *
 * @module features/schedule/queries
 */

import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import {
  BookingCustomerRole,
  BookingStatus,
  ScheduleTimeSlot,
  UserRole,
} from '@/generated/prisma/enums';
import {
  getActiveBookingParticipants,
  getActiveParticipantCount,
  getPrimaryActiveBookingCustomer,
} from '@/features/bookings/participants';
import { getActivityShortLabel } from '@/features/bookings/activity-utils';
import { db } from '@/lib/db';
import type { CurrentUser } from '@/lib/current-user';
import { formatDateInputValue, formatEnumLabel } from '@/lib/format';
import { getShopDateOnlyRange } from '@/lib/operational-date';
import { getScheduleDateRangeForFilter } from './date-ranges';
import { getActivityTypesForScheduleType } from './filters';
import { canViewMyScheduleAssignments } from './permissions';
import type {
  AssignableStaff,
  MyScheduleAssignment,
  MyScheduleAssignmentBriefing,
  ScheduleAssignmentDetail,
  ScheduleCalendarEvent,
  ScheduleFilters,
  SchedulePageItem,
} from './types';
import {
  buildScheduleEventTitle,
  formatScheduleActivityLabel,
  formatScheduleDayLabel,
  getScheduleTimeSlotLabel,
} from './utils';

const MY_ASSIGNMENTS_UPCOMING_LIMIT = 20;
const scheduleAssignmentOrderBy = [
  { date: 'asc' },
  { timeSlot: 'asc' },
  { createdAt: 'asc' },
] satisfies Prisma.ScheduleItemOrderByWithRelationInput[];

const schedulePageItemArgs = {
  select: {
    id: true,
    bookingRequestId: true,
    date: true,
    startTime: true,
    timeSlot: true,
    activityType: true,
    dayNumber: true,
    totalDays: true,
    scheduleNotes: true,
    createdAt: true,
    bookingActivity: {
      select: {
        id: true,
        activityType: true,
        specialtyCourse: true,
        requestedDate: true,
        requestedTime: true,
        requestedTimeSlot: true,
        notes: true,
      },
    },
    assignments: {
      select: {
        id: true,
        userId: true,
        role: true,
        notes: true,
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
        createdById: true,
        source: true,
        referrerName: true,
        endAt: true,
        internalNotes: true,
        activities: {
          select: {
            id: true,
            activityType: true,
            specialtyCourse: true,
            requestedDate: true,
            requestedTime: true,
            requestedTimeSlot: true,
            notes: true,
            sortOrder: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        customers: {
          select: {
            role: true,
            participationStatus: true,
            hotelAtBooking: true,
            createdAt: true,
            customer: {
              select: {
                fullName: true,
                chineseName: true,
                firstName: true,
                lastName: true,
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

type ScheduleItemForSchedulePage = Prisma.ScheduleItemGetPayload<
  typeof schedulePageItemArgs
>;

const myScheduleAssignmentArgs = {
  select: {
    id: true,
    bookingRequestId: true,
    date: true,
    startTime: true,
    timeSlot: true,
    activityType: true,
    dayNumber: true,
    totalDays: true,
    scheduleNotes: true,
    createdAt: true,
    bookingActivity: {
      select: {
        id: true,
        activityType: true,
        specialtyCourse: true,
        requestedDate: true,
        requestedTime: true,
        requestedTimeSlot: true,
        notes: true,
      },
    },
    assignments: {
      select: {
        id: true,
        userId: true,
        role: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
    bookingRequest: {
      select: {
        id: true,
        status: true,
        endAt: true,
        activities: {
          select: {
            id: true,
            activityType: true,
            specialtyCourse: true,
            requestedDate: true,
            requestedTime: true,
            requestedTimeSlot: true,
            notes: true,
            sortOrder: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        customers: {
          select: {
            role: true,
            participationStatus: true,
            hotelAtBooking: true,
            createdAt: true,
            customer: {
              select: {
                fullName: true,
                chineseName: true,
                firstName: true,
                lastName: true,
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

type ScheduleItemForMyAssignments = Prisma.ScheduleItemGetPayload<
  typeof myScheduleAssignmentArgs
>;

/**
 * Returns active staff users who can be assigned to scheduled activities.
 *
 * @returns Active instructor and divemaster users sorted for picker display.
 */
export async function getAssignableStaff(): Promise<AssignableStaff[]> {
  return db.user.findMany({
    where: {
      isActive: true,
      role: {
        in: [UserRole.INSTRUCTOR, UserRole.DIVEMASTER],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  });
}

/**
 * Builds the schedule-page visibility filter for the current user.
 *
 * @param currentUser - The authenticated user whose role scopes visibility.
 * @param filters - Optional schedule filters to apply after visibility rules.
 * @returns A ScheduleItem filter that always requires an official scheduled
 * booking, scopes Customer Service users to bookings they created, and lets
 * instructors view the full internal schedule.
 */
export function buildSchedulePageWhere(
  currentUser: Pick<CurrentUser, 'id' | 'role'>,
  filters: ScheduleFilters = {},
): Prisma.ScheduleItemWhereInput {
  const bookingRequest: Prisma.BookingRequestWhereInput = {
    status: BookingStatus.SCHEDULED,
  };
  const where: Prisma.ScheduleItemWhereInput = { bookingRequest };

  if (currentUser.role === UserRole.CUSTOMER_SERVICE) {
    bookingRequest.createdById = currentUser.id;
  } else if (
    currentUser.role !== UserRole.ADMIN &&
    currentUser.role !== UserRole.MANAGER &&
    currentUser.role !== UserRole.INSTRUCTOR
  ) {
    where.id = { in: [] };
  }

  return applyScheduleFiltersToWhere(where, filters);
}

/**
 * Adds schedule filter predicates to an existing visibility-safe where clause.
 *
 * @param where - Base ScheduleItem predicate containing role visibility rules.
 * @param filters - Optional filters parsed from the schedule URL.
 * @returns The same ScheduleItem predicate with filter conditions included.
 */
function applyScheduleFiltersToWhere(
  where: Prisma.ScheduleItemWhereInput,
  filters: ScheduleFilters,
): Prisma.ScheduleItemWhereInput {
  const dateRange = getScheduleDateRangeForFilter(filters.range);
  const andFilters: Prisma.ScheduleItemWhereInput[] = [];

  if (dateRange) {
    where.date = {
      gte: dateRange.start,
      lt: dateRange.end,
    };
  }

  if (filters.staffId) {
    andFilters.push({
      assignments: {
        some: {
          userId: filters.staffId,
        },
      },
    });
  }

  if (filters.unassignedOnly) {
    andFilters.push({
      assignments: {
        none: {},
      },
    });
  }

  if (filters.scheduleType) {
    andFilters.push(
      buildActivityTypeFilter(
        getActivityTypesForScheduleType(filters.scheduleType),
      ),
    );
  }

  if (filters.activityType) {
    andFilters.push(buildActivityTypeFilter([filters.activityType]));
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  return where;
}

/**
 * Builds a predicate that matches ScheduleItem activity type or child booking activities.
 *
 * @param activityTypes - Exact activity types that should remain visible.
 * @returns Prisma where input for activity matching across schedule and booking rows.
 */
function buildActivityTypeFilter(
  activityTypes: ReturnType<typeof getActivityTypesForScheduleType>,
): Prisma.ScheduleItemWhereInput {
  return {
    OR: [
      {
        activityType: {
          in: activityTypes,
        },
      },
      {
        bookingRequest: {
          activities: {
            some: {
              activityType: {
                in: activityTypes,
              },
            },
          },
        },
      },
    ],
  };
}

/**
 * Returns official scheduled bookings for the simple schedule page.
 *
 * This query reads ScheduleItem rows and requires the related BookingRequest to
 * have status `SCHEDULED`, intentionally excluding draft, pending approval,
 * needs-more-info, approved-but-unscheduled, and cancelled booking records. The
 * status filter also prevents stale ScheduleItem rows from appearing if a
 * booking is no longer official schedule material.
 *
 * @param currentUser - The authenticated user whose role scopes visibility.
 * @returns Schedule rows shaped for the grouped list UI.
 */
export async function getScheduledBookingsForSchedulePage(
  currentUser: CurrentUser,
): Promise<SchedulePageItem[]> {
  const scheduleItems = await db.scheduleItem.findMany({
    ...schedulePageItemArgs,
    where: buildSchedulePageWhere(currentUser),
    orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }, { createdAt: 'asc' }],
  });

  return scheduleItems.map(mapScheduleItemForSchedulePage);
}

/**
 * Returns official scheduled bookings mapped for the future schedule calendar UI.
 *
 * The query intentionally uses the same official schedule filter as the simple
 * list view: a row must be a ScheduleItem whose related BookingRequest has
 * status `SCHEDULED`. Draft, pending approval, needs-more-info, approved-only,
 * and cancelled bookings are excluded.
 *
 * @param currentUser - The authenticated user whose role scopes visibility.
 * @param filters - Optional schedule filters parsed from URL search params.
 * @returns Schedule rows mapped into feature-specific calendar event objects.
 */
export async function getScheduleItemsForCalendar(
  currentUser: CurrentUser,
  filters: ScheduleFilters = {},
): Promise<ScheduleCalendarEvent[]> {
  const scheduleItems = await db.scheduleItem.findMany({
    ...schedulePageItemArgs,
    where: buildSchedulePageWhere(currentUser, filters),
    orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }, { createdAt: 'asc' }],
  });

  return mapScheduleItemsToCalendarEvents(scheduleItems);
}

/**
 * Returns official scheduled items assigned to the current staff user.
 *
 * The current user's id is always used as the assignment predicate, so callers
 * cannot request another instructor or divemaster's personal assignment list.
 * Only `SCHEDULED` booking requests are included.
 *
 * @param currentUser - The authenticated user whose assignments are requested.
 * @returns Read-only assignment rows for the future My Assignments page.
 */
export async function getMyScheduleAssignments(
  currentUser: CurrentUser,
): Promise<MyScheduleAssignment[]> {
  if (!canViewMyScheduleAssignments(currentUser)) {
    return [];
  }

  const scheduleItems = await db.scheduleItem.findMany({
    ...myScheduleAssignmentArgs,
    where: buildMyScheduleAssignmentsWhere(currentUser, {
      gte: getShopDateOnlyRange(new Date()).start,
    }),
    orderBy: scheduleAssignmentOrderBy,
  });

  return scheduleItems.map((scheduleItem) =>
    mapScheduleItemToMyScheduleAssignment(scheduleItem, currentUser.id),
  );
}

/**
 * Returns a bounded staff briefing for the current user's personal assignments.
 *
 * The briefing separates today and tomorrow from future work, excludes past
 * assignments, and caps the upcoming table so the page remains scalable for
 * instructors with many future scheduled activities.
 *
 * @param currentUser - The authenticated instructor or divemaster.
 * @returns Date-bucketed assignments plus summary counts for the briefing UI.
 */
export async function getMyScheduleAssignmentBriefing(
  currentUser: CurrentUser,
): Promise<MyScheduleAssignmentBriefing> {
  const emptyBriefing = createEmptyMyScheduleAssignmentBriefing();

  if (!canViewMyScheduleAssignments(currentUser)) {
    return emptyBriefing;
  }

  const todayRange = getShopDateOnlyRange(new Date());
  const tomorrowRange = getShopDateOnlyRange(new Date(), 1);
  const upcomingDateFilter: Prisma.DateTimeFilter<'ScheduleItem'> = {
    gte: tomorrowRange.end,
  };

  const [
    todayScheduleItems,
    tomorrowScheduleItems,
    upcomingScheduleItems,
    upcomingCount,
  ] = await Promise.all([
    db.scheduleItem.findMany({
      ...myScheduleAssignmentArgs,
      where: buildMyScheduleAssignmentsWhere(currentUser, {
        gte: todayRange.start,
        lt: todayRange.end,
      }),
      orderBy: scheduleAssignmentOrderBy,
    }),
    db.scheduleItem.findMany({
      ...myScheduleAssignmentArgs,
      where: buildMyScheduleAssignmentsWhere(currentUser, {
        gte: tomorrowRange.start,
        lt: tomorrowRange.end,
      }),
      orderBy: scheduleAssignmentOrderBy,
    }),
    db.scheduleItem.findMany({
      ...myScheduleAssignmentArgs,
      where: buildMyScheduleAssignmentsWhere(currentUser, upcomingDateFilter),
      orderBy: scheduleAssignmentOrderBy,
      take: MY_ASSIGNMENTS_UPCOMING_LIMIT,
    }),
    db.scheduleItem.count({
      where: buildMyScheduleAssignmentsWhere(currentUser, upcomingDateFilter),
    }),
  ]);

  const todayAssignments = mapScheduleItemsToMyScheduleAssignments(
    todayScheduleItems,
    currentUser.id,
  );
  const tomorrowAssignments = mapScheduleItemsToMyScheduleAssignments(
    tomorrowScheduleItems,
    currentUser.id,
  );
  const upcomingAssignments = mapScheduleItemsToMyScheduleAssignments(
    upcomingScheduleItems,
    currentUser.id,
  );
  const nextAssignment =
    todayAssignments[0] ?? tomorrowAssignments[0] ?? upcomingAssignments[0] ?? null;

  return {
    todayAssignments,
    tomorrowAssignments,
    upcomingAssignments,
    upcomingLimit: MY_ASSIGNMENTS_UPCOMING_LIMIT,
    summary: {
      todayCount: todayAssignments.length,
      tomorrowCount: tomorrowAssignments.length,
      upcomingCount,
      nextAssignment: nextAssignment
        ? {
            date: nextAssignment.date,
            activitySummary: nextAssignment.activitySummary,
          }
        : null,
    },
  };
}

/**
 * Maps a ScheduleItem with booking/customer relations into the UI shape.
 *
 * @param scheduleItem - The schedule item and selected booking relations.
 * @returns A compact row containing only the fields the schedule list renders.
 */
export function mapScheduleItemForSchedulePage(
  scheduleItem: ScheduleItemForSchedulePage,
): SchedulePageItem {
  const booking = scheduleItem.bookingRequest;
  const timeSlot = scheduleItem.timeSlot ?? ScheduleTimeSlot.TBD;
  const displayBookingCustomer = getPrimaryActiveBookingCustomer(
    booking.customers,
  );

  return {
    scheduleItemId: scheduleItem.id,
    bookingId: booking.id,
    date: scheduleItem.date,
    timeSlot,
    startTime: scheduleItem.startTime,
    activityType: scheduleItem.activityType,
    activityLabel: formatScheduleActivityLabel(scheduleItem.activityType),
    activitySummary: summarizeScheduleItemActivity(scheduleItem),
    dayNumber: scheduleItem.dayNumber,
    totalDays: scheduleItem.totalDays,
    dayLabel: formatScheduleDayLabel(
      scheduleItem.dayNumber,
      scheduleItem.totalDays,
    ),
    primaryCustomerName: formatCustomerName(
      displayBookingCustomer?.customer ?? null,
    ),
    numberOfPeople: getActiveParticipantCount(booking.customers),
    hotel:
      displayBookingCustomer?.hotelAtBooking?.trim() ||
      displayBookingCustomer?.customer.hotel?.trim() ||
      null,
    source: booking.source,
    referrerName: booking.referrerName,
    notes: scheduleItem.scheduleNotes ?? booking.internalNotes,
    assignments: mapScheduleAssignments(scheduleItem.assignments),
  };
}

/**
 * Maps schedule rows into event objects for the schedule calendar.
 *
 * @param scheduleItems - Schedule rows returned by the calendar query.
 * @returns Calendar events with timed/TBD state and booking details attached.
 */
export function mapScheduleItemsToCalendarEvents(
  scheduleItems: ScheduleItemForSchedulePage[],
): ScheduleCalendarEvent[] {
  return scheduleItems.map(mapScheduleItemToCalendarEvent);
}

/**
 * Maps one schedule row into a calendar event object.
 *
 * @param scheduleItem - The schedule item and selected booking relations.
 * @returns A feature-specific event with FullCalendar-compatible start/end
 * fields plus schedule booking metadata.
 */
function mapScheduleItemToCalendarEvent(
  scheduleItem: ScheduleItemForSchedulePage,
): ScheduleCalendarEvent {
  const booking = scheduleItem.bookingRequest;
  const timeSlot = scheduleItem.timeSlot ?? ScheduleTimeSlot.TBD;
  const displayBookingCustomer = getPrimaryActiveBookingCustomer(
    booking.customers,
  );
  const primaryCustomerName = formatCustomerName(
    displayBookingCustomer?.customer ?? null,
  );
  const dateKey = getCalendarDateKey(scheduleItem.date);
  const activityLabel = formatScheduleActivityLabel(scheduleItem.activityType);
  const activitySummary = summarizeScheduleItemActivity(scheduleItem);
  const dayLabel = formatScheduleDayLabel(
    scheduleItem.dayNumber,
    scheduleItem.totalDays,
  );
  const assignments = mapScheduleAssignments(scheduleItem.assignments);
  const slotTitlePrefix =
    timeSlot === ScheduleTimeSlot.TBD
      ? null
      : getScheduleTimeSlotLabel(timeSlot);

  return {
    id: scheduleItem.id,
    title: [
      slotTitlePrefix,
      buildScheduleCalendarEventTitle({
        activityLabel: activitySummary,
        assignments,
        customerName: primaryCustomerName,
        dayLabel,
        numberOfPeople: getActiveParticipantCount(booking.customers),
      }),
    ]
      .filter((part): part is string => Boolean(part))
      .join(' '),
    start: dateKey,
    end: null,
    allDay: true,
    bookingId: booking.id,
    bookingReference: booking.id,
    scheduleItemId: scheduleItem.id,
    date: scheduleItem.date,
    timeSlot,
    startTime: null,
    endTime: null,
    activityType: scheduleItem.activityType,
    activityLabel,
    activitySummary,
    dayNumber: scheduleItem.dayNumber,
    totalDays: scheduleItem.totalDays,
    dayLabel,
    activities: booking.activities.map((activity) => ({
      id: activity.id,
      activityType: activity.activityType,
      activityLabel: activity.activityType
        ? getActivityShortLabel(activity)
        : null,
      specialtyCourse: activity.specialtyCourse,
      requestedDate: activity.requestedDate,
      requestedTime: activity.requestedTime,
      requestedTimeSlot: activity.requestedTimeSlot ?? ScheduleTimeSlot.TBD,
      notes: activity.notes,
    })),
    primaryCustomerName,
    customers: mapBookingCustomersForDisplay(booking.customers),
    numberOfPeople: getActiveParticipantCount(booking.customers),
    hotel:
      displayBookingCustomer?.hotelAtBooking?.trim() ||
      displayBookingCustomer?.customer.hotel?.trim() ||
      null,
    source: booking.source,
    referrerName: booking.referrerName,
    notes: scheduleItem.scheduleNotes ?? booking.internalNotes,
    assignments,
    isTimeTbd: timeSlot === ScheduleTimeSlot.TBD,
  };
}

/**
 * Builds the visibility-safe predicate for the current user's assignments.
 *
 * @param currentUser - The authenticated user whose assignment rows are requested.
 * @returns A ScheduleItem filter requiring scheduled bookings and current-user assignment.
 */
function buildMyScheduleAssignmentsWhere(
  currentUser: Pick<CurrentUser, 'id'>,
  date?: Prisma.DateTimeFilter<'ScheduleItem'>,
): Prisma.ScheduleItemWhereInput {
  return {
    bookingRequest: {
      status: BookingStatus.SCHEDULED,
    },
    ...(date ? { date } : {}),
    assignments: {
      some: {
        userId: currentUser.id,
      },
    },
  };
}

/**
 * Creates an empty briefing payload for roles without personal assignment access.
 *
 * @returns Empty assignment buckets and zeroed summary counts.
 */
function createEmptyMyScheduleAssignmentBriefing(): MyScheduleAssignmentBriefing {
  return {
    todayAssignments: [],
    tomorrowAssignments: [],
    upcomingAssignments: [],
    upcomingLimit: MY_ASSIGNMENTS_UPCOMING_LIMIT,
    summary: {
      todayCount: 0,
      tomorrowCount: 0,
      upcomingCount: 0,
      nextAssignment: null,
    },
  };
}

/**
 * Maps selected schedule items into personal assignment rows for one user.
 *
 * @param scheduleItems - Schedule items fetched with My Assignments relations.
 * @param currentUserId - Authenticated user id used to resolve assignment role.
 * @returns Display-ready personal assignment rows in query order.
 */
function mapScheduleItemsToMyScheduleAssignments(
  scheduleItems: ScheduleItemForMyAssignments[],
  currentUserId: string,
) {
  return scheduleItems.map((scheduleItem) =>
    mapScheduleItemToMyScheduleAssignment(scheduleItem, currentUserId),
  );
}

/**
 * Maps one assigned schedule item into the My Assignments read model.
 *
 * @param scheduleItem - The selected schedule row and booking relations.
 * @param currentUserId - The authenticated user id used to find assignment role.
 * @returns Display-ready personal assignment details without booking internal notes.
 */
function mapScheduleItemToMyScheduleAssignment(
  scheduleItem: ScheduleItemForMyAssignments,
  currentUserId: string,
): MyScheduleAssignment {
  const booking = scheduleItem.bookingRequest;
  const timeSlot = scheduleItem.timeSlot ?? ScheduleTimeSlot.TBD;
  const displayBookingCustomer = getPrimaryActiveBookingCustomer(
    booking.customers,
  );
  const primaryCustomerName = formatCustomerName(
    displayBookingCustomer?.customer ?? null,
  );
  const currentUserAssignment = scheduleItem.assignments.find(
    (assignment) => assignment.userId === currentUserId,
  );

  if (!currentUserAssignment) {
    throw new Error('Assigned schedule item is missing current user assignment.');
  }

  return {
    scheduleItemId: scheduleItem.id,
    bookingId: booking.id,
    date: scheduleItem.date,
    timeSlot,
    startTime: null,
    endTime: null,
    isTimeTbd: timeSlot === ScheduleTimeSlot.TBD,
    activityType: scheduleItem.activityType,
    activityLabel: formatScheduleActivityLabel(scheduleItem.activityType),
    activitySummary: summarizeScheduleItemActivity(scheduleItem),
    dayNumber: scheduleItem.dayNumber,
    totalDays: scheduleItem.totalDays,
    dayLabel: formatScheduleDayLabel(
      scheduleItem.dayNumber,
      scheduleItem.totalDays,
    ),
    activities: booking.activities.map((activity) => ({
      id: activity.id,
      activityType: activity.activityType,
      activityLabel: activity.activityType
        ? getActivityShortLabel(activity)
        : null,
      specialtyCourse: activity.specialtyCourse,
      requestedDate: activity.requestedDate,
      requestedTime: activity.requestedTime,
      requestedTimeSlot: activity.requestedTimeSlot ?? ScheduleTimeSlot.TBD,
      notes: activity.notes,
    })),
    primaryCustomerName,
    customers: mapBookingCustomersForDisplay(booking.customers),
    numberOfPeople: getActiveParticipantCount(booking.customers),
    hotel:
      displayBookingCustomer?.hotelAtBooking?.trim() ||
      displayBookingCustomer?.customer.hotel?.trim() ||
      null,
    scheduleNotes: scheduleItem.scheduleNotes,
    assignmentRole: currentUserAssignment.role,
  };
}

/**
 * Maps selected assignment rows into the shared schedule assignment type.
 *
 * @param assignments - Assignment rows selected with each schedule item.
 * @returns Staff assignment details safe for schedule views and future controls.
 */
function mapScheduleAssignments(
  assignments: ScheduleItemForSchedulePage['assignments'],
): ScheduleAssignmentDetail[] {
  return assignments.map((assignment) => ({
    id: assignment.id,
    userId: assignment.userId,
    role: assignment.role,
    notes: assignment.notes,
    user: {
      id: assignment.user.id,
      name: assignment.user.name,
      email: assignment.user.email,
      role: assignment.user.role,
    },
  }));
}

/**
 * Maps active booking customer links into compact schedule customer display rows.
 *
 * @param customers - Booking customer rows selected with each schedule item.
 * @returns Active customer/diver rows in query order with safe display names.
 */
function mapBookingCustomersForDisplay(
  customers:
    | ScheduleItemForSchedulePage['bookingRequest']['customers']
    | ScheduleItemForMyAssignments['bookingRequest']['customers'],
) {
  return getActiveBookingParticipants(customers).map((bookingCustomer) => {
    const chineseName = bookingCustomer.customer.chineseName?.trim() || null;

    return {
      name: formatCustomerDisplayName(bookingCustomer.customer),
      chineseName,
      isPrimaryContact:
        bookingCustomer.role === BookingCustomerRole.PRIMARY_CONTACT,
      role: bookingCustomer.role,
    };
  });
}

/**
 * Formats a customer name for detailed schedule customer/diver lists.
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
 * Formats a customer name for display, falling back to first/last name if
 * fullName is not available.
 *
 * @param customer - The customer record to format.
 * @returns The formatted name, or null if no name is available.
 */
function formatCustomerName(
  customer: {
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
    chineseName?: string | null;
  } | null,
) {
  const englishName = formatCustomerEnglishName(customer);
  const chineseName = customer?.chineseName?.trim();

  return englishName || chineseName || null;
}

/**
 * Formats the English portion of a customer name.
 *
 * @param customer - Customer name fields selected from the booking relation.
 * @returns Full name, first/last name, or null when no English name is available.
 */
function formatCustomerEnglishName(
  customer: {
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null,
) {
  const fullName = customer?.fullName?.trim();
  if (fullName) {
    return fullName;
  }

  const name = [customer?.firstName, customer?.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .trim();

  return name || null;
}

/**
 * Builds a calendar event title that is useful across FullCalendar views.
 *
 * @param input - Event title ingredients derived from the schedule item.
 * @returns A compact operational title with staff, activity, active headcount, and customer.
 */
function buildScheduleCalendarEventTitle(input: {
  activityLabel: string;
  assignments: ScheduleAssignmentDetail[];
  customerName: string | null;
  dayLabel: string | null;
  numberOfPeople: number | null;
}) {
  return buildScheduleEventTitle({
    activityLabel: input.activityLabel,
    customerName: input.customerName,
    dayLabel: input.dayLabel,
    numberOfPeople: input.numberOfPeople,
    staffPrefix: buildScheduleStaffPrefix(input.assignments),
  });
}

/**
 * Builds the bracketed staff prefix for a schedule calendar event title.
 *
 * @param assignments - Staff assignments already mapped for schedule display.
 * @returns `[Unassigned]` or compact staff names in assignment order.
 */
function buildScheduleStaffPrefix(assignments: ScheduleAssignmentDetail[]) {
  if (assignments.length === 0) {
    return '[Unassigned]';
  }

  const staffNames = assignments.map(formatScheduleStaffName);

  return `[${staffNames.join('/')}]`;
}

/**
 * Formats one assigned staff member for compact calendar event titles.
 *
 * @param assignment - Staff assignment used to derive a safe display name.
 * @returns The staff first name, role label, or generic fallback.
 */
function formatScheduleStaffName(assignment: ScheduleAssignmentDetail) {
  const displayName = assignment.user.name.trim();
  const firstName = displayName.split(/\s+/)[0]?.trim();

  return firstName || formatEnumLabel(assignment.role) || 'Staff';
}

/**
 * Summarizes the stored booking activity list for a schedule event.
 *
 * @param activities - Ordered booking activities selected with the schedule row.
 * @param fallbackActivityType - Schedule item activity used when no activity
 * list is available.
 * @returns A compact activity summary for calendar titles and event metadata.
 */
function summarizeScheduleActivities(
  activities: ScheduleItemForSchedulePage['bookingRequest']['activities'],
  fallbackActivityType: ScheduleItemForSchedulePage['activityType'],
) {
  const labels = activities
    .map((activity) => (activity.activityType ? getActivityShortLabel(activity) : null))
    .filter((label): label is string => label !== null);

  if (labels.length === 0) {
    return formatScheduleActivityLabel(fallbackActivityType);
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
 * Summarizes the activity for one schedule row, preferring the linked activity.
 *
 * @param scheduleItem - Schedule row selected with booking and optional activity relations.
 * @returns A compact activity label for row-specific schedule displays.
 */
function summarizeScheduleItemActivity(
  scheduleItem: ScheduleItemForSchedulePage | ScheduleItemForMyAssignments,
) {
  if (scheduleItem.bookingActivity?.activityType) {
    return getActivityShortLabel(scheduleItem.bookingActivity);
  }

  return summarizeScheduleActivities(
    scheduleItem.bookingRequest.activities,
    scheduleItem.activityType,
  );
}

/**
 * Converts a schedule date into the ISO date string expected by calendar events.
 *
 * @param date - The schedule item's date-only value.
 * @returns A `YYYY-MM-DD` date string.
 */
function getCalendarDateKey(date: Date) {
  return formatDateInputValue(date) ?? '';
}

