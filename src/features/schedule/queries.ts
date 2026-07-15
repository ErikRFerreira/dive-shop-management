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
import {
  assertAuthorizedCapability,
  canAccessBookings,
  canAccessGlobalSchedule,
  canManageAssignments,
} from '@/features/auth/permissions';
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
  ScheduleAssignedStaff,
  ScheduleCalendarEvent,
  ScheduleFilters,
  SchedulePageItem,
  ScheduleStaffFilterOption,
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

const scheduleCalendarCustomerSelect = {
  role: true,
  participationStatus: true,
  hotelAtBooking: true,
  customer: {
    select: {
      fullName: true,
      chineseName: true,
      firstName: true,
      lastName: true,
      hotel: true,
    },
  },
} satisfies Prisma.BookingCustomerSelect;

const scheduleCalendarActivitySelect = {
  activityType: true,
  specialtyCourse: true,
} satisfies Prisma.BookingActivitySelect;

const instructorScheduleCalendarArgs = {
  select: {
    id: true,
    date: true,
    timeSlot: true,
    activityType: true,
    dayNumber: true,
    totalDays: true,
    scheduleNotes: true,
    bookingActivity: {
      select: {
        activityType: true,
        specialtyCourse: true,
      },
    },
    assignments: {
      select: {
        role: true,
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
    bookingRequest: {
      select: {
        activities: {
          select: scheduleCalendarActivitySelect,
          orderBy: {
            sortOrder: 'asc',
          },
        },
        customers: {
          select: scheduleCalendarCustomerSelect,
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    },
  },
} satisfies Prisma.ScheduleItemDefaultArgs;

const scheduleViewerCalendarArgs = {
  select: {
    ...instructorScheduleCalendarArgs.select,
    bookingRequest: {
      select: {
        id: true,
        source: true,
        referrerName: true,
        internalNotes: true,
        activities: {
          select: scheduleCalendarActivitySelect,
          orderBy: {
            sortOrder: 'asc',
          },
        },
        customers: {
          select: scheduleCalendarCustomerSelect,
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    },
  },
} satisfies Prisma.ScheduleItemDefaultArgs;

const scheduleManagementCalendarArgs = {
  select: {
    ...scheduleViewerCalendarArgs.select,
    assignments: schedulePageItemArgs.select.assignments,
  },
} satisfies Prisma.ScheduleItemDefaultArgs;

type InstructorScheduleCalendarRecord = Prisma.ScheduleItemGetPayload<
  typeof instructorScheduleCalendarArgs
>;
type ScheduleViewerCalendarRecord = Prisma.ScheduleItemGetPayload<
  typeof scheduleViewerCalendarArgs
>;
type ScheduleManagementCalendarRecord = Prisma.ScheduleItemGetPayload<
  typeof scheduleManagementCalendarArgs
>;

/** Builds the personal-assignment projection with only the current assignment role. */
function buildMyScheduleAssignmentArgs(currentUserId: string) {
  return {
    select: {
      id: true,
      date: true,
      timeSlot: true,
      activityType: true,
      dayNumber: true,
      totalDays: true,
      scheduleNotes: true,
      bookingActivity: {
        select: {
          activityType: true,
          specialtyCourse: true,
        },
      },
      assignments: {
        where: {
          userId: currentUserId,
        },
        select: {
          role: true,
        },
        take: 1,
      },
      bookingRequest: {
        select: {
          activities: {
            select: {
              activityType: true,
              specialtyCourse: true,
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
}

type ScheduleItemForMyAssignments = Prisma.ScheduleItemGetPayload<
  ReturnType<typeof buildMyScheduleAssignmentArgs>
>;

/**
 * Returns active staff users who can be assigned to scheduled activities.
 *
 * @param currentUser - Authenticated operations user requesting management data.
 * @returns Active instructor and divemaster users sorted for picker display.
 */
export async function getAssignableStaff(
  currentUser: CurrentUser,
): Promise<AssignableStaff[]> {
  assertAuthorizedCapability(canManageAssignments(currentUser));

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
 * Returns the minimal active staff data used by read-only schedule filters.
 *
 * @param currentUser - Authenticated user requesting the global schedule.
 * @returns Active instructor and divemaster IDs, names, and roles without email.
 */
export async function getScheduleStaffFilterOptions(
  currentUser: CurrentUser,
): Promise<ScheduleStaffFilterOption[]> {
  assertAuthorizedCapability(canAccessGlobalSchedule(currentUser));

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
 * @returns A ScheduleItem filter that requires an official scheduled booking
 * and returns no rows for roles without global schedule access.
 */
export function buildSchedulePageWhere(
  currentUser: Pick<CurrentUser, 'id' | 'role'>,
  filters: ScheduleFilters = {},
): Prisma.ScheduleItemWhereInput {
  const bookingRequest: Prisma.BookingRequestWhereInput = {
    status: BookingStatus.SCHEDULED,
  };
  const where: Prisma.ScheduleItemWhereInput = { bookingRequest };

  if (!canAccessGlobalSchedule(currentUser)) {
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
  assertAuthorizedCapability(canAccessBookings(currentUser));
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
  assertAuthorizedCapability(canAccessGlobalSchedule(currentUser));
  const where = buildSchedulePageWhere(currentUser, filters);
  const orderBy = [
    { date: 'asc' as const },
    { timeSlot: 'asc' as const },
    { createdAt: 'asc' as const },
  ];

  if (currentUser.role === UserRole.INSTRUCTOR) {
    const scheduleItems = await db.scheduleItem.findMany({
      ...instructorScheduleCalendarArgs,
      where,
      orderBy,
    });

    return scheduleItems.map(mapInstructorScheduleItemToCalendarEvent);
  }

  if (canManageAssignments(currentUser)) {
    const scheduleItems = await db.scheduleItem.findMany({
      ...scheduleManagementCalendarArgs,
      where,
      orderBy,
    });

    return scheduleItems.map(mapManagementScheduleItemToCalendarEvent);
  }

  const scheduleItems = await db.scheduleItem.findMany({
    ...scheduleViewerCalendarArgs,
    where,
    orderBy,
  });

  return scheduleItems.map(mapViewerScheduleItemToCalendarEvent);
}

/**
 * Returns official scheduled items assigned to the current staff user.
 *
 * The current user's id is always used as the assignment predicate, so callers
 * cannot request another instructor's personal assignment list.
 * Only `SCHEDULED` booking requests are included.
 *
 * @param currentUser - The authenticated user whose assignments are requested.
 * @returns Read-only assignment rows for the future My Assignments page.
 */
export async function getMyScheduleAssignments(
  currentUser: CurrentUser,
): Promise<MyScheduleAssignment[]> {
  assertAuthorizedCapability(canViewMyScheduleAssignments(currentUser));

  const scheduleItems = await db.scheduleItem.findMany({
    ...buildMyScheduleAssignmentArgs(currentUser.id),
    where: buildMyScheduleAssignmentsWhere(currentUser, {
      gte: getShopDateOnlyRange(new Date()).start,
    }),
    orderBy: scheduleAssignmentOrderBy,
  });

  return scheduleItems.map(mapScheduleItemToMyScheduleAssignment);
}

/**
 * Returns a bounded staff briefing for the current user's personal assignments.
 *
 * The briefing separates today and tomorrow from future work, excludes past
 * assignments, and caps the upcoming table so the page remains scalable for
 * instructors with many future scheduled activities.
 *
 * @param currentUser - The authenticated instructor.
 * @returns Date-bucketed assignments plus summary counts for the briefing UI.
 */
export async function getMyScheduleAssignmentBriefing(
  currentUser: CurrentUser,
): Promise<MyScheduleAssignmentBriefing> {
  assertAuthorizedCapability(canViewMyScheduleAssignments(currentUser));

  const todayRange = getShopDateOnlyRange(new Date());
  const tomorrowRange = getShopDateOnlyRange(new Date(), 1);
  const upcomingDateFilter: Prisma.DateTimeFilter<'ScheduleItem'> = {
    gte: tomorrowRange.end,
  };
  const assignmentArgs = buildMyScheduleAssignmentArgs(currentUser.id);

  const [
    todayScheduleItems,
    tomorrowScheduleItems,
    upcomingScheduleItems,
    upcomingCount,
  ] = await Promise.all([
    db.scheduleItem.findMany({
      ...assignmentArgs,
      where: buildMyScheduleAssignmentsWhere(currentUser, {
        gte: todayRange.start,
        lt: todayRange.end,
      }),
      orderBy: scheduleAssignmentOrderBy,
    }),
    db.scheduleItem.findMany({
      ...assignmentArgs,
      where: buildMyScheduleAssignmentsWhere(currentUser, {
        gte: tomorrowRange.start,
        lt: tomorrowRange.end,
      }),
      orderBy: scheduleAssignmentOrderBy,
    }),
    db.scheduleItem.findMany({
      ...assignmentArgs,
      where: buildMyScheduleAssignmentsWhere(currentUser, upcomingDateFilter),
      orderBy: scheduleAssignmentOrderBy,
      take: MY_ASSIGNMENTS_UPCOMING_LIMIT,
    }),
    db.scheduleItem.count({
      where: buildMyScheduleAssignmentsWhere(currentUser, upcomingDateFilter),
    }),
  ]);

  const todayAssignments = mapScheduleItemsToMyScheduleAssignments(todayScheduleItems);
  const tomorrowAssignments =
    mapScheduleItemsToMyScheduleAssignments(tomorrowScheduleItems);
  const upcomingAssignments =
    mapScheduleItemsToMyScheduleAssignments(upcomingScheduleItems);
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
  return scheduleItems.map((scheduleItem) =>
    mapScheduleCalendarRecord(scheduleItem, {
      bookingId: scheduleItem.bookingRequest.id,
      source: scheduleItem.bookingRequest.source,
      referrerName: scheduleItem.bookingRequest.referrerName,
      scheduleNotes:
        scheduleItem.scheduleNotes ?? scheduleItem.bookingRequest.internalNotes,
      managementAssignments: mapScheduleAssignments(
        scheduleItem.assignments,
      ),
    }),
  );
}

/**
 * Maps an instructor schedule row without booking or assignment-management data.
 *
 * @param scheduleItem - Minimal instructor-safe schedule query record.
 * @returns Instructor calendar event containing only rendered operational data.
 */
function mapInstructorScheduleItemToCalendarEvent(
  scheduleItem: InstructorScheduleCalendarRecord,
) {
  return mapScheduleCalendarRecord(scheduleItem, {
    scheduleNotes: scheduleItem.scheduleNotes,
  });
}

/**
 * Maps a Customer Service schedule row with operational booking context.
 *
 * @param scheduleItem - Operational viewer schedule query record.
 * @returns Calendar event without assignment-management-only metadata.
 */
function mapViewerScheduleItemToCalendarEvent(
  scheduleItem: ScheduleViewerCalendarRecord,
) {
  return mapScheduleCalendarRecord(scheduleItem, {
    bookingId: scheduleItem.bookingRequest.id,
    source: scheduleItem.bookingRequest.source,
    referrerName: scheduleItem.bookingRequest.referrerName,
    scheduleNotes:
      scheduleItem.scheduleNotes ?? scheduleItem.bookingRequest.internalNotes,
  });
}

/**
 * Maps an Admin or Manager schedule row with assignment-management metadata.
 *
 * @param scheduleItem - Management schedule query record.
 * @returns Calendar event containing the current management controls' data.
 */
function mapManagementScheduleItemToCalendarEvent(
  scheduleItem: ScheduleManagementCalendarRecord,
) {
  return mapScheduleCalendarRecord(scheduleItem, {
    bookingId: scheduleItem.bookingRequest.id,
    source: scheduleItem.bookingRequest.source,
    referrerName: scheduleItem.bookingRequest.referrerName,
    scheduleNotes:
      scheduleItem.scheduleNotes ?? scheduleItem.bookingRequest.internalNotes,
    managementAssignments: mapScheduleAssignments(scheduleItem.assignments),
  });
}

type ScheduleCalendarRecord =
  | InstructorScheduleCalendarRecord
  | ScheduleViewerCalendarRecord
  | ScheduleManagementCalendarRecord
  | ScheduleItemForSchedulePage;

/** Optional operational metadata omitted entirely from instructor events. */
type ScheduleCalendarMappingOptions = Pick<
  ScheduleCalendarEvent,
  'scheduleNotes'
> &
  Partial<
    Pick<
      ScheduleCalendarEvent,
      'bookingId' | 'source' | 'referrerName' | 'managementAssignments'
    >
  >;

/**
 * Maps the fields common to every role-specific calendar projection.
 *
 * @param scheduleItem - Role-minimized schedule query record.
 * @param options - Optional operational fields authorized for the viewer.
 * @returns FullCalendar event with only the supplied role-specific metadata.
 */
function mapScheduleCalendarRecord(
  scheduleItem: ScheduleCalendarRecord,
  options: ScheduleCalendarMappingOptions,
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
  const assignments = mapScheduleAssignedStaff(scheduleItem.assignments);
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
    ...(options.bookingId ? { bookingId: options.bookingId } : {}),
    scheduleItemId: scheduleItem.id,
    date: scheduleItem.date,
    timeSlot,
    activityType: scheduleItem.activityType,
    activityLabel,
    activitySummary,
    dayNumber: scheduleItem.dayNumber,
    totalDays: scheduleItem.totalDays,
    dayLabel,
    primaryCustomerName,
    customers: mapBookingCustomersForDisplay(booking.customers),
    numberOfPeople: getActiveParticipantCount(booking.customers),
    hotel:
      displayBookingCustomer?.hotelAtBooking?.trim() ||
      displayBookingCustomer?.customer.hotel?.trim() ||
      null,
    ...(options.source !== undefined ? { source: options.source } : {}),
    ...(options.referrerName !== undefined
      ? { referrerName: options.referrerName }
      : {}),
    scheduleNotes: options.scheduleNotes,
    assignments,
    ...(options.managementAssignments
      ? { managementAssignments: options.managementAssignments }
      : {}),
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
 * Maps selected schedule items into personal assignment rows for one user.
 *
 * @param scheduleItems - Schedule items fetched with My Assignments relations.
 * @returns Display-ready personal assignment rows in query order.
 */
function mapScheduleItemsToMyScheduleAssignments(
  scheduleItems: ScheduleItemForMyAssignments[],
) {
  return scheduleItems.map(mapScheduleItemToMyScheduleAssignment);
}

/**
 * Maps one assigned schedule item into the My Assignments read model.
 *
 * @param scheduleItem - The selected schedule row and booking relations.
 * @returns Display-ready personal assignment details without booking internal notes.
 */
function mapScheduleItemToMyScheduleAssignment(
  scheduleItem: ScheduleItemForMyAssignments,
): MyScheduleAssignment {
  const booking = scheduleItem.bookingRequest;
  const timeSlot = scheduleItem.timeSlot ?? ScheduleTimeSlot.TBD;
  const displayBookingCustomer = getPrimaryActiveBookingCustomer(
    booking.customers,
  );
  const primaryCustomerName = formatCustomerName(
    displayBookingCustomer?.customer ?? null,
  );
  const currentUserAssignment = scheduleItem.assignments[0];

  if (!currentUserAssignment) {
    throw new Error('Assigned schedule item is missing current user assignment.');
  }

  return {
    scheduleItemId: scheduleItem.id,
    date: scheduleItem.date,
    timeSlot,
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
      activityType: activity.activityType,
      activityLabel: activity.activityType
        ? getActivityShortLabel(activity)
        : null,
      specialtyCourse: activity.specialtyCourse,
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
  assignments:
    | ScheduleItemForSchedulePage['assignments']
    | ScheduleManagementCalendarRecord['assignments'],
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
 * Maps assignments into the minimal name and operational-role schedule shape.
 *
 * @param assignments - Role-specific schedule assignments containing names and roles.
 * @returns Assigned staff display rows without account or management metadata.
 */
function mapScheduleAssignedStaff(
  assignments: ScheduleCalendarRecord['assignments'],
): ScheduleAssignedStaff[] {
  return assignments.map((assignment) => ({
    name: assignment.user.name,
    role: assignment.role,
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
    | ScheduleItemForMyAssignments['bookingRequest']['customers']
    | InstructorScheduleCalendarRecord['bookingRequest']['customers']
    | ScheduleViewerCalendarRecord['bookingRequest']['customers']
    | ScheduleManagementCalendarRecord['bookingRequest']['customers'],
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
  assignments: ScheduleAssignedStaff[];
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
function buildScheduleStaffPrefix(assignments: ScheduleAssignedStaff[]) {
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
function formatScheduleStaffName(assignment: ScheduleAssignedStaff) {
  const displayName = assignment.name.trim();
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
  activities: ScheduleCalendarRecord['bookingRequest']['activities'],
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
  scheduleItem: ScheduleCalendarRecord | ScheduleItemForMyAssignments,
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

