import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

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
  default: () => <div>Login form</div>,
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

test('redirects an already-authenticated active user to the dashboard', async () => {
  mocks.getCurrentUser.mockResolvedValue({
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@example.test',
    role: 'ADMIN',
  });

  await LoginPage();

  expect(mocks.redirect).toHaveBeenCalledWith('/dashboard');
});

test('renders seeded account emails without a password in development', async () => {
  vi.stubEnv('NODE_ENV', 'development');

  render(await LoginPage());

  expect(screen.getByText('Demo accounts')).toBeTruthy();
  expect(screen.getByText('admin@diveshop.local')).toBeTruthy();
  expect(screen.getByText('cs@diveshop.local')).toBeTruthy();
  expect(screen.getByText('mark@diveshop.local')).toBeTruthy();
  expect(screen.queryByText('password123')).toBeNull();
});

test('does not render demo account information in production', async () => {
  vi.stubEnv('NODE_ENV', 'production');

  render(await LoginPage());

  expect(screen.queryByText('Demo accounts')).toBeNull();
  expect(screen.queryByText('admin@diveshop.local')).toBeNull();
});
