import { expect, test } from 'vitest';

import { UserRole } from '@/generated/prisma/enums';
import {
  createStaffUserSchema,
  parseStaffUserSearchParams,
  staffUserStatusActionSchema,
  updateStaffUserSchema,
} from './validation';

const validCreateInput = {
  name: 'Marina Staff',
  email: 'marina@example.test',
  password: 'secure-passphrase',
  role: UserRole.CUSTOMER_SERVICE,
};

test.each([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.CUSTOMER_SERVICE,
  UserRole.INSTRUCTOR,
])('accepts the supported %s login role for creation', (role) => {
  expect(createStaffUserSchema.safeParse({ ...validCreateInput, role }).success).toBe(
    true,
  );
});

test('trims identity fields, normalizes email, and defaults creation to active', () => {
  expect(
    createStaffUserSchema.parse({
      ...validCreateInput,
      name: '  Marina Staff  ',
      email: '  MARINA@EXAMPLE.TEST  ',
    }),
  ).toEqual({
    ...validCreateInput,
    name: 'Marina Staff',
    email: 'marina@example.test',
    isActive: true,
  });
});

test('accepts an explicitly inactive creation boolean', () => {
  expect(
    createStaffUserSchema.parse({ ...validCreateInput, isActive: false }),
  ).toMatchObject({ isActive: false });
});

test.each(['short-pass', 'x'.repeat(129)])(
  'rejects an invalid creation password',
  (password) => {
    expect(
      createStaffUserSchema.safeParse({ ...validCreateInput, password }).success,
    ).toBe(false);
  },
);

test.each([UserRole.DIVEMASTER, 'OWNER'])('rejects unsupported role %s', (role) => {
  expect(
    createStaffUserSchema.safeParse({ ...validCreateInput, role }).success,
  ).toBe(false);
});

test('rejects string booleans and unexpected create fields', () => {
  expect(
    createStaffUserSchema.safeParse({ ...validCreateInput, isActive: 'false' })
      .success,
  ).toBe(false);
  expect(
    createStaffUserSchema.safeParse({
      ...validCreateInput,
      passwordHash: 'manipulated',
    }).success,
  ).toBe(false);
});

test('normalizes supported edits and rejects immutable or arbitrary fields', () => {
  expect(
    updateStaffUserSchema.parse({
      userId: '  staff-1  ',
      name: '  Updated Staff  ',
      email: '  UPDATED@EXAMPLE.TEST ',
      role: UserRole.INSTRUCTOR,
    }),
  ).toEqual({
    userId: 'staff-1',
    name: 'Updated Staff',
    email: 'updated@example.test',
    role: UserRole.INSTRUCTOR,
  });

  expect(
    updateStaffUserSchema.safeParse({
      userId: 'staff-1',
      name: 'Updated Staff',
      email: 'updated@example.test',
      role: UserRole.DIVEMASTER,
      isActive: false,
    }).success,
  ).toBe(false);
});

test('accepts only a trimmed staff ID for account status actions', () => {
  expect(
    staffUserStatusActionSchema.parse({ userId: '  staff-1  ' }),
  ).toEqual({ userId: 'staff-1' });
  expect(
    staffUserStatusActionSchema.safeParse({
      userId: 'staff-1',
      isActive: false,
    }).success,
  ).toBe(false);
  expect(staffUserStatusActionSchema.safeParse({ userId: '' }).success).toBe(
    false,
  );
});

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
