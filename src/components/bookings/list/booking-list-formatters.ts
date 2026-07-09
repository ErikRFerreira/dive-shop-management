import type { BookingListItem } from '@/features/bookings/queries';
import { getActivityDisplayLabel } from '@/features/bookings/activity-utils';
import { getActiveBookingParticipants } from '@/features/bookings/participants';
import { getScheduleTimeSlotLabel } from '@/features/schedule/utils';
import type { BookingSource } from '@/generated/prisma/client';
import { formatDisplayDate, formatEnumLabel } from '@/lib/format';
import { SHOP_TIME_ZONE } from '@/lib/operational-date';

type BookingCustomerListItem = BookingListItem['customers'][number];
type BookingActivityListItem = BookingListItem['activities'][number];

const EMPTY_VALUE = '\u2014';

const compactDateFormatter = new Intl.DateTimeFormat('en-SG', {
  day: '2-digit',
  month: 'short',
  timeZone: SHOP_TIME_ZONE,
});

const compactTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: SHOP_TIME_ZONE,
});

/**
 * Formats one linked customer/diver name for the booking list.
 *
 * @param bookingCustomer - Customer relation attached to a booking.
 * @returns Customer display name, or a safe fallback when no name is stored.
 */
export function formatCustomerName(bookingCustomer: BookingCustomerListItem) {
  const customer = bookingCustomer.customer;
  const fullName = customer?.fullName?.trim();
  const name = [customer?.firstName, customer?.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ');

  return fullName || name || customer?.chineseName?.trim() || 'Unnamed customer';
}

/**
 * Formats the booking source for display.
 *
 * @param source - Booking source enum value.
 * @returns Formatted source label or empty placeholder.
 */
export function formatBookingSource(source: BookingSource | null | undefined) {
  return formatEnumLabel(source, { emptyValue: null }) || EMPTY_VALUE;
}

/**
 * Formats the hotel attached to the display customer for this booking.
 *
 * @param booking - Booking list item with customer booking relations.
 * @returns Booking-specific hotel, customer hotel fallback, or the empty placeholder.
 */
export function formatBookingHotel(booking: BookingListItem) {
  const activeCustomers = getActiveBookingParticipants(booking.customers);
  const displayCustomerId = booking.displayCustomer?.id;
  const bookingCustomer =
    activeCustomers.find(
      (customer) => customer.customerId === displayCustomerId,
    ) ??
    activeCustomers[0] ??
    null;
  const hotel =
    bookingCustomer?.hotelAtBooking?.trim() ||
    bookingCustomer?.customer.hotel?.trim();

  return hotel || EMPTY_VALUE;
}

/**
 * Formats one booking activity for a dedicated table line.
 *
 * @param activity - Booking activity relation attached to the booking.
 * @returns Activity label with specialty detail when available.
 */
export function formatBookingActivityName(activity: BookingActivityListItem) {
  return getActivityDisplayLabel(activity);
}

/**
 * Resolves the visible activity lines for a booking row.
 *
 * @param booking - Booking list item with activity relations and legacy fallback type.
 * @returns Ordered labels for each activity, or a single fallback label.
 */
export function getBookingActivityLines(booking: BookingListItem) {
  if (booking.activities.length > 0) {
    return booking.activities.map((activity) => ({
      key: activity.id,
      label: formatBookingActivityName(activity),
    }));
  }

  return [
    {
      key: `${booking.id}-fallback-activity`,
      label:
        getActivityDisplayLabel({
          activityType: booking.activityType,
          specialtyCourse: booking.specialtyCourse,
        }) || EMPTY_VALUE,
    },
  ];
}

/**
 * Formats the operational schedule label for a booking list row.
 *
 * @param booking - Booking list item with optional scheduled date/time.
 * @returns Scheduled or requested date with operational slot, or the empty placeholder.
 */
export function formatBookingSchedule(booking: BookingListItem) {
  const date = booking.scheduleItem?.date ?? booking.requestedDate;
  const timeSlot =
    booking.scheduleItem?.timeSlot ?? booking.requestedTimeSlot;

  if (!date) {
    return EMPTY_VALUE;
  }

  return `${formatDisplayDate(date)} \u00b7 ${getScheduleTimeSlotLabel(timeSlot)}`;
}

/**
 * Resolves assigned staff lines for display without exposing emails.
 *
 * @param booking - Booking list item with optional schedule assignments.
 * @returns Staff labels keyed by assignment, or a state placeholder.
 */
export function getStaffAssignmentLines(booking: BookingListItem) {
  const scheduleItems =
    booking.scheduleItems ?? (booking.scheduleItem ? [booking.scheduleItem] : []);

  if (scheduleItems.length === 0) {
    return [{ key: `${booking.id}-unscheduled-staff`, label: EMPTY_VALUE }];
  }

  const staffLines = scheduleItems
    .flatMap((scheduleItem) => scheduleItem.assignments)
    .map((assignment) => ({
      key: assignment.id,
      label: assignment.user.name.trim(),
    }))
    .filter((assignment) => assignment.label.length > 0);

  return staffLines.length > 0
    ? staffLines
    : [{ key: `${booking.id}-unassigned-staff`, label: 'Unassigned' }];
}

/**
 * Formats a compact update timestamp for the booking list.
 *
 * @param value - Booking update timestamp.
 * @returns Date/time display parts, or null when missing.
 */
export function formatCompactUpdatedDateParts(value: Date | null | undefined) {
  if (!value) {
    return null;
  }

  return {
    date: compactDateFormatter.format(value),
    time: compactTimeFormatter.format(value),
  };
}
