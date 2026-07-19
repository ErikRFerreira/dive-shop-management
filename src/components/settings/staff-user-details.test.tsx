import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import type { StaffUserDetail } from '@/features/settings/queries';
import { UserRole } from '@/generated/prisma/enums';
import { formatDisplayDateTime, formatEnumLabel } from '@/lib/format';
import { StaffUserDetails } from './staff-user-details';

vi.mock('@/features/settings/actions', () => ({
  updateStaffUser: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

afterEach(() => {
  cleanup();
});

const createdAt = new Date('2026-07-01T00:00:00.000Z');
const updatedAt = new Date('2026-07-18T04:00:00.000Z');

/**
 * Builds a safe staff-detail payload for presentation scenarios.
 *
 * @param role - Persisted role whose account and access summary should render.
 * @param overrides - Optional safe field replacements for the scenario.
 * @returns A complete page-facing staff record.
 */
function staffUser(
  role: UserRole,
  overrides: Partial<StaffUserDetail> = {},
): StaffUserDetail {
  return {
    id: `${role.toLowerCase()}-1`,
    name: `${formatEnumLabel(role)} User`,
    email: `${role.toLowerCase()}@example.test`,
    role,
    isActive: true,
    createdAt,
    updatedAt,
    ...overrides,
  };
}

test('renders read-only identity, account metadata, dates, and back navigation', () => {
  const user = staffUser(UserRole.ADMIN, {
    name: 'Avery Admin',
    email: 'avery@example.test',
  });

  render(<StaffUserDetails staffUser={user} />);

  expect(screen.getByRole('heading', { name: 'Avery Admin' })).not.toBeNull();
  expect(
    screen
      .getByRole('link', { name: 'Back to Staff Management' })
      .getAttribute('href'),
  ).toBe('/settings');

  const accountDetails = screen.getByRole('region', {
    name: 'Account Details',
  });

  expect(within(accountDetails).getByText('Avery Admin')).not.toBeNull();
  expect(within(accountDetails).getByText('avery@example.test')).not.toBeNull();
  expect(within(accountDetails).getByText('Admin')).not.toBeNull();
  expect(within(accountDetails).getByText('Active')).not.toBeNull();
  expect(
    within(accountDetails).getByText(formatDisplayDateTime(createdAt)),
  ).not.toBeNull();
  expect(
    within(accountDetails).getByText(formatDisplayDateTime(updatedAt)),
  ).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Edit Staff User' })).not.toBeNull();
});

test.each([
  [
    UserRole.ADMIN,
    'Full operational and staff-management access.',
    [
      'Dashboard',
      'Booking management',
      'Schedule and assignments',
      'Customer management',
      'Staff management',
      'Settings access',
    ],
  ],
  [
    UserRole.MANAGER,
    'Full operational access without Settings or staff management.',
    [
      'Dashboard',
      'Booking management',
      'Schedule and assignments',
      'Customer management',
    ],
  ],
  [
    UserRole.CUSTOMER_SERVICE,
    'Booking intake, Customers, and Schedule access.',
    ['Dashboard', 'Booking intake', 'Customer management', 'Schedule view'],
  ],
  [
    UserRole.INSTRUCTOR,
    'Global Schedule and My Assignments access.',
    ['Global Schedule', 'My Assignments'],
  ],
] as const)(
  'renders the approved %s platform access summary',
  (role, description, items) => {
    render(<StaffUserDetails staffUser={staffUser(role)} />);

    const platformAccess = screen.getByRole('region', {
      name: 'Platform Access',
    });
    const renderedItems = within(platformAccess)
      .getAllByRole('listitem')
      .map((item) => item.textContent);

    expect(within(platformAccess).getByText(description)).not.toBeNull();
    expect(renderedItems).toEqual(items);
  },
);

test('renders the DIVEMASTER assignment-only and no-login explanation', () => {
  render(<StaffUserDetails staffUser={staffUser(UserRole.DIVEMASTER)} />);

  const platformAccess = screen.getByRole('region', {
    name: 'Platform Access',
  });

  expect(
    within(platformAccess).getByText(
      'Assignment-only staff record. Can be assigned to scheduled activities but cannot sign in to the platform.',
    ),
  ).not.toBeNull();
  expect(
    within(platformAccess).getByText(
      'No platform areas are available for this role.',
    ),
  ).not.toBeNull();
  expect(within(platformAccess).queryByRole('list')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Edit Staff User' })).toBeNull();
  expect(
    screen.getByText('Assignment-only staff records are read-only in Settings.'),
  ).not.toBeNull();
});
