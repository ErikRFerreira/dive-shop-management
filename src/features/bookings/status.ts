/**
 * Purpose: This module defines the permitted booking workflow transitions.
 * Workflow:
 * - `DRAFT` → `PENDING_APPROVAL`
 * - `PENDING_APPROVAL` → `NEEDS_MORE_INFO` | `CANCELLED` | `SCHEDULED`
 * - `NEEDS_MORE_INFO` → `PENDING_APPROVAL` | `CANCELLED`
 *
 * @module features/bookings/status
 */

import { BookingStatus } from '@/generated/prisma/enums';

/**
 * Valid Sprint 2 transitions, indexed by the booking's current status.
 *
 * `APPROVED` remains in the database enum for compatibility, but approval
 * transitions directly to `SCHEDULED` in this workflow.
 */
const bookingStatusTransitions: Partial<
  Record<BookingStatus, readonly BookingStatus[]>
> = {
  [BookingStatus.DRAFT]: [BookingStatus.PENDING_APPROVAL],
  [BookingStatus.PENDING_APPROVAL]: [
    BookingStatus.NEEDS_MORE_INFO,
    BookingStatus.CANCELLED,
    BookingStatus.SCHEDULED,
  ],
  [BookingStatus.NEEDS_MORE_INFO]: [
    BookingStatus.PENDING_APPROVAL,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.SCHEDULED]: [BookingStatus.CANCELLED],
};

/**
 * Determines whether a booking may move from one status to another.
 *
 * @returns `true` only for a defined Sprint 2 transition.
 */
export function canTransitionBookingStatus(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus,
) {
  return bookingStatusTransitions[currentStatus]?.includes(nextStatus) ?? false;
}

/**
 * Ensures a requested booking status transition is valid.
 *
 * @throws {Error} When the requested transition is not part of the Sprint 2
 * workflow.
 */
export function assertCanTransitionBookingStatus(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus,
) {
  if (!canTransitionBookingStatus(currentStatus, nextStatus)) {
    throw new Error(
      `Invalid booking status transition: ${currentStatus} -> ${nextStatus}.`,
    );
  }
}
