import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
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

  expect(screen.getByTestId('booking-readiness-card').className).toContain(
    'lg:max-h-[calc(100svh-3rem)]',
  );
  expect(screen.getByTestId('booking-readiness-card').className).toContain(
    'lg:overflow-hidden',
  );
  expect(
    screen.getByTestId('booking-readiness-scroll-region').className,
  ).toContain('min-h-0');
  expect(
    screen.getByTestId('booking-readiness-scroll-region').className,
  ).toContain('lg:overflow-y-auto');
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

test('keeps create validation feedback in the single scroll region above rail actions', async () => {
  render(<BookingForm mode="create" />);

  const readiness = screen.getByTestId('booking-readiness-card');
  const scrollRegion = within(readiness).getByTestId(
    'booking-readiness-scroll-region',
  );
  const submit = within(readiness).getByRole('button', {
    name: 'Submit for Approval',
  });

  fireEvent.click(submit);

  const alert = await within(scrollRegion).findByRole('alert');

  expect(alert.className).not.toContain('max-h-44');
  expect(alert.className).not.toContain('overflow-y-auto');
  expectElementBefore(alert, submit);
});
