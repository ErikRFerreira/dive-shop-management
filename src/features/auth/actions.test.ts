import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/auth', () => ({
  signIn: mocks.signIn,
  signOut: mocks.signOut,
}));

vi.mock('next-auth', () => {
  class AuthError extends Error {
    type = 'AuthError';
  }

  class CredentialsSignin extends AuthError {
    type = 'CredentialsSignin';
  }

  return { AuthError, CredentialsSignin };
});

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

import { AuthError, CredentialsSignin } from 'next-auth';
import { loginWithCredentials, logout } from './actions';

/**
 * Builds browser form data for one credentials action test.
 *
 * @param email - Submitted email value.
 * @param password - Submitted password value.
 * @returns FormData containing both supported login fields.
 */
function buildLoginFormData(email: string, password: string) {
  const formData = new FormData();
  formData.set('email', email);
  formData.set('password', password);
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signIn.mockResolvedValue('/dashboard');
  mocks.signOut.mockResolvedValue(undefined);
});

test('normalizes valid input, signs in with Auth.js, and redirects', async () => {
  await loginWithCredentials(
    {},
    buildLoginFormData('  ADMIN@EXAMPLE.TEST ', 'submitted-password'),
  );

  expect(mocks.signIn).toHaveBeenCalledWith('credentials', {
    email: 'admin@example.test',
    password: 'submitted-password',
    redirect: false,
    redirectTo: '/dashboard',
  });
  expect(mocks.redirect).toHaveBeenCalledWith('/dashboard');
});

test('returns a field error for a malformed email', async () => {
  await expect(
    loginWithCredentials(
      {},
      buildLoginFormData('not-an-email', 'submitted-password'),
    ),
  ).resolves.toEqual({
    fieldErrors: {
      email: ['Enter a valid email address.'],
      password: undefined,
    },
  });

  expect(mocks.signIn).not.toHaveBeenCalled();
});

test('returns a field error for an empty password', async () => {
  await expect(
    loginWithCredentials({}, buildLoginFormData('admin@example.test', '')),
  ).resolves.toEqual({
    fieldErrors: {
      email: undefined,
      password: ['Enter your password.'],
    },
  });

  expect(mocks.signIn).not.toHaveBeenCalled();
});

test('maps invalid credentials to one safe message', async () => {
  mocks.signIn.mockRejectedValue(new CredentialsSignin());

  await expect(
    loginWithCredentials(
      {},
      buildLoginFormData('admin@example.test', 'incorrect-password'),
    ),
  ).resolves.toEqual({ formError: 'Invalid email or password.' });

  expect(mocks.redirect).not.toHaveBeenCalled();
});

test.each([
  ['another Auth.js failure', new AuthError('Auth configuration failed')],
  ['an unexpected server failure', new Error('Database unavailable')],
])('maps %s to a safe retry message', async (_label, error) => {
  mocks.signIn.mockRejectedValue(error);

  await expect(
    loginWithCredentials(
      {},
      buildLoginFormData('admin@example.test', 'submitted-password'),
    ),
  ).resolves.toEqual({
    formError: 'Unable to sign in right now. Please try again.',
  });

  expect(mocks.redirect).not.toHaveBeenCalled();
});

test('signs out through Auth.js and redirects to login', async () => {
  await logout();

  expect(mocks.signOut).toHaveBeenCalledWith({ redirectTo: '/login' });
});
