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

const currentUser = {
  id: 'user-1',
  name: 'Admin User',
  email: 'admin@example.test',
  role: 'ADMIN',
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({
    user: { id: 'user-1' },
    expires: '2099-01-01T00:00:00.000Z',
  });
  mocks.findUnique.mockResolvedValue(currentUser);
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
  ['inactive user', { ...currentUser, isActive: false }],
])('returns null for a %s', async (_label, user) => {
  mocks.findUnique.mockResolvedValue(user);

  await expect(getCurrentUser()).resolves.toBeNull();
});
