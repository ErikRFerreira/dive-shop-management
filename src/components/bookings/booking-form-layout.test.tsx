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

test('shows create validation feedback in the readiness region', async () => {
  render(<BookingForm mode="create" />);

  const readiness = screen.getByTestId('booking-readiness-card');
  const scrollRegion = within(readiness).getByTestId(
    'booking-readiness-scroll-region',
  );
  const submit = within(readiness).getByRole('button', {
    name: 'Submit for Approval',
  });

  fireEvent.click(submit);

  expect(await within(scrollRegion).findByRole('alert')).not.toBeNull();
});
