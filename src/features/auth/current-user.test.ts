import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: mocks.auth,
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: mocks.findUnique,
    },
  },
}));

import { getCurrentUser } from './current-user';
import { UserRole } from '@/generated/prisma/enums';

const persistedUser = {
  id: 'user-1',
  name: 'Admin User',
  email: 'admin@example.test',
  role: UserRole.ADMIN,
  isActive: true,
};

const currentUser = {
  id: 'user-1',
  name: 'Admin User',
  email: 'admin@example.test',
  role: UserRole.ADMIN,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({
    user: { id: 'user-1' },
    expires: '2099-01-01T00:00:00.000Z',
  });
  mocks.findUnique.mockResolvedValue(persistedUser);
});

test('returns null without an authenticated user ID', async () => {
  mocks.auth.mockResolvedValue(null);

  await expect(getCurrentUser()).resolves.toBeNull();
  expect(mocks.findUnique).not.toHaveBeenCalled();
});

test('loads the latest safe active user fields from Prisma', async () => {
  await expect(getCurrentUser()).resolves.toEqual(currentUser);

  expect(mocks.findUnique).toHaveBeenCalledWith({
    where: { id: 'user-1' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });
});

test.each([
  ['missing user', null],
  ['inactive user', { ...persistedUser, isActive: false }],
])('returns null for a %s', async (_label, user) => {
  mocks.findUnique.mockResolvedValue(user);

  await expect(getCurrentUser()).resolves.toBeNull();
});

test('rejects an active divemaster resolved from an existing session', async () => {
  mocks.findUnique.mockResolvedValue({
    ...persistedUser,
    role: UserRole.DIVEMASTER,
  });

  await expect(getCurrentUser()).resolves.toBeNull();
});

test('continues to resolve an active instructor', async () => {
  mocks.findUnique.mockResolvedValue({
    ...persistedUser,
    role: UserRole.INSTRUCTOR,
  });

  await expect(getCurrentUser()).resolves.toEqual({
    ...currentUser,
    role: UserRole.INSTRUCTOR,
  });
});

test('resolves an existing session normally after database reactivation', async () => {
  mocks.findUnique
    .mockResolvedValueOnce({ ...persistedUser, isActive: false })
    .mockResolvedValueOnce(persistedUser);

  await expect(getCurrentUser()).resolves.toBeNull();
  await expect(getCurrentUser()).resolves.toEqual(currentUser);
});
