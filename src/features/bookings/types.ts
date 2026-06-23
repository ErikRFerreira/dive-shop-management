/**
 * Purpose: This file contains type definitions for booking-related entities in the application.
 * It provides types for booking statuses, filters, and other related constructs.
 *
 * @module features/bookings/types
 */

import { BookingStatus } from '@/generated/prisma/enums';

/**
 * Booking statuses that can be selected in the internal booking-list filter.
 *
 * @remarks Excludes `SCHEDULED` because the MVP schedule is not the source of
 * truth for booking requests.
 */
export const bookingStatusFilters = [
  BookingStatus.DRAFT,
  BookingStatus.PENDING_APPROVAL,
  BookingStatus.NEEDS_MORE_INFO,
  BookingStatus.APPROVED,
  BookingStatus.CANCELLED,
] as const;

/** A permitted value for the booking-list status filter. */
export type BookingStatusFilter = (typeof bookingStatusFilters)[number];

/**
 * Conditions used to scope an internal booking-list query.
 *
 * @remarks This is intentionally limited to the predicates produced by
 * `buildBookingRequestWhere`; it is not a general-purpose Prisma where input.
 */
export type BookingRequestFilter = {
  status?: BookingStatusFilter;
  createdById?: string;
  id?: { in: string[] };
};
