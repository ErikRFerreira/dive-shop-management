import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import type { StaffUserListItem } from '@/features/settings/queries';
import type {
  StaffUserFilters,
  StaffUserListPagination,
} from '@/features/settings/types';
import { UserRole } from '@/generated/prisma/enums';
import { StaffUserList } from './staff-user-list';

afterEach(() => {
  cleanup();
});

const defaultFilters: StaffUserFilters = {
  search: '',
  role: undefined,
  status: 'all',
  page: 1,
};

/**
 * Builds one safe staff row for presentation tests.
 *
 * @param overrides - Staff fields to replace for a scenario.
 * @returns A complete page-facing staff user record.
 */
function staffUser(
  overrides: Partial<StaffUserListItem> = {},
): StaffUserListItem {
  return {
    id: 'staff-1',
    name: 'Casey Service',
    email: 'casey@example.test',
    role: UserRole.CUSTOMER_SERVICE,
    isActive: true,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-18T04:00:00.000Z'),
    ...overrides,
  };
}

/**
 * Renders the staff list with practical pagination defaults.
 *
 * @param staffUsers - Staff records to render.
 * @param options - Optional filter and pagination overrides.
 * @returns React Testing Library render result.
 */
function renderStaffUserList(
  staffUsers: StaffUserListItem[],
  options: {
    filters?: StaffUserFilters;
    pagination?: StaffUserListPagination;
  } = {},
) {
  return render(
    <StaffUserList
      filters={options.filters ?? defaultFilters}
      pagination={
        options.pagination ?? {
          totalCount: staffUsers.length,
          page: 1,
          pageSize: 10,
          totalPages: staffUsers.length > 0 ? 1 : 0,
        }
      }
      staffUsers={staffUsers}
    />,
  );
}

test('renders safe staff columns, friendly roles, statuses, and updated dates', () => {
  renderStaffUserList([
    staffUser(),
    staffUser({
      id: 'divemaster-1',
      name: 'Dina Divemaster',
      email: 'dina@example.test',
      role: UserRole.DIVEMASTER,
      isActive: false,
    }),
  ]);

  const table = screen.getByRole('table', { name: 'Staff users' });

  for (const heading of ['Name', 'Email', 'Role', 'Status', 'Updated']) {
    expect(within(table).getByRole('columnheader', { name: heading })).not.toBeNull();
  }

  const customerServiceRow = within(table)
    .getByText('Casey Service')
    .closest('tr');
  const divemasterRow = within(table)
    .getByText('Dina Divemaster')
    .closest('tr');

  expect(customerServiceRow).not.toBeNull();
  expect(divemasterRow).not.toBeNull();
  expect(within(customerServiceRow!).getByText('casey@example.test')).not.toBeNull();
  expect(within(customerServiceRow!).getByText('Customer Service')).not.toBeNull();
  expect(within(customerServiceRow!).getByText('Active')).not.toBeNull();
  expect(within(customerServiceRow!).getByText('18 Jul 2026')).not.toBeNull();
  expect(within(divemasterRow!).getByText('Divemaster')).not.toBeNull();
  expect(within(divemasterRow!).getByText('Inactive')).not.toBeNull();
  expect(within(table).queryByRole('columnheader', { name: 'Actions' })).toBeNull();
});

test('renders the unfiltered no-users state', () => {
  renderStaffUserList([]);

  expect(screen.getByText('No staff users yet.')).not.toBeNull();
  expect(screen.queryByRole('link', { name: 'Clear filters' })).toBeNull();
});

test('renders the filtered empty state with clear-filters recovery', () => {
  renderStaffUserList([], {
    filters: {
      search: 'missing',
      role: UserRole.INSTRUCTOR,
      status: 'inactive',
      page: 1,
    },
  });

  expect(screen.getByText('No staff users match these filters.')).not.toBeNull();
  expect(
    screen.getByRole('link', { name: 'Clear filters' }).getAttribute('href'),
  ).toBe('/settings');
});

test('uses staff-specific range copy and preserves filters in pagination', () => {
  renderStaffUserList(
    [staffUser({ id: 'staff-11', name: 'Last Staff User' })],
    {
      filters: {
        search: 'marina',
        role: UserRole.INSTRUCTOR,
        status: 'inactive',
        page: 2,
      },
      pagination: {
        totalCount: 11,
        page: 2,
        pageSize: 10,
        totalPages: 2,
      },
    },
  );

  expect(screen.getByText('Showing 11 to 11 of 11 staff users')).not.toBeNull();
  expect(screen.queryByText(/bookings/i)).toBeNull();
  expect(screen.getByRole('link', { name: '1' }).getAttribute('href')).toBe(
    '/settings?search=marina&role=INSTRUCTOR&status=inactive',
  );
});

