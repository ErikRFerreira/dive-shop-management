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
  UserRole,
} from '@/generated/prisma/enums';
import { db } from '@/lib/db';
import type { CurrentUser } from '@/lib/current-user';
import { formatDateInputValue } from '@/lib/format';
import { getScheduleDateRangeForFilter } from './date-ranges';
import { canViewMyScheduleAssignments } from './permissions';
import type {
  AssignableStaff,
  MyScheduleAssignment,
  ScheduleAssignmentDetail,
  ScheduleCalendarEvent,
  ScheduleFilters,
  SchedulePageItem,
} from './types';
import { formatScheduleActivityLabel } from './utils';

const schedulePageItemArgs = {
  select: {
    id: true,
    bookingRequestId: true,
    date: true,
    startTime: true,
    activityType: true,
    scheduleNotes: true,
    createdAt: true,
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
        numberOfPeople: true,
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
            hotelAtBooking: true,
            createdAt: true,
            customer: {
              select: {
                fullName: true,
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
    activityType: true,
    scheduleNotes: true,
    createdAt: true,
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
        numberOfPeople: true,
        endAt: true,
        activities: {
          select: {
            id: true,
            activityType: true,
            specialtyCourse: true,
            requestedDate: true,
            requestedTime: true,
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
            hotelAtBooking: true,
            createdAt: true,
            customer: {
              select: {
                fullName: true,
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
 * booking and scopes Customer Service users to bookings they created.
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
    currentUser.role !== UserRole.MANAGER
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

  if (filters.activityType) {
    andFilters.push({
      OR: [
        {
          activityType: filters.activityType,
        },
        {
          bookingRequest: {
            activities: {
              some: {
                activityType: filters.activityType,
              },
            },
          },
        },
      ],
    });
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  return where;
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
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
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
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
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
    where: buildMyScheduleAssignmentsWhere(currentUser),
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
  });

  return scheduleItems.map((scheduleItem) =>
    mapScheduleItemToMyScheduleAssignment(scheduleItem, currentUser.id),
  );
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
  const displayBookingCustomer =
    booking.customers.find(
      (bookingCustomer) =>
        bookingCustomer.role === BookingCustomerRole.PRIMARY_CONTACT,
    ) ??
    booking.customers[0] ??
    null;

  return {
    scheduleItemId: scheduleItem.id,
    bookingId: booking.id,
    date: scheduleItem.date,
    startTime: scheduleItem.startTime,
    activityType: scheduleItem.activityType,
    primaryCustomerName: formatCustomerName(
      displayBookingCustomer?.customer ?? null,
    ),
    numberOfPeople: booking.numberOfPeople,
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
  const displayBookingCustomer =
    booking.customers.find(
      (bookingCustomer) =>
        bookingCustomer.role === BookingCustomerRole.PRIMARY_CONTACT,
    ) ??
    booking.customers[0] ??
    null;
  const primaryCustomerName = formatCustomerName(
    displayBookingCustomer?.customer ?? null,
  );
  const dateKey = getCalendarDateKey(scheduleItem.date);
  const startTime = normalizeTimeValue(scheduleItem.startTime);
  const endTime = startTime ? getCalendarEndTime(booking.endAt) : null;
  const isTimeTbd = startTime === null;
  const activityLabel = formatScheduleActivityLabel(scheduleItem.activityType);
  const activitySummary = summarizeScheduleActivities(
    booking.activities,
    scheduleItem.activityType,
  );

  return {
    id: scheduleItem.id,
    title: buildScheduleCalendarEventTitle({
      activitySummary,
      customerName: primaryCustomerName,
      isTimeTbd,
      numberOfPeople: booking.numberOfPeople,
    }),
    start: startTime ? `${dateKey}T${startTime}:00` : dateKey,
    end: startTime && endTime ? `${dateKey}T${endTime}:00` : null,
    allDay: isTimeTbd,
    bookingId: booking.id,
    bookingReference: booking.id,
    scheduleItemId: scheduleItem.id,
    date: scheduleItem.date,
    startTime,
    endTime,
    activityType: scheduleItem.activityType,
    activityLabel,
    activitySummary,
    activities: booking.activities.map((activity) => ({
      id: activity.id,
      activityType: activity.activityType,
      activityLabel: activity.activityType
        ? formatScheduleActivityLabel(activity.activityType)
        : null,
      specialtyCourse: activity.specialtyCourse,
      requestedDate: activity.requestedDate,
      requestedTime: activity.requestedTime,
      notes: activity.notes,
    })),
    primaryCustomerName,
    numberOfPeople: booking.numberOfPeople,
    hotel:
      displayBookingCustomer?.hotelAtBooking?.trim() ||
      displayBookingCustomer?.customer.hotel?.trim() ||
      null,
    source: booking.source,
    referrerName: booking.referrerName,
    notes: scheduleItem.scheduleNotes ?? booking.internalNotes,
    assignments: mapScheduleAssignments(scheduleItem.assignments),
    isTimeTbd,
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
): Prisma.ScheduleItemWhereInput {
  return {
    bookingRequest: {
      status: BookingStatus.SCHEDULED,
    },
    assignments: {
      some: {
        userId: currentUser.id,
      },
    },
  };
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
  const displayBookingCustomer =
    booking.customers.find(
      (bookingCustomer) =>
        bookingCustomer.role === BookingCustomerRole.PRIMARY_CONTACT,
    ) ??
    booking.customers[0] ??
    null;
  const primaryCustomerName = formatCustomerName(
    displayBookingCustomer?.customer ?? null,
  );
  const startTime = normalizeTimeValue(scheduleItem.startTime);
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
    startTime,
    endTime: getCalendarEndTime(booking.endAt),
    isTimeTbd: startTime === null,
    activityType: scheduleItem.activityType,
    activityLabel: formatScheduleActivityLabel(scheduleItem.activityType),
    activitySummary: summarizeScheduleActivities(
      booking.activities,
      scheduleItem.activityType,
    ),
    activities: booking.activities.map((activity) => ({
      id: activity.id,
      activityType: activity.activityType,
      activityLabel: activity.activityType
        ? formatScheduleActivityLabel(activity.activityType)
        : null,
      specialtyCourse: activity.specialtyCourse,
      requestedDate: activity.requestedDate,
      requestedTime: activity.requestedTime,
      notes: activity.notes,
    })),
    primaryCustomerName,
    otherCustomerNames: booking.customers
      .filter((bookingCustomer) => bookingCustomer !== displayBookingCustomer)
      .map((bookingCustomer) => formatCustomerName(bookingCustomer.customer))
      .filter((name): name is string => name !== null),
    numberOfPeople: booking.numberOfPeople,
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
 * Builds a calendar event title that is useful in dense month/week views.
 *
 * @param input - Event title ingredients derived from the schedule item.
 * @returns A compact title including TBD when the schedule item has no time.
 */
function buildScheduleCalendarEventTitle(input: {
  activitySummary: string;
  customerName: string | null;
  isTimeTbd: boolean;
  numberOfPeople: number | null;
}) {
  const titleParts = [
    input.isTimeTbd ? 'TBD' : null,
    input.activitySummary,
    input.customerName ?? 'Customer TBD',
    formatPaxLabel(input.numberOfPeople),
  ].filter((part): part is string => Boolean(part));

  return titleParts.join(' - ');
}

/**
 * Formats the number of people for compact calendar event titles.
 *
 * @param numberOfPeople - The stored booking party size.
 * @returns A compact pax label, using TBD when party size is unknown.
 */
function formatPaxLabel(numberOfPeople: number | null) {
  return `${numberOfPeople ?? 'TBD'} pax`;
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
    .map((activity) =>
      activity.activityType
        ? formatScheduleActivityLabel(activity.activityType)
        : null,
    )
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
 * Converts a schedule date into the ISO date string expected by calendar events.
 *
 * @param date - The schedule item's date-only value.
 * @returns A `YYYY-MM-DD` date string.
 */
function getCalendarDateKey(date: Date) {
  return formatDateInputValue(date) ?? '';
}

/**
 * Normalizes optional database time text before building calendar event dates.
 *
 * @param value - Stored time text from the schedule item.
 * @returns A trimmed time string or null when the schedule time is missing.
 */
function normalizeTimeValue(value: string | null) {
  const trimmedValue = value?.trim();
  return trimmedValue || null;
}

/**
 * Extracts a compact end time from a booking end date, when one exists.
 *
 * @param endAt - Optional booking end timestamp.
 * @returns An `HH:mm` time string or null when no end timestamp is available.
 */
function getCalendarEndTime(endAt: Date | null) {
  return endAt ? endAt.toISOString().slice(11, 16) : null;
}
