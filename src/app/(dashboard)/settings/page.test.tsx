import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { UserRole } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  getStaffUsers: vi.fn(),
  push: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  requireCurrentUser: vi.fn(),
}));

vi.mock('@/features/settings/queries', () => ({
  getStaffUsers: mocks.getStaffUsers,
}));

vi.mock('@/lib/current-user', () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ push: mocks.push }),
}));

import SettingsPage from './page';

const admin = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@example.test',
  role: UserRole.ADMIN,
};

beforeEach(() => {
  mocks.getStaffUsers.mockReset();
  mocks.push.mockReset();
  mocks.redirect.mockClear();
  mocks.requireCurrentUser.mockReset();
  mocks.requireCurrentUser.mockResolvedValue(admin);
  mocks.getStaffUsers.mockResolvedValue({
    staffUsers: [],
    pagination: {
      totalCount: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    },
  });
});

afterEach(() => {
  cleanup();
});

test('allows ADMIN to load Staff Settings with an honest create action', async () => {
  render(await SettingsPage({ searchParams: Promise.resolve({}) }));

  expect(screen.getByRole('heading', { name: 'Settings' })).not.toBeNull();
  expect(screen.getByRole('heading', { name: 'Staff Users' })).not.toBeNull();
  const createButton = screen.getByRole('button', {
    name: 'Create Staff User',
  });

  expect(createButton.hasAttribute('disabled')).toBe(true);
  expect(mocks.getStaffUsers).toHaveBeenCalledWith(admin, {
    search: '',
    role: undefined,
    status: 'all',
    page: 1,
  });
});

test.each([
  [UserRole.MANAGER, '/dashboard'],
  [UserRole.CUSTOMER_SERVICE, '/dashboard'],
  [UserRole.INSTRUCTOR, '/assignments'],
  [UserRole.DIVEMASTER, '/dashboard'],
] as const)('redirects %s before the staff query', async (role, destination) => {
  mocks.requireCurrentUser.mockResolvedValue({
    ...admin,
    id: `${role}-1`,
    role,
  });

  await expect(
    SettingsPage({ searchParams: Promise.resolve({}) }),
  ).rejects.toThrow(`redirect:${destination}`);
  expect(mocks.getStaffUsers).not.toHaveBeenCalled();
});

