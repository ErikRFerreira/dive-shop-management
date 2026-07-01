import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { CustomerBookingHistory } from './customer-booking-history';

afterEach(() => {
  cleanup();
});

test('renders a clear empty state when the customer has no booking history', () => {
  render(<CustomerBookingHistory bookings={[]} />);

  expect(screen.getByText('Booking history')).not.toBeNull();
  expect(
    screen.getByText('This customer has no booking history yet.'),
  ).not.toBeNull();
});
