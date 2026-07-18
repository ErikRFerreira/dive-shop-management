import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import Loading from './loading';

afterEach(() => {
  cleanup();
});

test('renders a five-column staff-specific Settings skeleton', () => {
  render(<Loading />);

  const table = screen.getByRole('table', { name: 'Loading staff users' });

  for (const heading of ['Name', 'Email', 'Role', 'Status', 'Updated']) {
    expect(within(table).getByRole('columnheader', { name: heading })).not.toBeNull();
  }

  expect(within(table).queryByRole('columnheader', { name: 'Actions' })).toBeNull();
  expect(screen.queryByText(/bookings/i)).toBeNull();
});

