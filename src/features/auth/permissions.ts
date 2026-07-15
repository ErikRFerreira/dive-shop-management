import { UserRole } from '@/generated/prisma/enums';

type RoleSubject = {
  role: UserRole;
};

/** Error raised when a protected server query is called without its required role capability. */
export class AuthorizationError extends Error {
  /** Creates the standard page-query authorization failure. */
  constructor(message = 'You do not have permission to access this data.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/** Throws a consistent authorization error before a protected query reaches Prisma. */
export function assertAuthorizedCapability(
  isAuthorized: boolean,
): asserts isAuthorized {
  if (!isAuthorized) {
    throw new AuthorizationError();
  }
}

/** Returns whether a persisted role is permitted to authenticate to the platform. */
export function canAccessPlatform(subject: RoleSubject) {
  return subject.role !== UserRole.DIVEMASTER;
}

/** Returns whether a user has full non-settings operational access. */
export function hasFullOperationalAccess(subject: RoleSubject) {
  return subject.role === UserRole.ADMIN || subject.role === UserRole.MANAGER;
}

/** Returns whether a user may access booking-management routes and queries. */
export function canAccessBookings(subject: RoleSubject) {
  return (
    hasFullOperationalAccess(subject) ||
    subject.role === UserRole.CUSTOMER_SERVICE
  );
}

/** Returns whether a user may create a booking request. */
export function canCreateBookingRequest(subject: RoleSubject) {
  return canAccessBookings(subject);
}

/** Returns whether a user may access customer routes and queries. */
export function canAccessCustomers(subject: RoleSubject) {
  return canAccessBookings(subject);
}

/** Returns whether a user may view the global operational schedule. */
export function canAccessGlobalSchedule(subject: RoleSubject) {
  return canAccessBookings(subject) || subject.role === UserRole.INSTRUCTOR;
}

/** Returns whether a user may access the instructor-facing personal assignments route. */
export function canAccessInstructorAssignments(subject: RoleSubject) {
  return subject.role === UserRole.INSTRUCTOR;
}

/** Returns whether a user may manage schedule assignments and scheduled days. */
export function canManageAssignments(subject: RoleSubject) {
  return hasFullOperationalAccess(subject);
}

/** Returns whether a user may access Settings. */
export function canAccessSettings(subject: RoleSubject) {
  return subject.role === UserRole.ADMIN;
}

/** Returns whether a user may create or administer platform staff accounts. */
export function canManageStaffUsers(subject: RoleSubject) {
  return subject.role === UserRole.ADMIN;
}
