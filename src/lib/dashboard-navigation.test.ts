import { expect, test } from 'vitest';

import {
  canAccessDashboardRoute,
  getDashboardNavigation,
} from '@/lib/dashboard-navigation';
import { UserRole } from '@/generated/prisma/enums';

test.each([
  [UserRole.ADMIN, ['dashboard', 'bookings', 'schedule', 'customers', 'settings']],
  [UserRole.MANAGER, ['dashboard', 'bookings', 'schedule', 'customers']],
  [UserRole.CUSTOMER_SERVICE, ['dashboard', 'bookings']],
  [UserRole.INSTRUCTOR, ['dashboard', 'schedule']],
] as const)('returns the correct navigation for %s', (role, routeKeys) => {
  expect(getDashboardNavigation({ role }).map((route) => route.key)).toEqual(
    routeKeys,
  );
});

test('does not authorize customer service to view customers', () => {
  expect(
    canAccessDashboardRoute({ role: UserRole.CUSTOMER_SERVICE }, 'customers'),
  ).toBe(false);
});
