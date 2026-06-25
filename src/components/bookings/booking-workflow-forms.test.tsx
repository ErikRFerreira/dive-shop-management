import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cancelBooking: vi.fn(),
  markBookingNeedsMoreInfo: vi.fn(),
  resubmitBookingForApproval: vi.fn(),
}));

vi.mock('@/features/bookings/actions', () => ({
  cancelBooking: mocks.cancelBooking,
  markBookingNeedsMoreInfo: mocks.markBookingNeedsMoreInfo,
  resubmitBookingForApproval: mocks.resubmitBookingForApproval,
}));

import { CancelBookingForm, MarkNeedsMoreInfoForm } from './booking-workflow-forms';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cancelBooking.mockResolvedValue({});
  mocks.markBookingNeedsMoreInfo.mockResolvedValue({});
  mocks.resubmitBookingForApproval.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

test('shows an inline error and blocks whitespace-only reasons', () => {
  render(<MarkNeedsMoreInfoForm bookingId="booking-1" />);

  const reason = screen.getByLabelText('Reason');
  const form = reason.closest('form');

  expect(form).not.toBeNull();
  expect(reason.getAttribute('required')).toBeNull();

  fireEvent.change(reason, { target: { value: '   ' } });
  fireEvent.submit(form!);

  expect(
    screen.getByText('Enter a reason before requesting more information.'),
  ).not.toBeNull();
  expect(reason.getAttribute('aria-invalid')).toBe('true');
  expect(mocks.markBookingNeedsMoreInfo).not.toHaveBeenCalled();
});

test('shows cancellation preservation helper text', () => {
  render(<CancelBookingForm bookingId="booking-1" />);

  expect(
    screen.getByText(
      'Cancelling does not delete the booking, customer, diver, or deposit data.',
    ),
  ).not.toBeNull();
});

test('submits cancellation through the workflow action', () => {
  render(<CancelBookingForm bookingId="booking-1" />);

  const button = screen.getByRole('button', { name: 'Cancel / Reject' });
  const form = button.closest('form');

  expect(form).not.toBeNull();

  fireEvent.submit(form!);

  expect(mocks.cancelBooking).toHaveBeenCalled();
});
