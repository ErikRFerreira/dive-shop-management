import { describe, expect, test } from 'vitest';

import {
  getDefaultLandingPath,
  validateInternalRedirectDestination,
} from '@/features/auth/redirects';
import { UserRole } from '@/generated/prisma/enums';

describe('getDefaultLandingPath', () => {
  test.each([
    [UserRole.ADMIN, '/dashboard'],
    [UserRole.MANAGER, '/dashboard'],
    [UserRole.CUSTOMER_SERVICE, '/dashboard'],
    [UserRole.INSTRUCTOR, '/assignments'],
    [UserRole.DIVEMASTER, '/dashboard'],
  ] as const)('maps %s to %s', (role, destination) => {
    expect(getDefaultLandingPath(role)).toBe(destination);
  });
});

describe('validateInternalRedirectDestination', () => {
  test.each([
    ['/bookings/booking-1', '/bookings/booking-1'],
    [
      '/bookings?status=PENDING_APPROVAL&page=2',
      '/bookings?status=PENDING_APPROVAL&page=2',
    ],
    ['/schedule#today', '/schedule#today'],
  ])('accepts the local destination %s', (value, destination) => {
    expect(validateInternalRedirectDestination(value)).toBe(destination);
  });

  test.each([
    ['missing value', undefined],
    ['null value', null],
    ['empty value', ''],
    ['whitespace value', '   '],
    ['path without a leading slash', 'dashboard'],
    ['external absolute URL', 'https://evil.example/bookings'],
    ['protocol-relative URL', '//evil.example/bookings'],
    ['backslash-ambiguous URL', '/\\evil.example/bookings'],
    ['control-character URL', '/bookings\n/settings'],
    ['login route', '/login'],
    ['login route with a trailing slash', '/login/'],
    ['login route with a query', '/login?callbackUrl=/dashboard'],
  ])('rejects a %s', (_description, value) => {
    expect(validateInternalRedirectDestination(value)).toBeNull();
  });
});
