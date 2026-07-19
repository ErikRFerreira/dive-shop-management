import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deactivateStaffUser: vi.fn(),
  reactivateStaffUser: vi.fn(),
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@/features/settings/actions', () => ({
  deactivateStaffUser: mocks.deactivateStaffUser,
  reactivateStaffUser: mocks.reactivateStaffUser,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess },
}));

import { StaffUserStatusAction } from './staff-user-status-action';

const activeStaffUser = {
  id: 'staff-1',
  name: 'Marina Manager',
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.deactivateStaffUser.mockResolvedValue({ success: true });
  mocks.reactivateStaffUser.mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
});

test('confirms deactivation with access-loss and history-retention copy', () => {
  render(
    <StaffUserStatusAction
      isCurrentUser={false}
      isFinalActiveAdmin={false}
      staffUser={activeStaffUser}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Deactivate account' }));
  const dialog = screen.getByRole('alertdialog');

  expect(
    within(dialog).getByRole('heading', {
      name: 'Deactivate Marina Manager?',
    }),
  ).not.toBeNull();
  expect(
    within(dialog).getByText(
      'This user will no longer be able to sign in or use the application. Existing bookings, assignments, and historical records will remain unchanged.',
    ),
  ).not.toBeNull();
  expect(within(dialog).getByRole('button', { name: 'Cancel' })).not.toBeNull();
});

test('closes, refreshes, and reports successful deactivation', async () => {
  render(
    <StaffUserStatusAction
      isCurrentUser={false}
      isFinalActiveAdmin={false}
      staffUser={activeStaffUser}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Deactivate account' }));
  const dialog = screen.getByRole('alertdialog');
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Deactivate account' }),
  );

  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  expect(mocks.deactivateStaffUser).toHaveBeenCalledWith({ userId: 'staff-1' });
  expect(mocks.refresh).toHaveBeenCalledOnce();
  expect(mocks.toastSuccess).toHaveBeenCalledWith(
    'Staff account deactivated.',
  );
});

test('confirms reactivation with existing credential and role copy', async () => {
  render(
    <StaffUserStatusAction
      isCurrentUser={false}
      isFinalActiveAdmin={false}
      staffUser={{ ...activeStaffUser, isActive: false }}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Reactivate account' }));
  const dialog = screen.getByRole('alertdialog');

  expect(
    within(dialog).getByRole('heading', {
      name: 'Reactivate Marina Manager?',
    }),
  ).not.toBeNull();
  expect(
    within(dialog).getByText(
      'This user will be able to sign in again using their existing password and assigned role.',
    ),
  ).not.toBeNull();

  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Reactivate account' }),
  );
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  expect(mocks.reactivateStaffUser).toHaveBeenCalledWith({ userId: 'staff-1' });
  expect(mocks.toastSuccess).toHaveBeenCalledWith(
    'Staff account reactivated.',
  );
});

test('makes self-deactivation unavailable with an explanation', () => {
  render(
    <StaffUserStatusAction
      isCurrentUser
      isFinalActiveAdmin={false}
      staffUser={activeStaffUser}
    />,
  );

  expect(
    screen.getByRole('button', { name: 'Deactivate account' }),
  ).toHaveProperty('disabled', true);
  expect(
    screen.getByText(
      'You cannot deactivate the account you are currently using.',
    ),
  ).not.toBeNull();
});

test('makes final-active-ADMIN deactivation unavailable with an explanation', () => {
  render(
    <StaffUserStatusAction
      isCurrentUser={false}
      isFinalActiveAdmin
      staffUser={activeStaffUser}
    />,
  );

  expect(
    screen.getByRole('button', { name: 'Deactivate account' }),
  ).toHaveProperty('disabled', true);
  expect(
    screen.getByText(
      'This account is the final active Admin and cannot be deactivated.',
    ),
  ).not.toBeNull();
});

test('prevents duplicate deactivation submissions while pending', async () => {
  let resolveAction: ((value: { success: true }) => void) | undefined;
  mocks.deactivateStaffUser.mockImplementation(
    () =>
      new Promise<{ success: true }>((resolve) => {
        resolveAction = resolve;
      }),
  );
  render(
    <StaffUserStatusAction
      isCurrentUser={false}
      isFinalActiveAdmin={false}
      staffUser={activeStaffUser}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Deactivate account' }));
  const dialog = screen.getByRole('alertdialog');
  const confirm = within(dialog).getByRole('button', {
    name: 'Deactivate account',
  });
  fireEvent.click(confirm);
  fireEvent.click(confirm);

  expect(mocks.deactivateStaffUser).toHaveBeenCalledOnce();
  expect(
    within(dialog).getByRole('button', { name: 'Deactivating...' }),
  ).toHaveProperty('disabled', true);

  resolveAction?.({ success: true });
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
});

test('keeps the dialog open and renders a safe action failure', async () => {
  mocks.deactivateStaffUser.mockResolvedValue({
    success: false,
    formError:
      'This account is the final active Admin and cannot be deactivated.',
  });
  render(
    <StaffUserStatusAction
      isCurrentUser={false}
      isFinalActiveAdmin={false}
      staffUser={activeStaffUser}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Deactivate account' }));
  const dialog = screen.getByRole('alertdialog');
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Deactivate account' }),
  );

  expect((await within(dialog).findByRole('alert')).textContent).toBe(
    'This account is the final active Admin and cannot be deactivated.',
  );
  expect(screen.getByRole('alertdialog')).not.toBeNull();
  expect(mocks.refresh).not.toHaveBeenCalled();
});
