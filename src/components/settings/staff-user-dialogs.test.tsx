import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import type { StaffLoginRole } from '@/features/settings/types';
import { UserRole } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  createStaffUser: vi.fn(),
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
  updateStaffUser: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess },
}));

vi.mock('@/features/settings/actions', () => ({
  createStaffUser: mocks.createStaffUser,
  updateStaffUser: mocks.updateStaffUser,
}));

vi.mock('@/components/ui/checkbox', () => ({
  /** Renders a native checkbox test double for the controlled Radix checkbox. */
  Checkbox({
    checked,
    onCheckedChange,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & {
    onCheckedChange?: (checked: boolean) => void;
  }) {
    return (
      <input
        {...props}
        checked={Boolean(checked)}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        type="checkbox"
      />
    );
  },
}));

vi.mock('@/components/ui/select', () => {
  /** Collects native options from the composed shadcn Select test tree. */
  function collectOptions(children: React.ReactNode): React.ReactNode[] {
    return React.Children.toArray(children).flatMap((child) => {
      if (!React.isValidElement<{ children?: React.ReactNode }>(child)) {
        return [];
      }

      if (child.type === SelectItem) {
        return child;
      }

      return collectOptions(child.props.children);
    });
  }

  /** Finds the composed trigger ID so the native select remains labelled. */
  function getTriggerId(children: React.ReactNode): string | undefined {
    for (const child of React.Children.toArray(children)) {
      if (
        !React.isValidElement<{ id?: string; children?: React.ReactNode }>(child)
      ) {
        continue;
      }

      if (child.type === SelectTrigger) {
        return child.props.id;
      }

      const nestedId = getTriggerId(child.props.children);
      if (nestedId) return nestedId;
    }

    return undefined;
  }

  /** Renders a native select test double for the controlled Radix component. */
  function Select({
    children,
    disabled,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onValueChange?: (value: string) => void;
    value?: string;
  }) {
    return (
      <select
        disabled={disabled}
        id={getTriggerId(children)}
        onChange={(event) => onValueChange?.(event.target.value)}
        value={value ?? ''}
      >
        <option value="">Select a role</option>
        {collectOptions(children)}
      </select>
    );
  }

  /** Passes mocked select content through to the native option collector. */
  function SelectContent({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }

  /** Renders one native role option. */
  function SelectItem({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) {
    return <option value={value}>{children}</option>;
  }

  /** Omits the visual Radix trigger because Select renders the native control. */
  function SelectTrigger() {
    return null;
  }

  /** Omits the visual Radix value because native select renders its value. */
  function SelectValue() {
    return null;
  }

  return { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
});

import { CreateStaffUserDialog } from './create-staff-user-dialog';
import {
  EditStaffUserDialog,
  type EditableStaffUser,
} from './edit-staff-user-dialog';

const manager: EditableStaffUser = {
  id: 'manager-1',
  name: 'Marina Manager',
  email: 'marina@example.test',
  role: UserRole.MANAGER,
};

/** Opens and completes every required create field with valid values. */
function fillCreateForm(
  role: StaffLoginRole = UserRole.CUSTOMER_SERVICE,
) {
  fireEvent.click(screen.getByRole('button', { name: 'Create Staff User' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Full name'), {
    target: { value: 'Marina Staff' },
  });
  fireEvent.change(within(dialog).getByLabelText('Email'), {
    target: { value: 'MARINA@EXAMPLE.TEST' },
  });
  fireEvent.change(within(dialog).getByLabelText('Role'), {
    target: { value: role },
  });
  fireEvent.change(within(dialog).getByLabelText('Initial password'), {
    target: { value: 'secure-passphrase' },
  });
  return dialog;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createStaffUser.mockResolvedValue({ success: true });
  mocks.updateStaffUser.mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
});

test('opens an accessible create dialog with safe defaults and approved copy', () => {
  render(<CreateStaffUserDialog />);
  fireEvent.click(screen.getByRole('button', { name: 'Create Staff User' }));
  const dialog = screen.getByRole('dialog');

  expect(within(dialog).getByLabelText('Full name')).not.toBeNull();
  expect(within(dialog).getByLabelText('Email')).not.toBeNull();
  expect(within(dialog).getByLabelText('Role')).not.toBeNull();
  expect(within(dialog).getByLabelText('Initial password')).toHaveProperty(
    'value',
    '',
  );
  expect(within(dialog).getByLabelText('Active')).toHaveProperty('checked', true);
  expect(
    within(dialog).getByText(
      'Set an initial password and share it with the staff member securely.',
    ),
  ).not.toBeNull();
  expect(
    within(dialog).queryByText(/change their password|first sign-in/i),
  ).toBeNull();

  const password = within(dialog).getByLabelText('Initial password');
  fireEvent.change(password, { target: { value: 'visible-passphrase' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Show password' }));
  expect(password).toHaveProperty('type', 'text');
  expect(
    within(dialog).getByRole('button', { name: 'Hide password' }),
  ).not.toBeNull();
});

test('updates the shared role description in the create dialog', () => {
  render(<CreateStaffUserDialog />);
  fireEvent.click(screen.getByRole('button', { name: 'Create Staff User' }));
  const dialog = screen.getByRole('dialog');

  fireEvent.change(within(dialog).getByLabelText('Role'), {
    target: { value: UserRole.INSTRUCTOR },
  });

  expect(
    within(dialog).getByText('Global Schedule and My Assignments access.'),
  ).not.toBeNull();
});

test('renders client validation and clears a rejected password', () => {
  render(<CreateStaffUserDialog />);
  fireEvent.click(screen.getByRole('button', { name: 'Create Staff User' }));
  const dialog = screen.getByRole('dialog');
  const password = within(dialog).getByLabelText('Initial password');
  fireEvent.change(password, { target: { value: 'short' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create Staff User' }));

  expect(within(dialog).getByText("Enter the staff member's full name.")).not.toBeNull();
  expect(within(dialog).getByText('Enter a valid email address.')).not.toBeNull();
  expect(within(dialog).getByText('Select a supported login role.')).not.toBeNull();
  expect(within(dialog).getByText('Password must be at least 12 characters.')).not.toBeNull();
  expect(password).toHaveProperty('value', '');
  expect(mocks.createStaffUser).not.toHaveBeenCalled();
});

test('closes and refreshes the staff list after successful creation', async () => {
  render(<CreateStaffUserDialog />);
  const dialog = fillCreateForm();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create Staff User' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(mocks.createStaffUser).toHaveBeenCalledWith({
    name: 'Marina Staff',
    email: 'marina@example.test',
    password: 'secure-passphrase',
    role: UserRole.CUSTOMER_SERVICE,
    isActive: true,
  });
  expect(mocks.refresh).toHaveBeenCalledOnce();
  expect(mocks.toastSuccess).toHaveBeenCalledWith('Staff user created.');
});

test('keeps create open, preserves safe values, and clears password on duplicate email', async () => {
  mocks.createStaffUser.mockResolvedValue({
    success: false,
    fieldErrors: {
      email: ['A staff account with this email already exists.'],
    },
  });
  render(<CreateStaffUserDialog />);
  const dialog = fillCreateForm(UserRole.INSTRUCTOR);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create Staff User' }));

  expect(
    await within(dialog).findByText(
      'A staff account with this email already exists.',
    ),
  ).not.toBeNull();
  expect(within(dialog).getByLabelText('Full name')).toHaveProperty(
    'value',
    'Marina Staff',
  );
  expect(within(dialog).getByLabelText('Initial password')).toHaveProperty(
    'value',
    '',
  );
  expect(screen.getByRole('dialog')).not.toBeNull();
});

test('prevents duplicate create submissions while the action is pending', async () => {
  let resolveAction: ((value: { success: true }) => void) | undefined;
  mocks.createStaffUser.mockImplementation(
    () =>
      new Promise<{ success: true }>((resolve) => {
        resolveAction = resolve;
      }),
  );
  render(<CreateStaffUserDialog />);
  const dialog = fillCreateForm();
  const submit = within(dialog).getByRole('button', {
    name: 'Create Staff User',
  });
  fireEvent.click(submit);
  fireEvent.click(submit);

  expect(mocks.createStaffUser).toHaveBeenCalledOnce();
  expect(submit.hasAttribute('disabled')).toBe(true);

  resolveAction?.({ success: true });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

test('opens a prepopulated edit dialog without credential or active controls', () => {
  render(<EditStaffUserDialog staffUser={manager} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Staff User' }));
  const dialog = screen.getByRole('dialog');

  expect(within(dialog).getByLabelText('Full name')).toHaveProperty(
    'value',
    manager.name,
  );
  expect(within(dialog).getByLabelText('Email')).toHaveProperty(
    'value',
    manager.email,
  );
  expect(within(dialog).getByLabelText('Role')).toHaveProperty(
    'value',
    UserRole.MANAGER,
  );
  expect(within(dialog).queryByLabelText(/password/i)).toBeNull();
  expect(within(dialog).queryByLabelText('Active')).toBeNull();
});

test('requires confirmation before granting ADMIN and then submits', async () => {
  render(<EditStaffUserDialog staffUser={manager} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Staff User' }));
  let dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Role'), {
    target: { value: UserRole.ADMIN },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

  expect(screen.getByRole('heading', { name: 'Grant Admin access?' })).not.toBeNull();
  expect(
    screen.getByText(/full staff-management access, including Settings access/i),
  ).not.toBeNull();
  expect(mocks.updateStaffUser).not.toHaveBeenCalled();

  dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Grant Admin access' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(mocks.updateStaffUser).toHaveBeenCalledWith({
    userId: manager.id,
    name: manager.name,
    email: manager.email,
    role: UserRole.ADMIN,
  });
});

test('requires confirmation before removing ADMIN access', () => {
  render(
    <EditStaffUserDialog
      staffUser={{ ...manager, id: 'admin-2', role: UserRole.ADMIN }}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Edit Staff User' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Role'), {
    target: { value: UserRole.MANAGER },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

  expect(screen.getByRole('heading', { name: 'Remove Admin access?' })).not.toBeNull();
  expect(
    screen.getByText(/removes Settings and staff-management access/i),
  ).not.toBeNull();
  expect(mocks.updateStaffUser).not.toHaveBeenCalled();
});
