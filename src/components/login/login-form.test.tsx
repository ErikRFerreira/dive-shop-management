import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loginWithCredentials: vi.fn(),
}));

vi.mock('@/features/auth/actions', () => ({
  loginWithCredentials: mocks.loginWithCredentials,
}));

import LoginExperience from './login-experience';

beforeEach(() => {
  mocks.loginWithCredentials.mockReset();
  mocks.loginWithCredentials.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

test('keeps browser validation and removes temporary login controls', () => {
  render(<LoginExperience />);

  const email = screen.getByLabelText('Email') as HTMLInputElement;
  const password = screen.getByLabelText('Password') as HTMLInputElement;

  expect(email.required).toBe(true);
  expect(email.type).toBe('email');
  expect(password.required).toBe(true);
  expect(password.type).toBe('password');
  expect(screen.queryByText('Remember me')).toBeNull();
  expect(screen.queryByText('Forgot password?')).toBeNull();
  expect(screen.queryByText('Try Dashboard')).toBeNull();
});

test('carries a validated callback destination in the login form', () => {
  render(<LoginExperience redirectTo="/bookings?status=PENDING_APPROVAL" />);

  const callbackInput = document.querySelector(
    'input[name="callbackUrl"]',
  ) as HTMLInputElement | null;

  expect(callbackInput?.type).toBe('hidden');
  expect(callbackInput?.value).toBe('/bookings?status=PENDING_APPROVAL');
});

test('renders accessible field and authentication errors returned by the action', async () => {
  mocks.loginWithCredentials.mockResolvedValue({
    fieldErrors: {
      email: ['Enter a valid email address.'],
      password: ['Enter your password.'],
    },
    formError: 'Invalid email or password.',
  });
  render(<LoginExperience />);

  fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);

  expect(await screen.findByText('Enter a valid email address.')).toBeTruthy();
  expect(screen.getByText('Enter your password.')).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toBe(
    'Invalid email or password.',
  );
  expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe(
    'true',
  );
});

test('shows a disabled pending state while preventing duplicate submissions', async () => {
  let resolveAction: ((value: Record<string, never>) => void) | undefined;
  mocks.loginWithCredentials.mockImplementation(
    () =>
      new Promise<Record<string, never>>((resolve) => {
        resolveAction = resolve;
      }),
  );
  render(<LoginExperience />);

  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'admin@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'submitted-password' },
  });
  fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);

  await waitFor(() => {
    const button = screen.getByRole('button', { name: 'Signing in...' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
  expect(mocks.loginWithCredentials).toHaveBeenCalledTimes(1);

  await act(async () => {
    resolveAction?.({});
  });

  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });
});

test.each([
  ['Admin', 'admin@diveshop.local'],
  ['Customer Service', 'cs@diveshop.local'],
  ['Instructor', 'erik@diveshop.local'],
])('fills only the %s development account email', (role, expectedEmail) => {
  render(<LoginExperience showDevelopmentAccountSelector />);

  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'manually-entered-password' },
  });

  fireEvent.click(screen.getByRole('button', { name: `Use ${role} demo account` }));

  expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe(
    expectedEmail,
  );
  expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe(
    '',
  );
});

test('does not render development account controls unless enabled by the server', () => {
  render(<LoginExperience />);

  expect(screen.queryByText('Demo accounts')).toBeNull();
});
