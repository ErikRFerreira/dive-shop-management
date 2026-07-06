import { expect, test } from 'vitest';

import type { BookingDetailsItem } from '@/features/bookings/queries';
import {
  UNSCHEDULED_ASSIGNMENT_SUMMARY,
  formatAssignedStaffSummary,
} from './booking-display-utils';

/**
 * Builds a partial booking detail object for shared display helper tests.
 *
 * @param overrides - Booking fields needed by the current scenario.
 * @returns Booking detail test double.
 */
function booking(overrides: Partial<BookingDetailsItem>): BookingDetailsItem {
  return {
    scheduleItem: null,
    ...overrides,
  } as BookingDetailsItem;
}

test('formats assigned staff summaries for unscheduled, unassigned, and assigned bookings', () => {
  expect(formatAssignedStaffSummary(booking({ scheduleItem: null }))).toBe(
    UNSCHEDULED_ASSIGNMENT_SUMMARY,
  );
  expect(
    formatAssignedStaffSummary(
      booking({
        scheduleItem: {
          assignments: [],
        },
      }),
    ),
  ).toBe('Unassigned');
  expect(
    formatAssignedStaffSummary(
      booking({
        scheduleItem: {
          assignments: [
            { user: { name: 'Inez Instructor' } },
            { user: { name: 'Dina Divemaster' } },
          ],
        },
      }),
    ),
  ).toBe('Inez Instructor, Dina Divemaster');
});
