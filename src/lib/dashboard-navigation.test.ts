import { expect, test } from 'vitest';

import {
  canAccessDashboardRoute,
  dashboardRoutes,
  getDashboardNavigation,
} from '@/lib/dashboard-navigation';
import { UserRole } from '@/generated/prisma/enums';

test.each([
  [
    UserRole.ADMIN,
    [
      'dashboard',
      'bookings',
      'schedule',
      'customers',
      'settings',
    ],
  ],
  [UserRole.MANAGER, ['dashboard', 'bookings', 'schedule', 'customers']],
  [UserRole.CUSTOMER_SERVICE, ['dashboard', 'bookings', 'schedule', 'customers']],
  [UserRole.INSTRUCTOR, ['dashboard', 'schedule', 'assignments']],
  [UserRole.DIVEMASTER, []],
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
  expect(
    canAccessDashboardRoute({ role: UserRole.INSTRUCTOR }, 'customers'),
  ).toBe(false);
});

test('authorizes customer service and instructors to view the schedule', () => {
  expect(
    canAccessDashboardRoute({ role: UserRole.CUSTOMER_SERVICE }, 'schedule'),
  ).toBe(true);
  expect(canAccessDashboardRoute({ role: UserRole.INSTRUCTOR }, 'schedule')).toBe(
    true,
  );
});

test('authorizes only instructors to view personal assignments', () => {
  expect(
    canAccessDashboardRoute({ role: UserRole.INSTRUCTOR }, 'assignments'),
  ).toBe(true);
  expect(
    canAccessDashboardRoute({ role: UserRole.DIVEMASTER }, 'assignments'),
  ).toBe(false);
  expect(canAccessDashboardRoute({ role: UserRole.ADMIN }, 'assignments')).toBe(
    false,
  );
  expect(canAccessDashboardRoute({ role: UserRole.MANAGER }, 'assignments')).toBe(
    false,
  );
  expect(
    canAccessDashboardRoute({ role: UserRole.CUSTOMER_SERVICE }, 'assignments'),
  ).toBe(false);
});

test('places assignments after schedule in the dashboard route registry', () => {
  const routeKeys = dashboardRoutes.map((route) => route.key);

  expect(routeKeys.indexOf('assignments')).toBeGreaterThan(
    routeKeys.indexOf('schedule'),
  );
});

test('shows Settings navigation only to ADMIN', () => {
  for (const role of Object.values(UserRole)) {
    const settingsRoute = getDashboardNavigation({ role }).find(
      (route) => route.key === 'settings',
    );

    expect(Boolean(settingsRoute)).toBe(role === UserRole.ADMIN);
  }
});
