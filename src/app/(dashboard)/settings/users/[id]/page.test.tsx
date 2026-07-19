import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { UserRole } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  getHasAnotherActiveAdmin: vi.fn(),
  getStaffUserById: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('not-found');
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  requireCurrentUser: vi.fn(),
}));

vi.mock('@/features/settings/queries', () => ({
  getHasAnotherActiveAdmin: mocks.getHasAnotherActiveAdmin,
  getStaffUserById: mocks.getStaffUserById,
}));

vi.mock('@/lib/current-user', () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock('@/features/settings/actions', () => ({
  deactivateStaffUser: vi.fn(),
  reactivateStaffUser: vi.fn(),
  updateStaffUser: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
  useRouter: () => ({ refresh: vi.fn() }),
}));

import StaffUserDetailsPage from './page';

const admin = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@example.test',
  role: UserRole.ADMIN,
};

const staffUser = {
  id: 'staff-requested',
  name: 'Requested Staff',
  email: 'requested@example.test',
  role: UserRole.MANAGER,
  isActive: true,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-18T04:00:00.000Z'),
};

beforeEach(() => {
  mocks.getHasAnotherActiveAdmin.mockReset();
  mocks.getStaffUserById.mockReset();
  mocks.notFound.mockClear();
  mocks.redirect.mockClear();
  mocks.requireCurrentUser.mockReset();
  mocks.requireCurrentUser.mockResolvedValue(admin);
  mocks.getHasAnotherActiveAdmin.mockResolvedValue(true);
  mocks.getStaffUserById.mockResolvedValue(staffUser);
});

afterEach(() => {
  cleanup();
});

test('allows ADMIN to load the requested staff user details', async () => {
  render(
    await StaffUserDetailsPage({
      params: Promise.resolve({ id: 'staff-requested' }),
    }),
  );

  expect(
    screen.getByRole('heading', { name: 'Requested Staff' }),
  ).not.toBeNull();
  expect(mocks.getStaffUserById).toHaveBeenCalledWith(
    admin,
    'staff-requested',
  );
  expect(mocks.getHasAnotherActiveAdmin).not.toHaveBeenCalled();
});

test('shows the advisory block for a final active ADMIN', async () => {
  mocks.getStaffUserById.mockResolvedValue({
    ...staffUser,
    role: UserRole.ADMIN,
  });
  mocks.getHasAnotherActiveAdmin.mockResolvedValue(false);

  render(
    await StaffUserDetailsPage({
      params: Promise.resolve({ id: 'staff-requested' }),
    }),
  );

  expect(mocks.getHasAnotherActiveAdmin).toHaveBeenCalledWith(
    admin,
    'staff-requested',
  );
  expect(
    screen.getByText(
      'This account is the final active Admin and cannot be deactivated.',
    ),
  ).not.toBeNull();
  expect(
    screen.getByRole('button', { name: 'Deactivate account' }),
  ).toHaveProperty('disabled', true);
});

test.each([
  [UserRole.MANAGER, '/dashboard'],
  [UserRole.CUSTOMER_SERVICE, '/dashboard'],
  [UserRole.INSTRUCTOR, '/assignments'],
  [UserRole.DIVEMASTER, '/dashboard'],
] as const)('redirects %s before the staff-detail query', async (role, destination) => {
  mocks.requireCurrentUser.mockResolvedValue({
    ...admin,
    id: `${role}-1`,
    role,
  });

  await expect(
    StaffUserDetailsPage({
      params: Promise.resolve({ id: 'staff-requested' }),
    }),
  ).rejects.toThrow(`redirect:${destination}`);
  expect(mocks.getStaffUserById).not.toHaveBeenCalled();
});

test('uses not-found behavior when the requested staff user is missing', async () => {
  mocks.getStaffUserById.mockResolvedValue(null);

  await expect(
    StaffUserDetailsPage({
      params: Promise.resolve({ id: 'missing-staff' }),
    }),
  ).rejects.toThrow('not-found');
  expect(mocks.getStaffUserById).toHaveBeenCalledWith(admin, 'missing-staff');
  expect(mocks.notFound).toHaveBeenCalledOnce();
});
