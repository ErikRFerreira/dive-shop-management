import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

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

vi.mock('@/components/login/login-form', () => ({
  default: ({ redirectTo }: { redirectTo?: string | null }) => (
    <div data-redirect-to={redirectTo ?? ''}>Login form</div>
  ),
}));

import LoginPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

test.each([
  [UserRole.ADMIN, '/dashboard'],
  [UserRole.MANAGER, '/dashboard'],
  [UserRole.CUSTOMER_SERVICE, '/dashboard'],
  [UserRole.INSTRUCTOR, '/assignments'],
] as const)(
  'redirects an already-authenticated %s to %s',
  async (role, destination) => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      name: 'Operations User',
      email: 'user@example.test',
      role,
    });

    await LoginPage({ searchParams: Promise.resolve({}) });

    expect(mocks.redirect).toHaveBeenCalledWith(destination);
  },
);

test('returns an authenticated user to a safe requested destination', async () => {
  mocks.getCurrentUser.mockResolvedValue({
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@example.test',
    role: UserRole.ADMIN,
  });

  await LoginPage({
    searchParams: Promise.resolve({
      callbackUrl: '/bookings?status=PENDING_APPROVAL',
    }),
  });

  expect(mocks.redirect).toHaveBeenCalledWith(
    '/bookings?status=PENDING_APPROVAL',
  );
});

test('passes only a validated destination to the login form', async () => {
  const safePage = await LoginPage({
    searchParams: Promise.resolve({ callbackUrl: '/schedule?range=week' }),
  });
  const unsafePage = await LoginPage({
    searchParams: Promise.resolve({ callbackUrl: 'https://evil.example' }),
  });

  const { unmount } = render(safePage);
  expect(screen.getByText('Login form').getAttribute('data-redirect-to')).toBe(
    '/schedule?range=week',
  );
  unmount();

  render(unsafePage);
  expect(screen.getByText('Login form').getAttribute('data-redirect-to')).toBe(
    '',
  );
});

test('renders seeded account emails without a password in development', async () => {
  vi.stubEnv('NODE_ENV', 'development');

  render(await LoginPage({ searchParams: Promise.resolve({}) }));

  expect(screen.getByText('Demo accounts')).toBeTruthy();
  expect(screen.getByText('admin@diveshop.local')).toBeTruthy();
  expect(screen.getByText('cs@diveshop.local')).toBeTruthy();
  expect(screen.getByText('erik@diveshop.local')).toBeTruthy();
  expect(screen.queryByText('password123')).toBeNull();
});

test('does not render demo account information in production', async () => {
  vi.stubEnv('NODE_ENV', 'production');

  render(await LoginPage({ searchParams: Promise.resolve({}) }));

  expect(screen.queryByText('Demo accounts')).toBeNull();
  expect(screen.queryByText('admin@diveshop.local')).toBeNull();
});
