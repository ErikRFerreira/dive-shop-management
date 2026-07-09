/**
 * Purpose: This file contains utility functions for booking-related operations.
 * It provides helpers for parsing filters, building queries, and resolving display customers.
 *
 * @module features/bookings/utils
 */

import {
  ActivityType,
  BookingCustomerRole,
  BookingParticipantStatus,
  BookingStatus,
  UserRole,
} from '@/generated/prisma/enums';
import { formatEnumLabel } from '@/lib/format';
import { getActivityDisplayLabel } from './activity-utils';
import { getPrimaryActiveBookingCustomer } from './participants';
import {
  bookingQueueFilters,
  bookingDefaultPageSize,
  bookingStatusFilters,
  type BookingQueueFilter,
  type BookingRequestFilter,
  type BookingStatusFilter,
} from './types';

/** The user attributes required to construct a visibility-scoped query. */
type BookingQueryUser = {
  id: string;
  role: UserRole;
};

/**
 * Parses a single URL status value into a supported booking-list filter.
 *
 * @param value - The raw value read from a URL search parameter.
 * @returns The matching supported status, or `undefined` for missing, repeated,
 * or unsupported values.
 */
export function parseBookingStatusFilter(
  value: string | string[] | undefined,
): BookingStatusFilter | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return bookingStatusFilters.find((status) => status === value);
}

/**
 * Parses a single URL queue value into a supported operational booking queue.
 *
 * @param value - The raw value read from a URL search parameter.
 * @returns The matching supported queue, or `undefined` for missing, repeated,
 * or unsupported values.
 */
export function parseBookingQueueFilter(
  value: string | string[] | undefined,
): BookingQueueFilter | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return bookingQueueFilters.find((queue) => queue === value);
}

/**
 * Parses a booking list page number from the URL.
 *
 * @param value - The raw page value read from a URL search parameter.
 * @returns A positive integer page number, or page 1 for missing, repeated,
 * non-numeric, or non-positive values.
 */
export function parseBookingPageParam(value: string | string[] | undefined) {
  if (typeof value !== 'string') {
    return 1;
  }

  const page = Number(value);

  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return page;
}

/**
 * Resolves the booking list page size from the URL.
 *
 * @param value - The raw page-size value read from a URL search parameter.
 * @returns The fixed booking page size. The URL value is accepted only when it
 * matches the supported page size so callers can safely include pageSize in links.
 */
export function parseBookingPageSizeParam(
  value: string | string[] | undefined,
) {
  if (value !== String(bookingDefaultPageSize)) {
    return bookingDefaultPageSize;
  }

  return bookingDefaultPageSize;
}

/**
 * Builds a booking-request filter that enforces list visibility for a user.
 *
 * @param currentUser - The authenticated user whose role determines visibility.
 * @param status - An optional supported status to add to the filter.
 * @param queue - An optional operational queue to add to the filter.
 * @returns A filter that Customer Service users can use only for their own
 * bookings, Admin and Manager users can use for all bookings, and unsupported
 * roles can use only to retrieve no bookings.
 * @remarks This helper is a query-shaping safeguard, not a replacement for
 * server-side authorization on mutations.
 */
export function buildBookingRequestWhere(
  currentUser: BookingQueryUser,
  status?: BookingStatusFilter,
  queue?: BookingQueueFilter,
): BookingRequestFilter {
  const where: BookingRequestFilter = {};

  if (queue === 'unassigned') {
    where.status = BookingStatus.SCHEDULED;
    where.scheduleItems = {
      some: {},
      none: {
        assignments: {
          some: {},
        },
      },
    };
  } else if (status) {
    where.status = status;
  }

  if (currentUser.role === UserRole.CUSTOMER_SERVICE) {
    where.createdById = currentUser.id;
  } else if (
    currentUser.role !== UserRole.ADMIN &&
    currentUser.role !== UserRole.MANAGER
  ) {
    where.id = { in: [] };
  }

  return where;
}

/** A booking-customer relation containing the data required for display. */
type BookingCustomerForDisplay<TCustomer> = {
  role: BookingCustomerRole;
  participationStatus: BookingParticipantStatus | null;
  customer: TCustomer;
};

/**
 * Selects the customer to identify a booking in list-style interfaces.
 *
 * @typeParam TCustomer - The shape of the included customer record.
 * @param customers - Booking customers ordered by their creation time.
 * @returns The active primary contact, active first-customer fallback, or
 * `null` when the booking has no active participants.
 */
export function resolveDisplayCustomer<TCustomer>(
  customers: BookingCustomerForDisplay<TCustomer>[],
) {
  return getPrimaryActiveBookingCustomer(customers)?.customer ?? null;
}

/**
 * Summarizes the activity types in a booking for display in list-style interfaces.
 *
 * @param activities - The booking activities to summarize.
 * @param fallbackActivityType - An optional fallback activity type to use when no activities are present.
 * @returns A string summarizing the activity types, or a fallback string when no activities are present.
 */
export function summarizeBookingActivities(
  activities: Array<{
    activityType: ActivityType | string | null;
    specialtyCourse?: string | null;
  }>,
  fallbackActivityType?: string | null,
) {
  const labels = activities
    .map((activity) => getActivityDisplayLabel(activity))
    .filter((label) => label !== '\u2014')
    .filter((label): label is string => label !== null);

  if (labels.length === 0) {
    const fallback = formatActivityType(fallbackActivityType ?? null);
    return fallback ?? '—';
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
 * Formats an activity type string for display by converting it to title case and replacing underscores with spaces.
 *
 * @param value - The activity type string to format, or null if no activity type is provided.
 * @returns A formatted activity type string in title case, or null if the input is null or empty.
 */
function formatActivityType(value: string | null) {
  return formatEnumLabel(value, { emptyValue: null });
}
