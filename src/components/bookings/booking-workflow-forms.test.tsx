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
  ResubmitBookingForApprovalForm,
} from './booking-workflow-forms';

const reviewReadiness = [
  {
    label: 'Activity selected',
    status: 'complete' as const,
    description: 'At least one activity is selected.',
  },
  {
    label: 'Requested date set',
    status: 'missing' as const,
    description: 'Every activity needs a requested date before approval.',
  },
];

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

  expect(
    (screen.getByLabelText('Admin notes') as HTMLTextAreaElement).value,
  ).toBe('Approved for morning schedule.');
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

  expect(
    (screen.getByLabelText('Admin/schedule notes') as HTMLTextAreaElement)
      .value,
  ).toBe('Approved for morning schedule.');
  expect(
    screen.getByText('Optional notes for admin review or the internal schedule.'),
  ).not.toBeNull();
  const button = screen.getByRole('button', { name: 'Approve & Schedule' });
  const form = button.closest('form');

  expect(form).not.toBeNull();

  fireEvent.submit(form!);

  expect(mocks.approveBooking).toHaveBeenCalled();
});

test('renders and submits resubmission through the workflow action', () => {
  render(<ResubmitBookingForApprovalForm bookingId="booking-1" />);

  const button = screen.getByRole('button', {
    name: 'Resubmit for Approval',
  });
  const form = button.closest('form');

  expect(form).not.toBeNull();

  fireEvent.submit(form!);

  expect(mocks.resubmitBookingForApproval).toHaveBeenCalled();
});

test('shows approval in the review sidebar only for approvers on pending bookings', () => {
  const baseProps = {
    bookingId: 'booking-1',
    adminNotes: null,
    missingInformation: [],
    reviewReadiness,
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

test('shows compact review readiness in the review sidebar', () => {
  render(
    <BookingReviewSidebar
      bookingId="booking-1"
      adminNotes={null}
      canApprove
      missingInformation={[]}
      reviewReadiness={reviewReadiness}
      status={BookingStatus.PENDING_APPROVAL}
    />,
  );

  expect(screen.getByText('Review readiness')).not.toBeNull();
  expect(screen.getByText('Required checks 1/2')).not.toBeNull();
  expect(screen.getByText('Required checks only')).not.toBeNull();
  expect(screen.getByText('1 required item still missing.')).not.toBeNull();
  expect(screen.getByText('Activity selected')).not.toBeNull();
  expect(screen.getByText('Complete')).not.toBeNull();
  expect(screen.getByText('Requested date set')).not.toBeNull();
  expect(screen.getByText('Missing')).not.toBeNull();
});

test('shows complete required readiness copy without counting optional rows', () => {
  render(
    <BookingReviewSidebar
      bookingId="booking-1"
      adminNotes={null}
      canApprove
      missingInformation={[]}
      reviewReadiness={[
        {
          label: 'Activity selected',
          status: 'complete' as const,
          description: 'At least one activity is selected.',
        },
        {
          label: 'Requested date set',
          status: 'complete' as const,
          description: 'All activities have requested dates.',
        },
        {
          label: 'Deposit info',
          status: 'not required' as const,
          description: 'No paid deposit details are required.',
        },
        {
          label: 'Equipment sizing',
          status: 'recommended/optional' as const,
          description: 'Confirm whether rental equipment is needed when possible.',
        },
      ]}
      status={BookingStatus.PENDING_APPROVAL}
    />,
  );

  expect(screen.getByText('Required checks 2/2')).not.toBeNull();
  expect(
    screen.getByText(
      'Required information is complete. Optional details can still be added.',
    ),
  ).not.toBeNull();
  expect(screen.getByText('Not required')).not.toBeNull();
  expect(screen.getByText('Recommended/optional')).not.toBeNull();
});

test('shows approval as the default progressive admin decision', () => {
  render(
    <BookingReviewSidebar
      bookingId="booking-1"
      adminNotes={null}
      canApprove
      missingInformation={[]}
      reviewReadiness={reviewReadiness}
      status={BookingStatus.PENDING_APPROVAL}
    />,
  );

  expect(screen.getByText('Admin decision')).not.toBeNull();
  expect(
    screen.getByRole('button', { name: 'Approve & schedule' }),
  ).not.toBeNull();
  expect(
    screen.getByRole('button', { name: 'Request more information' }),
  ).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Cancel / reject' })).not.toBeNull();
  expect(
    screen.getByRole('button', { name: 'Approve & Schedule' }),
  ).not.toBeNull();
  expect(
    screen.queryByRole('button', { name: 'Mark as Needs More Info' }),
  ).toBeNull();
  expect(screen.queryByRole('button', { name: 'Cancel / Reject' })).toBeNull();
});

test('switches the admin decision panel to needs-more-info only', () => {
  render(
    <BookingReviewSidebar
      bookingId="booking-1"
      adminNotes={null}
      canApprove
      missingInformation={[]}
      reviewReadiness={reviewReadiness}
      status={BookingStatus.PENDING_APPROVAL}
    />,
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Request more information' }),
  );

  const reason = screen.getByLabelText('Reason');
  const form = reason.closest('form');

  expect(form).not.toBeNull();
  expect(
    screen.getByRole('button', { name: 'Mark as Needs More Info' }),
  ).not.toBeNull();
  expect(screen.queryByRole('button', { name: 'Approve & Schedule' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Cancel / Reject' })).toBeNull();

  fireEvent.change(reason, { target: { value: '   ' } });
  fireEvent.submit(form!);

  expect(
    screen.getByText('Enter a reason before requesting more information.'),
  ).not.toBeNull();
  expect(mocks.markBookingNeedsMoreInfo).not.toHaveBeenCalled();
});

test('switches the admin decision panel to cancellation only', () => {
  render(
    <BookingReviewSidebar
      bookingId="booking-1"
      adminNotes={null}
      canApprove
      missingInformation={[]}
      reviewReadiness={reviewReadiness}
      status={BookingStatus.PENDING_APPROVAL}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Cancel / reject' }));

  expect(screen.getByRole('button', { name: 'Cancel / Reject' })).not.toBeNull();
  expect(
    screen.getByText(
      'Cancelling does not delete the booking, customer, diver, or deposit data.',
    ),
  ).not.toBeNull();
  expect(screen.queryByRole('button', { name: 'Approve & Schedule' })).toBeNull();
  expect(
    screen.queryByRole('button', { name: 'Mark as Needs More Info' }),
  ).toBeNull();
});

test('shows cancellation in the review sidebar for scheduled bookings', () => {
  render(
    <BookingReviewSidebar
      bookingId="booking-1"
      adminNotes="Approved for morning schedule."
      canApprove
      missingInformation={[]}
      reviewReadiness={reviewReadiness}
      status={BookingStatus.SCHEDULED}
    />,
  );

  expect(
    screen.queryByRole('button', { name: 'Cancel Scheduled Booking' }),
  ).not.toBeNull();
  expect(screen.queryByRole('button', { name: 'Approve & Schedule' })).toBeNull();
});
