import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { BookingForm } from '@/components/bookings/booking-form';

const mocks = vi.hoisted(() => ({
  createBookingDraft: vi.fn(),
  resubmitEditedBookingForApproval: vi.fn(),
  submitEditedBookingForApproval: vi.fn(),
  submitBookingForApproval: vi.fn(),
  updateBooking: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/bookings/actions', () => ({
  createBookingDraft: mocks.createBookingDraft,
  resubmitEditedBookingForApproval: mocks.resubmitEditedBookingForApproval,
  submitEditedBookingForApproval: mocks.submitEditedBookingForApproval,
  submitBookingForApproval: mocks.submitBookingForApproval,
  updateBooking: mocks.updateBooking,
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

/**
 * Creates a promise that stays pending for action-state assertions.
 *
 * @returns A never-resolving promise for mocked server actions.
 */
function pendingPromise() {
  return new Promise(() => {});
}

/**
 * Enters enough free-form booking text to satisfy draft validation.
 */
function fillDraftBookingText() {
  fireEvent.change(document.querySelector('#rawBookingText')!, {
    target: { value: 'Walk-in inquiry for two divers tomorrow morning.' },
  });
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
    'lg:max-h-[calc(100svh+50px)]',
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

test('locks competing create actions while Save Draft is pending', async () => {
  mocks.createBookingDraft.mockReturnValue(pendingPromise());
  render(<BookingForm mode="create" />);

  fillDraftBookingText();

  const readiness = screen.getByTestId('booking-readiness-card');
  fireEvent.click(within(readiness).getByRole('button', { name: 'Save Draft' }));

  const saveDraft = await within(readiness).findByRole('button', {
    name: 'Saving draft...',
  });
  const submit = within(readiness).getByRole('button', {
    name: 'Submit for Approval',
  });
  const cancel = within(readiness).getByRole('button', { name: 'Cancel' });

  expect(saveDraft.hasAttribute('disabled')).toBe(true);
  expect(submit.hasAttribute('disabled')).toBe(true);
  expect(cancel.hasAttribute('disabled')).toBe(true);

  fireEvent.click(submit);

  expect(mocks.createBookingDraft).toHaveBeenCalledTimes(1);
  expect(mocks.submitBookingForApproval).not.toHaveBeenCalled();
});

test('locks competing create actions while Submit for Approval validates', async () => {
  render(<BookingForm mode="create" />);

  const readiness = screen.getByTestId('booking-readiness-card');
  fireEvent.click(
    within(readiness).getByRole('button', { name: 'Submit for Approval' }),
  );

  await within(readiness).findByRole('alert');

  await waitFor(() => {
    expect(
      within(readiness)
        .getByRole('button', { name: 'Submit for Approval' })
        .hasAttribute('disabled'),
    ).toBe(false);
  });
  expect(
    within(readiness)
      .getByRole('button', { name: 'Save Draft' })
      .hasAttribute('disabled'),
  ).toBe(false);
  expect(within(readiness).getByRole('link', { name: 'Cancel' })).not.toBeNull();
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
