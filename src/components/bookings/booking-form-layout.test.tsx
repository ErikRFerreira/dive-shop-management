import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { BookingForm } from '@/components/bookings/booking-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/bookings/actions', () => ({
  createBookingDraft: vi.fn(),
  resubmitEditedBookingForApproval: vi.fn(),
  submitEditedBookingForApproval: vi.fn(),
  submitBookingForApproval: vi.fn(),
  updateBooking: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage.clear();
});

/**
 * Asserts that one element appears before another in document order.
 *
 * @param first - Element expected to appear first.
 * @param second - Element expected to appear second.
 */
function expectElementBefore(first: HTMLElement, second: HTMLElement) {
  expect(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
}

test('renders create booking sections and readiness rail in the planned order', () => {
  render(<BookingForm mode="create" />);

  expectElementBefore(
    screen.getByText('Original booking message'),
    screen.getByText('Booking summary'),
  );
  expectElementBefore(
    screen.getByText('Booking summary'),
    screen.getByText('Activities'),
  );
  expectElementBefore(
    screen.getByText('Activities'),
    screen.getByText('Customers & divers'),
  );
  expectElementBefore(
    screen.getByText('Customers & divers'),
    screen.getByText('Deposit / payment'),
  );
  expectElementBefore(
    screen.getByText('Deposit / payment'),
    screen.getByTestId('booking-readiness-card'),
  );

  expect(
    screen.getByTestId('booking-readiness-card').parentElement?.className,
  ).toContain('lg:sticky');
});

test('renders create actions inside the booking readiness card', () => {
  render(<BookingForm mode="create" />);

  const readiness = screen.getByTestId('booking-readiness-card');
  const submit = within(readiness).getByRole('button', {
    name: 'Submit for Approval',
  });
  const saveDraft = within(readiness).getByRole('button', {
    name: 'Save Draft',
  });
  const cancel = within(readiness).getByRole('link', { name: 'Cancel' });

  expect(within(readiness).getByText('Booking readiness')).not.toBeNull();
  expectElementBefore(submit, saveDraft);
  expectElementBefore(saveDraft, cancel);
});
