import type { BookingDetailsItem } from '@/features/bookings/queries';
import { getActivityDisplayLabel } from '@/features/bookings/activity-utils';
import {
  formatBookingCustomerDisplayName,
  getPrimaryActiveBookingCustomer,
} from '@/features/bookings/participants';
import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatEnumLabel,
} from '@/lib/format';
import { ScheduleTimeSlot } from '@/generated/prisma/enums';
import { getScheduleTimeSlotLabel } from '@/features/schedule/utils';

export type BookingActivityDisplayItem = {
  id: string;
  activityType: string | null | undefined;
  specialtyCourse: string | null;
  durationDays: number | null;
  requestedDate: Date | null;
  requestedTime: string | null;
  requestedTimeSlot: ScheduleTimeSlot;
  notes: string | null;
};

export const EMPTY_BOOKING_VALUE = '\u2014';
export const UNSCHEDULED_ASSIGNMENT_SUMMARY = 'Not scheduled yet';

/**
 * Formats a nullable date for shared booking display sections.
 *
 * @param value - Date value from a booking payload.
 * @returns Staff-facing date text, or the booking empty-value placeholder.
 */
export function formatBookingDate(value: Date | null | undefined) {
  return formatDisplayDate(value);
}

/**
 * Formats a date-time for shared booking display sections.
 *
 * @param value - Date-time value from a booking payload.
 * @returns Staff-facing date-time text, or the booking empty-value placeholder.
 */
export function formatBookingDateTime(value: Date | null | undefined) {
  return formatDisplayDateTime(value);
}

/**
 * Formats enum-like values for shared booking display sections.
 *
 * @param value - Raw enum text from the booking payload.
 * @returns Staff-facing enum label, or the booking empty-value placeholder.
 */
export function formatBookingEnum(value: string | null | undefined) {
  return formatEnumLabel(value);
}

/**
 * Formats a booking activity label with specialty-course naming rules.
 *
 * @param activity - Activity row shown in booking detail or review contexts.
 * @returns Staff-facing activity label with specialty names preferred.
 */
export function formatBookingActivityLabel(
  activity: Pick<
    BookingActivityDisplayItem,
    'activityType' | 'specialtyCourse'
  >,
) {
  return getActivityDisplayLabel(activity);
}

/**
 * Formats a time field where missing values should stay operationally explicit.
 *
 * @param value - Stored time text from a booking activity or schedule item.
 * @returns The stored time, or `TBD` when no time has been captured.
 */
export function formatBookingTimeOrTbd(value: string | null | undefined) {
  return value?.trim() || 'TBD';
}

/**
 * Formats the preferred customer name for shared booking display sections.
 *
 * @param customer - Customer selected for display.
 * @returns Full name, first/last fallback, or the booking empty-value placeholder.
 */
export function formatBookingCustomerName(
  customer: BookingDetailsItem['displayCustomer'],
) {
  return formatBookingCustomerDisplayName(customer, EMPTY_BOOKING_VALUE);
}

/**
 * Finds the booking customer staff should treat as the primary operational contact.
 *
 * @param booking - Booking detail payload with customer join rows.
 * @returns The active primary contact, first active customer fallback, or null.
 */
export function getPrimaryBookingCustomer(booking: BookingDetailsItem) {
  return getPrimaryActiveBookingCustomer(booking.customers);
}

/**
 * Formats a source and optional referrer into the standard staff-facing label.
 *
 * @param booking - Booking fields used for source and referrer display.
 * @returns Source, referrer, both joined with a slash, or the empty placeholder.
 */
export function formatBookingSourceReferrer(
  booking: Pick<BookingDetailsItem, 'source' | 'referrerName'>,
) {
  const source = booking.source ? formatBookingEnum(booking.source) : null;
  const referrer = booking.referrerName?.trim();

  if (source && referrer) {
    return `${source} / ${referrer}`;
  }

  return source ?? referrer ?? EMPTY_BOOKING_VALUE;
}

/**
 * Formats assigned staff names for compact booking summary display.
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
 * Resolves the first requested date and operational slot visible in the booking overview.
 *
 * @param booking - Booking detail payload.
 * @param activities - Activity rows already normalized for display.
 * @returns Requested date and slot using activity data before legacy fields.
 */
export function getOverviewRequestedDateTime(
  booking: BookingDetailsItem,
  activities: BookingActivityDisplayItem[],
) {
  const firstActivityWithDate =
    activities.find((activity) => activity.requestedDate) ?? activities[0];

  return {
    requestedDate:
      firstActivityWithDate?.requestedDate ?? booking.requestedDate,
    requestedTimeSlot:
      firstActivityWithDate?.requestedTimeSlot ??
      booking.requestedTimeSlot ??
      ScheduleTimeSlot.TBD,
  };
}

/**
 * Formats the requested date and slot pair for compact booking summary display.
 *
 * @param booking - Booking detail payload.
 * @param activities - Normalized activity rows visible on the page.
 * @returns A joined requested date/slot label.
 */
export function formatRequestedDateTime(
  booking: BookingDetailsItem,
  activities: BookingActivityDisplayItem[],
) {
  const requested = getOverviewRequestedDateTime(booking, activities);

  return `${formatBookingDate(requested.requestedDate)} / ${getScheduleTimeSlotLabel(requested.requestedTimeSlot)}`;
}
