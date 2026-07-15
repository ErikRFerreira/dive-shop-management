import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { BookingEditStatusContext } from '@/components/bookings/edit/booking-edit-status-context';
import { BookingStatus } from '@/generated/prisma/enums';

afterEach(cleanup);

test.each([
  [BookingStatus.DRAFT, 'Draft', 'This booking is still a draft.'],
  [
    BookingStatus.PENDING_APPROVAL,
    'Pending Approval',
    'This booking is waiting for an Admin or Manager to review it.',
  ],
  [
    BookingStatus.NEEDS_MORE_INFO,
    'Needs More Info',
    'Admin requested more information before this booking can be approved.',
  ],
  [BookingStatus.APPROVED, 'Approved', 'This booking has been approved.'],
  [
    BookingStatus.SCHEDULED,
    'Scheduled',
    'This booking is approved and included on the internal schedule.',
  ],
  [BookingStatus.CANCELLED, 'Cancelled', 'This booking has been cancelled.'],
])('shows edit context for the %s status', (status, label, description) => {
  render(
    <BookingEditStatusContext
      status={status}
      needsMoreInfoReason={null}
      adminNotes={null}
    />,
  );

  expect(screen.getAllByText(label)).toHaveLength(2);
  expect(screen.getByText(description, { exact: false })).not.toBeNull();
});

test('prefers the current Needs More Info reason over legacy admin notes', () => {
  render(
    <BookingEditStatusContext
      status={BookingStatus.NEEDS_MORE_INFO}
      needsMoreInfoReason="  Confirm the diver certification.  "
      adminNotes="Legacy review note."
    />,
  );

  expect(screen.getByText('Admin request')).not.toBeNull();
  expect(screen.getByText('Confirm the diver certification.')).not.toBeNull();
  expect(screen.queryByText('Legacy review note.')).toBeNull();
});

test('falls back to trimmed legacy admin notes', () => {
  render(
    <BookingEditStatusContext
      status={BookingStatus.NEEDS_MORE_INFO}
      needsMoreInfoReason="   "
      adminNotes="  Add the missing contact number.  "
    />,
  );

  expect(screen.getByText('Add the missing contact number.')).not.toBeNull();
});

test('shows the empty admin-note message when no request was recorded', () => {
  render(
    <BookingEditStatusContext
      status={BookingStatus.NEEDS_MORE_INFO}
      needsMoreInfoReason={null}
      adminNotes="   "
    />,
  );

  expect(screen.getByText('No admin note provided.')).not.toBeNull();
});
