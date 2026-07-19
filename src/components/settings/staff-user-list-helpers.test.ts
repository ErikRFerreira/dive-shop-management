import { expect, test } from 'vitest';

import { UserRole } from '@/generated/prisma/enums';
import {
  buildStaffUserListHref,
  getVisibleStaffUserPages,
  hasActiveStaffUserFilters,
} from './staff-user-list-helpers';

test('builds normalized Settings URLs that preserve staff filters', () => {
  expect(
    buildStaffUserListHref({
      search: '  marina  ',
      role: UserRole.MANAGER,
      status: 'active',
      page: 3,
    }),
  ).toBe('/settings?search=marina&role=MANAGER&status=active&page=3');

  expect(
    buildStaffUserListHref({
      search: '',
      role: undefined,
      status: 'all',
      page: 1,
    }),
  ).toBe('/settings');
});

test('detects active staff filters without treating pagination as a filter', () => {
  expect(
    hasActiveStaffUserFilters({
      search: '',
      role: undefined,
      status: 'all',
      page: 4,
    }),
  ).toBe(false);
  expect(
    hasActiveStaffUserFilters({
      search: '',
      role: UserRole.ADMIN,
      status: 'all',
      page: 1,
    }),
  ).toBe(true);
});

test('returns compact visible staff pagination pages', () => {
  expect(getVisibleStaffUserPages(1, 8)).toEqual([1, 2, 3, 4, 8]);
  expect(getVisibleStaffUserPages(5, 8)).toEqual([1, 4, 5, 6, 8]);
});
