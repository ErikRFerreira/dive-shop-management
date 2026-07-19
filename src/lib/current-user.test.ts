import { beforeEach, expect, test, vi } from 'vitest';

import { UserRole } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock('@/features/auth/current-user', () => ({
  getCurrentUser: mocks.getAuthenticatedUser,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

import { getCurrentUser, requireCurrentUser } from './current-user';

const activeUser = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@example.test',
  role: UserRole.ADMIN,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAuthenticatedUser.mockResolvedValue(activeUser);
});

test('returns the database-backed current user unchanged', async () => {
  await expect(getCurrentUser()).resolves.toEqual(activeUser);
});

test('allows an active database-backed user through the protected guard', async () => {
  await expect(requireCurrentUser()).resolves.toEqual(activeUser);
  expect(mocks.redirect).not.toHaveBeenCalled();
});

test('redirects an inactive or otherwise rejected session to login', async () => {
  mocks.getAuthenticatedUser.mockResolvedValue(null);

  await expect(requireCurrentUser()).rejects.toThrow('redirect:/login');
  expect(mocks.redirect).toHaveBeenCalledWith('/login');
});
