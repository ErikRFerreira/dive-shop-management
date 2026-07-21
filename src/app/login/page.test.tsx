import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { UserRole } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  loginExperience: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/features/auth/current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@/components/login/login-experience', () => ({
  default: (props: {
    redirectTo?: string | null;
    showDevelopmentAccountSelector?: boolean;
  }) => {
    mocks.loginExperience(props);

    return (
      <>
        <div data-redirect-to={props.redirectTo ?? ''}>Login form</div>
        {props.showDevelopmentAccountSelector ? (
          <div>
            <p>Demo accounts</p>
            <span>admin@diveshop.local</span>
            <span>cs@diveshop.local</span>
            <span>erik@diveshop.local</span>
          </div>
        ) : null}
      </>
    );
  },
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

test('renders seeded account emails only when explicitly enabled in development', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('ENABLE_DEV_ACCOUNT_SELECTOR', 'true');
  vi.stubEnv('SEED_USER_PASSWORD', 'must-not-reach-the-client');

  render(await LoginPage({ searchParams: Promise.resolve({}) }));

  expect(screen.getByText('Demo accounts')).toBeTruthy();
  expect(screen.getByText('admin@diveshop.local')).toBeTruthy();
  expect(screen.getByText('cs@diveshop.local')).toBeTruthy();
  expect(screen.getByText('erik@diveshop.local')).toBeTruthy();
  const loginExperienceProps = mocks.loginExperience.mock.calls.at(-1)?.[0];

  expect(loginExperienceProps).not.toHaveProperty('demoPassword');
  expect(screen.queryByText('must-not-reach-the-client')).toBeNull();
});

test('does not render seeded accounts in development without the explicit flag', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('ENABLE_DEV_ACCOUNT_SELECTOR', 'false');

  render(await LoginPage({ searchParams: Promise.resolve({}) }));

  expect(screen.queryByText('Demo accounts')).toBeNull();
  expect(screen.queryByText('admin@diveshop.local')).toBeNull();
});

test('does not render seeded accounts in a Vercel Preview deployment', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('ENABLE_DEV_ACCOUNT_SELECTOR', 'true');

  render(await LoginPage({ searchParams: Promise.resolve({}) }));

  expect(screen.queryByText('Demo accounts')).toBeNull();
  expect(screen.queryByText('admin@diveshop.local')).toBeNull();
});

test('does not render seeded accounts in Vercel Production', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('ENABLE_DEV_ACCOUNT_SELECTOR', 'true');

  render(await LoginPage({ searchParams: Promise.resolve({}) }));

  expect(screen.queryByText('Demo accounts')).toBeNull();
  expect(screen.queryByText('admin@diveshop.local')).toBeNull();
});

test('does not render seeded accounts in a local production build', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('ENABLE_DEV_ACCOUNT_SELECTOR', 'true');

  render(await LoginPage({ searchParams: Promise.resolve({}) }));

  expect(screen.queryByText('Demo accounts')).toBeNull();
  expect(screen.queryByText('admin@diveshop.local')).toBeNull();
});
