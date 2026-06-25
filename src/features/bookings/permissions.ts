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

/**
 * Determines whether the current user is allowed to review a booking request.
 * Admin and Manager users may review any booking request. Customer Service
 * users may review only booking requests they originally created.
 *
 * @param currentUser - The authenticated user's role.
 * @returns `true` for Admin and Manager users, and for Customer Service users
 * who created the booking request.
 */
export function canReviewBookingRequest(
  currentUser: Pick<CurrentUser, 'role'>,
) {
  return (
    currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER
  );
}

/**
 * Determines whether the current user may approve and publish a booking.
 *
 * Approval is the administrative handoff from the review queue to the internal
 * schedule. Because that creates operational schedule data, only Admin and
 * Manager users may perform it, and Server Actions must enforce this helper
 * even when the approve button is hidden in the UI.
 *
 * @param currentUser - The authenticated user's role.
 * @returns `true` only for Admin and Manager users.
 */
export function canApproveBookingRequest(
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

/**
 * Determines whether a user may resubmit a booking that needs more details.
 *
 * Admin and Manager users may resubmit any visible booking. Customer Service
 * users may resubmit only booking requests they originally created.
 *
 * @param currentUser - The authenticated user's ID and role.
 * @param createdById - The ID of the user who created the booking request.
 * @returns `true` if the user may resubmit the booking for approval.
 */
export function canResubmitBookingForApproval(
  currentUser: Pick<CurrentUser, 'id' | 'role'>,
  createdById: string,
) {
  return (
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.MANAGER ||
    (currentUser.role === UserRole.CUSTOMER_SERVICE &&
      currentUser.id === createdById)
  );
}

/**
 * Determines whether a user may edit a booking without changing its workflow state.
 *
 * Admin and Manager users may edit any visible booking. Customer Service
 * users may edit only booking requests they originally created.
 *
 * @param currentUser - The authenticated user's ID and role.
 * @param createdById - The ID of the user who created the booking request.
 * @param status - The current status of the booking request.
 * @returns `true` if the user may edit the booking.
 */
export function canEditBooking(
  currentUser: Pick<CurrentUser, 'id' | 'role'>,
  createdById: string,
  status: BookingStatus,
) {
  if (
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.MANAGER
  ) {
    return (
      status === BookingStatus.DRAFT ||
      status === BookingStatus.PENDING_APPROVAL ||
      status === BookingStatus.NEEDS_MORE_INFO
    );
  }

  return (
    currentUser.role === UserRole.CUSTOMER_SERVICE &&
    currentUser.id === createdById &&
    (status === BookingStatus.DRAFT || status === BookingStatus.NEEDS_MORE_INFO)
  );
}
