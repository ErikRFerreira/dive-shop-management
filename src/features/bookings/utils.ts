/**
 * Purpose: This file contains utility functions for booking-related operations.
 * It provides helpers for parsing filters, building queries, and resolving display customers.
 *
 * @module features/bookings/utils
 */

import { BookingCustomerRole, UserRole } from '@/generated/prisma/enums';
import { formatEnumLabel } from '@/lib/format';
import {
  bookingStatusFilters,
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
 * Builds a booking-request filter that enforces list visibility for a user.
 *
 * @param currentUser - The authenticated user whose role determines visibility.
 * @param status - An optional supported status to add to the filter.
 * @returns A filter that Customer Service users can use only for their own
 * bookings, Admin and Manager users can use for all bookings, and unsupported
 * roles can use only to retrieve no bookings.
 * @remarks This helper is a query-shaping safeguard, not a replacement for
 * server-side authorization on mutations.
 */
export function buildBookingRequestWhere(
  currentUser: BookingQueryUser,
  status?: BookingStatusFilter,
): BookingRequestFilter {
  const where: BookingRequestFilter = {};

  if (status) {
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
  customer: TCustomer;
};

/**
 * Selects the customer to identify a booking in list-style interfaces.
 *
 * @typeParam TCustomer - The shape of the included customer record.
 * @param customers - Booking customers ordered by their creation time.
 * @returns The primary contact when present, otherwise the first customer, or
 * `null` when the booking has no customers.
 */
export function resolveDisplayCustomer<TCustomer>(
  customers: BookingCustomerForDisplay<TCustomer>[],
) {
  return (
    customers.find(
      (customer) => customer.role === BookingCustomerRole.PRIMARY_CONTACT,
    )?.customer ??
    customers[0]?.customer ??
    null
  );
}

/**
 * Summarizes the activity types in a booking for display in list-style interfaces.
 *
 * @param activities - The booking activities to summarize.
 * @param fallbackActivityType - An optional fallback activity type to use when no activities are present.
 * @returns A string summarizing the activity types, or a fallback string when no activities are present.
 */
export function summarizeBookingActivities(
  activities: Array<{ activityType: string | null }>,
  fallbackActivityType?: string | null,
) {
  const labels = activities
    .map((activity) => formatActivityType(activity.activityType))
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
