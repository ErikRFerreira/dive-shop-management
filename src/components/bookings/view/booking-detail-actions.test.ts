import { expect, test } from 'vitest';

import type { BookingDetailsItem } from '@/features/bookings/queries';
import { BookingStatus } from '@/generated/prisma/enums';
import { getBookingDetailActions } from './booking-detail-actions';

/**
 * Builds the minimum booking detail shape required by action derivation tests.
 *
 * @param status - Workflow status to evaluate.
 * @param hasScheduleItem - Whether the booking should have a schedule item.
 * @returns Booking detail test double.
 */
function booking(
  status: BookingStatus,
  hasScheduleItem = false,
): BookingDetailsItem {
  return {
    id: 'booking-1',
    status,
    scheduleItem: hasScheduleItem ? { id: 'schedule-1' } : null,
  } as BookingDetailsItem;
}

/**
 * Extracts action labels for concise status matrix assertions.
 *
 * @param status - Workflow status to evaluate.
 * @param options - Permission and schedule item overrides.
 * @returns Ordered action labels.
 */
function labelsFor(
  status: BookingStatus,
  options: {
    canEdit?: boolean;
    canReview?: boolean;
    hasScheduleItem?: boolean;
  } = {},
) {
  return getBookingDetailActions(
    booking(status, options.hasScheduleItem),
    options.canEdit ?? false,
    options.canReview ?? false,
  ).map((action) => action.label);
}

test('builds status-aware actions for draft bookings', () => {
  expect(labelsFor(BookingStatus.DRAFT, { canEdit: true })).toEqual([
    'Edit booking',
    'Back to booking requests',
  ]);
  expect(labelsFor(BookingStatus.DRAFT)).toEqual(['Back to booking requests']);
});

test('builds status-aware actions for pending approval bookings', () => {
  expect(
    labelsFor(BookingStatus.PENDING_APPROVAL, {
      canEdit: true,
      canReview: true,
    }),
  ).toEqual(['Review booking', 'Edit booking', 'Back to booking requests']);
});

test('builds status-aware actions for needs-more-info bookings', () => {
  expect(
    labelsFor(BookingStatus.NEEDS_MORE_INFO, {
      canEdit: true,
      canReview: true,
    }),
  ).toEqual(['Fix details', 'Back to booking requests']);
});

test('builds schedule and edit actions for approved or scheduled bookings', () => {
  expect(
    labelsFor(BookingStatus.SCHEDULED, {
      canEdit: true,
      hasScheduleItem: true,
    }),
  ).toEqual(['View schedule', 'Edit booking', 'Back to booking requests']);
  expect(
    labelsFor(BookingStatus.APPROVED, {
      hasScheduleItem: true,
    }),
  ).toEqual(['View schedule', 'Back to booking requests']);
});

test('keeps cancelled bookings read-only', () => {
  expect(
    labelsFor(BookingStatus.CANCELLED, {
      canEdit: true,
      canReview: true,
      hasScheduleItem: true,
    }),
  ).toEqual(['Back to booking requests']);
});
