import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import Loading from './loading';

afterEach(() => {
  cleanup();
});

test('renders a six-column staff-specific Settings skeleton', () => {
  render(<Loading />);

  const table = screen.getByRole('table', { name: 'Loading staff users' });

  for (const heading of ['Name', 'Email', 'Role', 'Status', 'Updated', 'Actions']) {
    expect(within(table).getByRole('columnheader', { name: heading })).not.toBeNull();
  }

  expect(table.classList.contains('block')).toBe(true);
  expect(table.classList.contains('xl:table')).toBe(true);
  expect(table.querySelector('thead')?.classList.contains('hidden')).toBe(true);
  expect(table.querySelector('tbody')?.classList.contains('block')).toBe(true);
  expect(table.querySelector('tbody tr')?.classList.contains('grid')).toBe(
    true,
  );
  expect(within(table).getAllByText('Email')).toHaveLength(6);
  expect(within(table).getAllByText('Role')).toHaveLength(6);
  expect(within(table).getAllByText('Status')).toHaveLength(6);
  expect(within(table).getAllByText('Updated')).toHaveLength(6);
  expect(screen.queryByText(/bookings/i)).toBeNull();
});
