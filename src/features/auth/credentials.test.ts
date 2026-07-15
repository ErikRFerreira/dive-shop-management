import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock('@/features/auth/password', () => ({
  verifyPassword: mocks.verifyPassword,
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: mocks.findUnique,
    },
  },
}));

import { authorizeCredentials, credentialsSchema } from './credentials';
import { UserRole } from '@/generated/prisma/enums';

const persistedUser = {
  id: 'user-1',
  name: 'Admin User',
  email: 'admin@example.test',
  passwordHash: 'persisted-password-hash',
  isActive: true,
  role: UserRole.ADMIN,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique.mockResolvedValue(persistedUser);
  mocks.verifyPassword.mockResolvedValue(true);
});

test('normalizes email and returns only safe user fields for valid credentials', async () => {
  await expect(
    authorizeCredentials({
      email: '  ADMIN@EXAMPLE.TEST ',
      password: 'correct-password',
    }),
  ).resolves.toEqual({
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@example.test',
  });

  expect(mocks.findUnique).toHaveBeenCalledWith({
    where: { email: 'admin@example.test' },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      isActive: true,
      role: true,
    },
  });
  expect(mocks.verifyPassword).toHaveBeenCalledWith(
    'correct-password',
    'persisted-password-hash',
  );
});

test('normalizes valid login input with the shared credentials schema', () => {
  expect(
    credentialsSchema.parse({
      email: '  ADMIN@EXAMPLE.TEST ',
      password: 'submitted-password',
    }),
  ).toEqual({
    email: 'admin@example.test',
    password: 'submitted-password',
  });
});

test('rejects a malformed email without querying the database', async () => {
  await expect(
    authorizeCredentials({
      email: 'not-an-email',
      password: 'submitted-password',
    }),
  ).resolves.toBeNull();

  expect(mocks.findUnique).not.toHaveBeenCalled();
  expect(mocks.verifyPassword).not.toHaveBeenCalled();
});

test('rejects an empty password without querying the database', async () => {
  await expect(
    authorizeCredentials({ email: 'admin@example.test', password: '' }),
  ).resolves.toBeNull();

  expect(mocks.findUnique).not.toHaveBeenCalled();
  expect(mocks.verifyPassword).not.toHaveBeenCalled();
});

test.each([
  ['unknown user', null],
  ['inactive user', { ...persistedUser, isActive: false }],
  ['missing password hash', { ...persistedUser, passwordHash: null }],
])('rejects an %s with the generic null result', async (_label, user) => {
  mocks.findUnique.mockResolvedValue(user);

  await expect(
    authorizeCredentials({
      email: 'admin@example.test',
      password: 'submitted-password',
    }),
  ).resolves.toBeNull();

  expect(mocks.verifyPassword).not.toHaveBeenCalled();
});

test('rejects an invalid password with the generic null result', async () => {
  mocks.verifyPassword.mockResolvedValue(false);

  await expect(
    authorizeCredentials({
      email: 'admin@example.test',
      password: 'incorrect-password',
    }),
  ).resolves.toBeNull();
});

test('rejects an active divemaster before password verification', async () => {
  mocks.findUnique.mockResolvedValue({
    ...persistedUser,
    role: UserRole.DIVEMASTER,
  });

  await expect(
    authorizeCredentials({
      email: 'divemaster@example.test',
      password: 'correct-password',
    }),
  ).resolves.toBeNull();

  expect(mocks.verifyPassword).not.toHaveBeenCalled();
});

test('continues to authorize an active instructor', async () => {
  mocks.findUnique.mockResolvedValue({
    ...persistedUser,
    role: UserRole.INSTRUCTOR,
  });

  await expect(
    authorizeCredentials({
      email: 'instructor@example.test',
      password: 'correct-password',
    }),
  ).resolves.toEqual({
    id: persistedUser.id,
    name: persistedUser.name,
    email: persistedUser.email,
  });
});
