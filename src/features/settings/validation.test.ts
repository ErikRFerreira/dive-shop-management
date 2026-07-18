import { expect, test } from 'vitest';

import { UserRole } from '@/generated/prisma/enums';
import { parseStaffUserSearchParams } from './validation';

test('parses and trims supported staff URL filters', () => {
  expect(
    parseStaffUserSearchParams({
      search: '  marina@example.test  ',
      role: UserRole.INSTRUCTOR,
      status: 'inactive',
      page: '3',
    }),
  ).toEqual({
    search: 'marina@example.test',
    role: UserRole.INSTRUCTOR,
    status: 'inactive',
    page: 3,
  });
});

test('falls back safely for invalid or repeated staff URL values', () => {
  expect(
    parseStaffUserSearchParams({
      search: ['admin', 'manager'],
      role: 'OWNER',
      status: 'suspended',
      page: '-4',
    }),
  ).toEqual({
    search: '',
    role: undefined,
    status: 'all',
    page: 1,
  });

  expect(
    parseStaffUserSearchParams({
      role: [UserRole.ADMIN],
      status: ['active'],
      page: ['2'],
    }),
  ).toEqual({
    search: '',
    role: undefined,
    status: 'all',
    page: 1,
  });
});

test('defaults missing staff URL filters', () => {
  expect(parseStaffUserSearchParams({})).toEqual({
    search: '',
    role: undefined,
    status: 'all',
    page: 1,
  });
});

