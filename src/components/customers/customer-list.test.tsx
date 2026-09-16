import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import type { CustomerListPagination } from '@/features/customers/queries';
import type { CustomerSearchResult } from '@/features/customers/types';
import {
  ActivityType,
  PreferredLanguage,
} from '@/generated/prisma/enums';
import { CustomerList } from './customer-list';

const customer: CustomerSearchResult = {
  id: 'customer-1',
  name: 'Aisha Rahman',
  fullName: 'Aisha Rahman',
  firstName: null,
  lastName: null,
  chineseName: null,
  hotel: null,
  preferredLanguage: PreferredLanguage.ENGLISH,
  certificationLevel: 'Advanced Open Water',
  certificationAgency: null,
  lastDiveDate: new Date('2026-07-15T00:00:00.000Z'),
  divesLogged: 47,
  email: 'aisha.rahman@example.test',
  phone: null,
  weChatId: null,
  whatsAppNumber: '+65 8123 7741',
  lastBookingDate: new Date('2026-09-20T00:00:00.000Z'),
  lastActivity: ActivityType.FUN_DIVE,
  bookingCount: 2,
};

const singlePagePagination: CustomerListPagination = {
  totalCount: 1,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};

afterEach(() => {
  cleanup();
});

test('renders each compact customer row as one labeled responsive card', () => {
  render(
    <CustomerList
      customers={[customer]}
      emptyDescription="No customers."
      emptyTitle="No customers found."
      pagination={singlePagePagination}
      query=""
    />,
  );

  const viewLink = screen.getByRole('link', { name: 'View' });
  const row = viewLink.closest('tr');
  const tableHeader = screen
    .getByRole('table')
    .querySelector('[data-slot="table-header"]');

  expect(row).not.toBeNull();
  expect(tableHeader).not.toBeNull();
  expect(row?.classList.contains('grid')).toBe(true);
  expect(row?.classList.contains('xl:table-row')).toBe(true);
  expect(tableHeader?.classList.contains('hidden')).toBe(true);
  expect(within(row!).getByText('Contact')).not.toBeNull();
  const bookingHistoryLabel = within(row!).getByText('Booking history');
  const diveProfileLabel = within(row!).getByText('Dive profile');

  expect(bookingHistoryLabel.closest('td')?.classList.contains('col-span-2')).toBe(
    true,
  );
  expect(diveProfileLabel.closest('td')?.classList.contains('col-span-2')).toBe(
    true,
  );
  expect(within(row!).getByText('Aisha Rahman')).not.toBeNull();
  expect(within(row!).getByText('Advanced Open Water')).not.toBeNull();
  expect(viewLink.getAttribute('href')).toBe('/customers/customer-1');
  expect(screen.getAllByRole('link', { name: 'View' })).toHaveLength(1);
});

test('centers mobile pagination and preserves the active search query', () => {
  render(
    <CustomerList
      customers={[customer]}
      emptyDescription="No customers."
      emptyTitle="No customers found."
      pagination={{
        totalCount: 21,
        page: 1,
        pageSize: 10,
        totalPages: 3,
      }}
      query="Maria Santos"
    />,
  );

  const pagination = screen.getByRole('navigation', { name: 'pagination' });

  expect(pagination.classList.contains('justify-center')).toBe(true);
  expect(pagination.classList.contains('sm:justify-end')).toBe(true);
  expect(pagination.parentElement?.classList.contains('w-full')).toBe(true);
  expect(pagination.parentElement?.classList.contains('sm:w-auto')).toBe(true);
  expect(screen.getByRole('link', { name: '2' }).getAttribute('href')).toBe(
    '/customers?q=Maria+Santos&page=2&pageSize=10',
  );
  expect(screen.getByText('Showing 1 of 21 customers')).not.toBeNull();
});

test('renders the supplied customer empty state without pagination', () => {
  render(
    <CustomerList
      customers={[]}
      emptyDescription="Try another customer search."
      emptyTitle="No customers found."
      pagination={{
        totalCount: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      }}
      query="missing"
    />,
  );

  expect(screen.getByText('No customers found.')).not.toBeNull();
  expect(screen.getByText('Try another customer search.')).not.toBeNull();
  expect(screen.queryByRole('table')).toBeNull();
  expect(screen.queryByRole('navigation', { name: 'pagination' })).toBeNull();
});
