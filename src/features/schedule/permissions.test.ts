import { expect, test } from 'vitest';

import {
  canManageScheduleAssignments,
  canViewMyScheduleAssignments,
  isAssignableStaffRole,
} from '@/features/schedule/permissions';
import { UserRole } from '@/generated/prisma/enums';

test('allows only admins and managers to manage schedule assignments', () => {
  expect(canManageScheduleAssignments({ role: UserRole.ADMIN })).toBe(true);
  expect(canManageScheduleAssignments({ role: UserRole.MANAGER })).toBe(true);
  expect(
    canManageScheduleAssignments({ role: UserRole.CUSTOMER_SERVICE }),
  ).toBe(false);
  expect(canManageScheduleAssignments({ role: UserRole.INSTRUCTOR })).toBe(
    false,
  );
  expect(canManageScheduleAssignments({ role: UserRole.DIVEMASTER })).toBe(
    false,
  );
});

test('allows assignable staff roles to view their own schedule assignments', () => {
  expect(canViewMyScheduleAssignments({ role: UserRole.INSTRUCTOR })).toBe(true);
  expect(canViewMyScheduleAssignments({ role: UserRole.DIVEMASTER })).toBe(true);
  expect(canViewMyScheduleAssignments({ role: UserRole.ADMIN })).toBe(false);
  expect(canViewMyScheduleAssignments({ role: UserRole.MANAGER })).toBe(false);
  expect(
    canViewMyScheduleAssignments({ role: UserRole.CUSTOMER_SERVICE }),
  ).toBe(false);
});

test('identifies instructor and divemaster accounts as assignable staff', () => {
  expect(isAssignableStaffRole(UserRole.INSTRUCTOR)).toBe(true);
  expect(isAssignableStaffRole(UserRole.DIVEMASTER)).toBe(true);
  expect(isAssignableStaffRole(UserRole.ADMIN)).toBe(false);
  expect(isAssignableStaffRole(UserRole.MANAGER)).toBe(false);
  expect(isAssignableStaffRole(UserRole.CUSTOMER_SERVICE)).toBe(false);
});
