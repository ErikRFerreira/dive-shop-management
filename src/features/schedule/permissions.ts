/**
 * Purpose: Permission helpers for schedule assignment management.
 *
 * @module features/schedule/permissions
 */

import { UserRole } from '@/generated/prisma/enums';
import type { CurrentUser } from '@/lib/current-user';

/**
 * Determines whether the current user can manage scheduled activity assignments.
 *
 * @param currentUser - The authenticated user's role.
 * @returns True only for Admin and Manager users.
 */
export function canManageScheduleAssignments(
  currentUser: Pick<CurrentUser, 'role'>,
) {
  return (
    currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER
  );
}

/**
 * Determines whether the current user can view their own assigned schedule work.
 *
 * @param currentUser - The authenticated user's role.
 * @returns True only for instructor users.
 */
export function canViewMyScheduleAssignments(
  currentUser: Pick<CurrentUser, 'role'>,
) {
  return currentUser.role === UserRole.INSTRUCTOR;
}

/**
 * Determines whether a user account role can be assigned to scheduled work.
 *
 * @param role - The persisted role on the user account.
 * @returns True for operational instructor and divemaster accounts.
 */
export function isAssignableStaffRole(role: UserRole) {
  return role === UserRole.INSTRUCTOR || role === UserRole.DIVEMASTER;
}
