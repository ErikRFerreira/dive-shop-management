/** @module features/bookings/permissions */

import { UserRole } from '@/generated/prisma/enums';
import type { CurrentUser } from '@/lib/current-user';

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
 */
export function canCreateBookingRequest(
  currentUser: Pick<CurrentUser, 'role'>,
) {
  return currentUser.role === UserRole.CUSTOMER_SERVICE;
}
