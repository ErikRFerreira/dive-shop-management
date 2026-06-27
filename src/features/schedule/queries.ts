/**
 * Purpose: Server-only queries for the internal schedule page.
 *
 * @module features/schedule/queries
 */

import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import {
  ActivityType,
  BookingCustomerRole,
  BookingStatus,
  UserRole,
} from '@/generated/prisma/enums';
import { db } from '@/lib/db';
import type { CurrentUser } from '@/lib/current-user';
import { formatDateInputValue, formatEnumLabel } from '@/lib/format';
import type { ScheduleCalendarEvent, SchedulePageItem } from './types';

const schedulePageItemArgs = {
  select: {
    id: true,
    bookingRequestId: true,
    date: true,
    startTime: true,
    activityType: true,
    scheduleNotes: true,
    createdAt: true,
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

/**
 * Builds the schedule-page visibility filter for the current user.
 *
 * @param currentUser - The authenticated user whose role scopes visibility.
 * @returns A ScheduleItem filter that always requires an official scheduled
 * booking and scopes Customer Service users to bookings they created.
 */
export function buildSchedulePageWhere(
  currentUser: Pick<CurrentUser, 'id' | 'role'>,
): Prisma.ScheduleItemWhereInput {
  const bookingRequest: Prisma.BookingRequestWhereInput = {
    status: BookingStatus.SCHEDULED,
  };

  if (currentUser.role === UserRole.CUSTOMER_SERVICE) {
    bookingRequest.createdById = currentUser.id;
  } else if (
    currentUser.role !== UserRole.ADMIN &&
    currentUser.role !== UserRole.MANAGER
  ) {
    return {
      id: { in: [] },
      bookingRequest,
    };
  }

  return { bookingRequest };
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
 * @returns Schedule rows mapped into feature-specific calendar event objects.
 */
export async function getScheduleItemsForCalendar(
  currentUser: CurrentUser,
): Promise<ScheduleCalendarEvent[]> {
  const scheduleItems = await db.scheduleItem.findMany({
    ...schedulePageItemArgs,
    where: buildSchedulePageWhere(currentUser),
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
  });

  return mapScheduleItemsToCalendarEvents(scheduleItems);
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
    isTimeTbd,
  };
}

/**
 * Formats a customer name for display, falling back to first/last name if
 * fullName is not available.
 *
 * @param customer - The customer record to format.
 * @returns The formatted name, or null if no name is available.
 */
function formatCustomerName(
  customer:
    | ScheduleItemForSchedulePage['bookingRequest']['customers'][number]['customer']
    | null,
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
 * Formats activity types for compact schedule calendar display.
 *
 * @param activityType - The activity enum value stored on a schedule or booking activity.
 * @returns A short staff-facing label for calendar event titles.
 */
function formatScheduleActivityLabel(
  activityType: ScheduleItemForSchedulePage['activityType'],
) {
  if (activityType === ActivityType.DISCOVER_SCUBA_DIVING) {
    return 'DSD';
  }

  if (activityType === ActivityType.OPEN_WATER_COURSE) {
    return 'Open Water';
  }

  if (activityType === ActivityType.ADVANCED_OPEN_WATER_COURSE) {
    return 'Advanced Open Water';
  }

  return formatEnumLabel(activityType);
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
