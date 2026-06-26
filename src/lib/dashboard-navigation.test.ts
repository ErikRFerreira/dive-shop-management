import { expect, test } from 'vitest';

import {
  canAccessDashboardRoute,
  getDashboardNavigation,
} from '@/lib/dashboard-navigation';
import { UserRole } from '@/generated/prisma/enums';

test.each([
  [UserRole.ADMIN, ['dashboard', 'bookings', 'schedule', 'customers', 'settings']],
  [UserRole.MANAGER, ['dashboard', 'bookings', 'schedule', 'customers']],
  [UserRole.CUSTOMER_SERVICE, ['dashboard', 'bookings', 'schedule', 'customers']],
  [UserRole.INSTRUCTOR, ['dashboard']],
] as const)('returns the correct navigation for %s', (role, routeKeys) => {
  expect(getDashboardNavigation({ role }).map((route) => route.key)).toEqual(
    routeKeys,
  );
});

test('authorizes customer service to view customers', () => {
  expect(
    canAccessDashboardRoute({ role: UserRole.CUSTOMER_SERVICE }, 'customers'),
  ).toBe(true);
});

test('does not authorize instructors to view customers', () => {
  expect(canAccessDashboardRoute({ role: UserRole.INSTRUCTOR }, 'customers')).toBe(
    false,
  );
});

test('authorizes customer service but not instructors to view the schedule', () => {
  expect(
    canAccessDashboardRoute({ role: UserRole.CUSTOMER_SERVICE }, 'schedule'),
  ).toBe(true);
  expect(canAccessDashboardRoute({ role: UserRole.INSTRUCTOR }, 'schedule')).toBe(
    false,
  );
});
