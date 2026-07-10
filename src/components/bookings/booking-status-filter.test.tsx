import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { BookingStatus } from '@/generated/prisma/enums';
import { BookingStatusFilter } from './booking-status-filter';

afterEach(() => {
  cleanup();
});

/**
 * Renders the status filter with default props for interaction tests.
 *
 * @param props - Optional selected and pending state overrides.
 * @returns The filter selection spy used by the rendered component.
 */
function renderBookingStatusFilter(
  props: Partial<Parameters<typeof BookingStatusFilter>[0]> = {},
) {
  const onFilterSelect = vi.fn();

  render(
    <BookingStatusFilter
      onFilterSelect={onFilterSelect}
      pageSize={10}
      selectedQueue={props.selectedQueue}
      selectedSort="activity-date"
      selectedStatus={props.selectedStatus}
      {...props}
    />,
  );

  return onFilterSelect;
}

test.each<[string, string, BookingStatus]>([
  ['All', '/bookings?sort=activity-date&page=1&pageSize=10', BookingStatus.DRAFT],
  [
    'Draft',
    '/bookings?status=DRAFT&sort=activity-date&page=1&pageSize=10',
    BookingStatus.APPROVED,
  ],
  [
    'Pending Approval',
    '/bookings?status=PENDING_APPROVAL&sort=activity-date&page=1&pageSize=10',
    BookingStatus.DRAFT,
  ],
  [
    'Needs More Info',
    '/bookings?status=NEEDS_MORE_INFO&sort=activity-date&page=1&pageSize=10',
    BookingStatus.DRAFT,
  ],
  [
    'Approved',
    '/bookings?status=APPROVED&sort=activity-date&page=1&pageSize=10',
    BookingStatus.DRAFT,
  ],
  [
    'Cancelled',
    '/bookings?status=CANCELLED&sort=activity-date&page=1&pageSize=10',
    BookingStatus.DRAFT,
  ],
  [
    'Unassigned',
    '/bookings?queue=unassigned&sort=activity-date&page=1&pageSize=10',
    BookingStatus.DRAFT,
  ],
])(
  'selecting %s requests the existing filter href',
  (label, href, selectedStatus) => {
    const onFilterSelect = renderBookingStatusFilter({
      selectedStatus,
    });

    fireEvent.click(screen.getByRole('button', { name: label }));

    expect(onFilterSelect).toHaveBeenCalledWith(href, expect.any(String));
  },
);

test('disables filter controls and keeps the pending filter visually active', () => {
  const onFilterSelect = renderBookingStatusFilter({
    disabled: true,
    pendingFilterKey: 'approved',
    selectedStatus: BookingStatus.DRAFT,
  });

  const approved = screen.getByRole('button', { name: 'Approved' });

  expect(approved.getAttribute('aria-current')).toBe('page');
  expect(approved.getAttribute('aria-pressed')).toBe('true');
  expect(
    screen
      .getAllByRole('button')
      .every(
        (button) => button instanceof HTMLButtonElement && button.disabled,
      ),
  ).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }));

  expect(onFilterSelect).not.toHaveBeenCalled();
});
