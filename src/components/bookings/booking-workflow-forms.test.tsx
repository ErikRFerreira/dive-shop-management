import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  approveBooking: vi.fn(),
  cancelBooking: vi.fn(),
  markBookingNeedsMoreInfo: vi.fn(),
  resubmitBookingForApproval: vi.fn(),
}));

vi.mock('@/features/bookings/actions', () => ({
  approveBooking: mocks.approveBooking,
  cancelBooking: mocks.cancelBooking,
  markBookingNeedsMoreInfo: mocks.markBookingNeedsMoreInfo,
  resubmitBookingForApproval: mocks.resubmitBookingForApproval,
}));

import { BookingStatus } from '@/generated/prisma/enums';
import { BookingReviewSidebar } from './booking-review-sidebar';
import {
  ApproveBookingForm,
  CancelBookingForm,
  MarkNeedsMoreInfoForm,
} from './booking-workflow-forms';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.approveBooking.mockResolvedValue({});
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
  render(
    <CancelBookingForm
      bookingId="booking-1"
      status={BookingStatus.PENDING_APPROVAL}
    />,
  );

  expect(
    screen.getByText(
      'Cancelling does not delete the booking, customer, diver, or deposit data.',
    ),
  ).not.toBeNull();
});

test('submits cancellation through the workflow action', () => {
  render(
    <CancelBookingForm
      bookingId="booking-1"
      status={BookingStatus.PENDING_APPROVAL}
    />,
  );

  const button = screen.getByRole('button', { name: 'Cancel / Reject' });
  const form = button.closest('form');

  expect(form).not.toBeNull();

  fireEvent.submit(form!);

  expect(mocks.cancelBooking).toHaveBeenCalled();
});

test('submits scheduled cancellation with optional admin notes', () => {
  render(
    <CancelBookingForm
      bookingId="booking-1"
      defaultAdminNotes="Approved for morning schedule."
      status={BookingStatus.SCHEDULED}
    />,
  );

  expect((screen.getByLabelText('Admin notes') as HTMLTextAreaElement).value).toBe(
    'Approved for morning schedule.',
  );
  const button = screen.getByRole('button', {
    name: 'Cancel Scheduled Booking',
  });
  const form = button.closest('form');

  expect(form).not.toBeNull();

  fireEvent.submit(form!);

  expect(mocks.cancelBooking).toHaveBeenCalled();
});

test('submits approval through the workflow action', () => {
  render(
    <ApproveBookingForm
      bookingId="booking-1"
      defaultAdminNotes="Approved for morning schedule."
    />,
  );

  expect((screen.getByLabelText('Admin notes') as HTMLTextAreaElement).value).toBe(
    'Approved for morning schedule.',
  );
  const button = screen.getByRole('button', { name: 'Approve & Schedule' });
  const form = button.closest('form');

  expect(form).not.toBeNull();

  fireEvent.submit(form!);

  expect(mocks.approveBooking).toHaveBeenCalled();
});

test('shows approval in the review sidebar only for approvers on pending bookings', () => {
  const baseProps = {
    bookingId: 'booking-1',
    adminNotes: null,
    rawBookingText: null,
    missingInformation: [],
  };

  const { rerender } = render(
    <BookingReviewSidebar
      {...baseProps}
      canApprove
      status={BookingStatus.PENDING_APPROVAL}
    />,
  );

  expect(
    screen.queryByRole('button', { name: 'Approve & Schedule' }),
  ).not.toBeNull();

  rerender(
    <BookingReviewSidebar
      {...baseProps}
      canApprove={false}
      status={BookingStatus.PENDING_APPROVAL}
    />,
  );

  expect(screen.queryByRole('button', { name: 'Approve & Schedule' })).toBeNull();

  rerender(
    <BookingReviewSidebar
      {...baseProps}
      canApprove
      status={BookingStatus.SCHEDULED}
    />,
  );

  expect(screen.queryByRole('button', { name: 'Approve & Schedule' })).toBeNull();
});

test('shows cancellation in the review sidebar for scheduled bookings', () => {
  render(
    <BookingReviewSidebar
      bookingId="booking-1"
      adminNotes="Approved for morning schedule."
      canApprove
      missingInformation={[]}
      rawBookingText={null}
      status={BookingStatus.SCHEDULED}
    />,
  );

  expect(
    screen.queryByRole('button', { name: 'Cancel Scheduled Booking' }),
  ).not.toBeNull();
  expect(screen.queryByRole('button', { name: 'Approve & Schedule' })).toBeNull();
});
