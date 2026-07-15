import { describe, expect, test } from 'vitest';

import { UserRole } from '@/generated/prisma/enums';
import {
  canAccessBookings,
  canAccessCustomers,
  canAccessGlobalSchedule,
  canAccessInstructorAssignments,
  canAccessPlatform,
  canAccessSettings,
  canCreateBookingRequest,
  canManageAssignments,
  canManageStaffUsers,
  hasFullOperationalAccess,
} from './permissions';

const expectedCapabilities = {
  [UserRole.ADMIN]: [true, true, true, true, true, false, true, true, true],
  [UserRole.MANAGER]: [true, true, true, true, true, false, true, false, false],
  [UserRole.CUSTOMER_SERVICE]: [
    true,
    false,
    true,
    true,
    true,
    false,
    false,
    false,
    false,
  ],
  [UserRole.INSTRUCTOR]: [
    true,
    false,
    false,
    false,
    true,
    true,
    false,
    false,
    false,
  ],
  [UserRole.DIVEMASTER]: [
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ],
} as const;

describe.each(Object.values(UserRole))('%s capability matrix', (role) => {
  test('matches the centralized role model', () => {
    const subject = { role };

    expect([
      canAccessPlatform(subject),
      hasFullOperationalAccess(subject),
      canAccessBookings(subject),
      canCreateBookingRequest(subject),
      canAccessGlobalSchedule(subject),
      canAccessInstructorAssignments(subject),
      canManageAssignments(subject),
      canAccessSettings(subject),
      canManageStaffUsers(subject),
    ]).toEqual(expectedCapabilities[role]);

    expect(canAccessCustomers(subject)).toBe(canAccessBookings(subject));
  });
});
