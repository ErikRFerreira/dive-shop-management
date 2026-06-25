import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  markBookingNeedsMoreInfo: vi.fn(),
  resubmitBookingForApproval: vi.fn(),
}));

vi.mock('@/features/bookings/actions', () => ({
  markBookingNeedsMoreInfo: mocks.markBookingNeedsMoreInfo,
  resubmitBookingForApproval: mocks.resubmitBookingForApproval,
}));

import { MarkNeedsMoreInfoForm } from './booking-workflow-forms';

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
