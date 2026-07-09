import type { BookingDetailsItem } from '@/features/bookings/queries';
import {
  formatBookingCustomerDisplayName,
  getPrimaryActiveBookingCustomer,
} from '@/features/bookings/participants';
import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatEnumLabel,
} from '@/lib/format';
import {
  ActivityType,
} from '@/generated/prisma/enums';

export type BookingActivityDisplay = {
  id: string;
  activityType: BookingDetailsItem['activities'][number]['activityType'];
  specialtyCourse: string | null;
  durationDays: number | null;
  requestedDate: Date | null;
  requestedTime: string | null;
  notes: string | null;
};

export const EMPTY_VALUE = '\u2014';
export const UNSCHEDULED_ASSIGNMENT_SUMMARY = 'Not scheduled yet';

/**
 * Formats a nullable date for booking detail display.
 *
 * @param value - Date value from the booking detail payload.
 * @returns Staff-facing date text, or the empty-value placeholder.
 */
export function formatDate(value: Date | null | undefined) {
  return formatDisplayDate(value);
}

/**
 * Formats a date-time for booking detail display.
 *
 * @param value - Date-time value from the booking detail payload.
 * @returns Staff-facing date-time text, or the empty-value placeholder.
 */
export function formatDateTime(value: Date) {
  return formatDisplayDateTime(value);
}

/**
 * Formats enum-like values for booking detail display.
 *
 * @param value - Raw enum text from the booking detail payload.
 * @returns Staff-facing label text, or the empty-value placeholder.
 */
export function formatEnum(value: string | null | undefined) {
  return formatEnumLabel(value);
}

/**
 * Formats a time field where missing values should be operationally explicit.
 *
 * @param value - Stored time text from a booking activity or schedule item.
 * @returns The stored time or the explicit TBD label.
 */
export function formatTimeOrTbd(value: string | null | undefined) {
  return value?.trim() || 'TBD';
}

/**
 * Formats the preferred customer name for booking detail display.
 *
 * @param customer - Customer selected for display.
 * @returns A full name, first/last fallback, or the empty-value placeholder.
 */
export function formatCustomerName(
  customer: BookingDetailsItem['displayCustomer'],
) {
  return formatBookingCustomerDisplayName(customer, EMPTY_VALUE);
}

/**
 * Finds the booking customer staff should treat as the primary operational contact.
 *
 * @param booking - Booking detail payload with customer join rows.
 * @returns The active primary contact, first active customer, or null when none exists.
 */
export function getPrimaryBookingCustomer(booking: BookingDetailsItem) {
  return getPrimaryActiveBookingCustomer(booking.customers);
}

/**
 * Formats a source and optional referrer into the standard staff-facing label.
 *
 * @param booking - Booking fields used for source/referrer display.
 * @returns Source, referrer, both joined with a slash, or the empty placeholder.
 */
export function formatSourceReferrer(
  booking: Pick<BookingDetailsItem, 'source' | 'referrerName'>,
) {
  const source = booking.source ? formatEnum(booking.source) : null;
  const referrer = booking.referrerName?.trim();

  if (source && referrer) {
    return `${source} / ${referrer}`;
  }

  return source ?? referrer ?? EMPTY_VALUE;
}

/**
 * Formats assigned staff names for the compact booking overview.
 *
 * @param booking - Booking detail payload with optional schedule assignments.
 * @returns Comma-separated staff names, unassigned text, or a not-scheduled label.
 */
export function formatAssignedStaffSummary(booking: BookingDetailsItem) {
  const scheduleItems = getBookingScheduleItemsForDisplay(booking);

  if (scheduleItems.length === 0) {
    return UNSCHEDULED_ASSIGNMENT_SUMMARY;
  }

  const names = Array.from(
    new Set(
      scheduleItems.flatMap((scheduleItem) =>
        scheduleItem.assignments.map((assignment) => assignment.user.name),
      ),
    ),
  );

  return names.length > 0 ? names.join(', ') : 'Unassigned';
}

/**
 * Returns schedule rows from the current read model with a legacy test fallback.
 *
 * @param booking - Booking detail payload.
 * @returns Ordered schedule items, or an empty array when unscheduled.
 */
function getBookingScheduleItemsForDisplay(booking: BookingDetailsItem) {
  return booking.scheduleItems ?? (booking.scheduleItem ? [booking.scheduleItem] : []);
}

/**
 * Returns the activity rows used by the detail view, including legacy fallback data.
 *
 * @param booking - Booking detail payload.
 * @returns Existing activities, or one legacy summary row when no activities exist.
 */
export function getDisplayActivities(
  booking: BookingDetailsItem,
): BookingActivityDisplay[] {
  if (booking.activities.length > 0) {
    return booking.activities;
  }

  return [
    {
      id: 'legacy-summary',
      activityType: booking.activityType,
      specialtyCourse: booking.specialtyCourse,
      durationDays: null,
      requestedDate: booking.requestedDate,
      requestedTime: booking.requestedTime,
      notes: null,
    },
  ];
}

/**
 * Resolves the first requested date/time visible in the booking overview.
 *
 * @param booking - Booking detail payload.
 * @param activities - Activity rows already normalized for display.
 * @returns Requested date and time using activity data before legacy fields.
 */
export function getOverviewRequestedDateTime(
  booking: BookingDetailsItem,
  activities: BookingActivityDisplay[],
) {
  const firstActivityWithDate =
    activities.find((activity) => activity.requestedDate) ?? activities[0];

  return {
    requestedDate:
      firstActivityWithDate?.requestedDate ?? booking.requestedDate,
    requestedTime:
      firstActivityWithDate?.requestedTime ?? booking.requestedTime ?? null,
  };
}

/**
 * Formats the requested date/time pair for compact booking reference display.
 *
 * @param booking - Booking detail payload.
 * @param activities - Normalized activity rows visible on the detail page.
 * @returns A joined requested date/time label.
 */
export function formatRequestedDateTime(
  booking: BookingDetailsItem,
  activities: BookingActivityDisplay[],
) {
  const requested = getOverviewRequestedDateTime(booking, activities);

  return `${formatDate(requested.requestedDate)} / ${formatTimeOrTbd(requested.requestedTime)}`;
}

/**
 * Checks whether the booking includes a fun dive activity.
 *
 * @param activities - Activity rows shown on the detail page.
 * @returns True when any activity is a fun dive.
 */
export function includesFunDiveActivity(activities: BookingActivityDisplay[]) {
  return activities.some(
    (activity) => activity.activityType === ActivityType.FUN_DIVE,
  );
}
