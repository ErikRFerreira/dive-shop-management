/**
 * Purpose: This file contains permission checks for booking-related actions in the application.
 * It provides functions to determine whether a user has the necessary role to perform
 * specific booking-related operations.
 *
 * @module features/bookings/permissions
 */

import { BookingStatus, UserRole } from '@/generated/prisma/enums';
import type { CurrentUser } from '@/lib/current-user';

import { canTransitionBookingStatus } from './status';

/**
 * Determines whether the current user is allowed to create a booking request.
 *
 * In the Sprint 1 workflow, Customer Service owns booking intake. Only users
 * with the `CUSTOMER_SERVICE` role may create booking requests; every other
 * role receives `false`.
 *
 * @param currentUser - The authenticated user's role.
 * @returns `true` only for Customer Service users.
 * @remarks Server Actions must call this before creating a booking request. UI
 * checks may use it to hide or disable controls, but they are not
 * authorization. The helper accepts only `role` because that is the only user
 * data needed for this decision.
 * In the future, if the workflow changes to allow other roles to create booking
 * requests, this function should be updated to reflect the new rules.
 */
export function canCreateBookingRequest(
  currentUser: Pick<CurrentUser, 'role'>,
) {
  return currentUser.role === UserRole.CUSTOMER_SERVICE;
}

/** Returns whether the current user may access the booking review workflow. */
export function canReviewBookingRequest(
  currentUser: Pick<CurrentUser, 'role'>,
) {
  return (
    currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER
  );
}

/**
 * Determines whether the current user may perform a booking status transition.
 *
 * Future Server Actions must call this after loading the booking's current
 * status and before persisting a status change. This is server-side
 * authorization; UI checks alone are insufficient.
 *
 * @returns `true` only when the transition is valid and permitted for the
 * user's role.
 */
export function canPerformBookingStatusTransition(
  currentUser: Pick<CurrentUser, 'role'>,
  currentStatus: BookingStatus,
  nextStatus: BookingStatus,
) {
  if (!canTransitionBookingStatus(currentStatus, nextStatus)) {
    return false;
  }

  if (
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.MANAGER
  ) {
    return true;
  }

  return (
    currentUser.role === UserRole.CUSTOMER_SERVICE &&
    currentStatus === BookingStatus.NEEDS_MORE_INFO &&
    nextStatus === BookingStatus.PENDING_APPROVAL
  );
}
