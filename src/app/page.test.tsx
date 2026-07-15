import { beforeEach, expect, test, vi } from 'vitest';

import { UserRole } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/features/auth/current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

import Home from './page';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue(null);
});

test('redirects an unauthenticated root request directly to login', async () => {
  await Home();

  expect(mocks.redirect).toHaveBeenCalledWith('/login');
});

test.each([
  [UserRole.ADMIN, '/dashboard'],
  [UserRole.MANAGER, '/dashboard'],
  [UserRole.CUSTOMER_SERVICE, '/dashboard'],
  [UserRole.INSTRUCTOR, '/assignments'],
] as const)('redirects an authenticated %s from root to %s', async (role, path) => {
  mocks.getCurrentUser.mockResolvedValue({
    id: 'user-1',
    name: 'Operations User',
    email: 'user@example.test',
    role,
  });

  await Home();

  expect(mocks.redirect).toHaveBeenCalledWith(path);
});
