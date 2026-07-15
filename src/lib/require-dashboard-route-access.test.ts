import { beforeEach, expect, test, vi } from 'vitest';

import { UserRole } from '@/generated/prisma/enums';
import type { DashboardRouteKey } from '@/lib/dashboard-navigation';

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

import { requireDashboardRouteAccess } from './require-dashboard-route-access';

const routeMatrix: Record<UserRole, DashboardRouteKey[]> = {
  [UserRole.ADMIN]: ['dashboard', 'bookings', 'customers', 'schedule', 'settings'],
  [UserRole.MANAGER]: ['dashboard', 'bookings', 'customers', 'schedule'],
  [UserRole.CUSTOMER_SERVICE]: [
    'dashboard',
    'bookings',
    'customers',
    'schedule',
  ],
  [UserRole.INSTRUCTOR]: ['dashboard', 'schedule', 'assignments'],
  [UserRole.DIVEMASTER]: [],
};

beforeEach(() => {
  mocks.redirect.mockClear();
});

test.each(Object.values(UserRole))(
  'enforces every top-level route for %s',
  (role) => {
    const currentUser = {
      id: `${role.toLowerCase()}-1`,
      name: role,
      email: `${role.toLowerCase()}@example.test`,
      role,
    };

    for (const routeKey of [
      'dashboard',
      'bookings',
      'customers',
      'schedule',
      'assignments',
      'settings',
    ] as const) {
      if (routeMatrix[role].includes(routeKey)) {
        expect(() => requireDashboardRouteAccess(currentUser, routeKey)).not.toThrow();
      } else {
        const landingPath =
          role === UserRole.INSTRUCTOR ? '/assignments' : '/dashboard';
        expect(() => requireDashboardRouteAccess(currentUser, routeKey)).toThrow(
          `redirect:${landingPath}`,
        );
      }
    }
  },
);

test('denies instructors at the shared guard used by all dynamic booking routes', () => {
  const instructor = {
    id: 'instructor-1',
    name: 'Instructor',
    email: 'instructor@example.test',
    role: UserRole.INSTRUCTOR,
  };

  for (const route of ['booking detail', 'booking edit', 'booking review']) {
    expect(() => requireDashboardRouteAccess(instructor, 'bookings'), route).toThrow(
      'redirect:/assignments',
    );
  }
});
