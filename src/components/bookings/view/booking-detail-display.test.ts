import { expect, test } from 'vitest';

import type { BookingDetailsItem } from '@/features/bookings/queries';
import {
  ActivityType,
  BookingCustomerRole,
} from '@/generated/prisma/enums';
import {
  EMPTY_VALUE,
  formatAssignedStaffSummary,
  getDisplayActivities,
  getPrimaryBookingCustomer,
} from './booking-detail-display';

/**
 * Builds a partial booking detail object for pure display helper tests.
 *
 * @param overrides - Booking fields needed by the current scenario.
 * @returns Booking detail test double.
 */
function booking(overrides: Partial<BookingDetailsItem>): BookingDetailsItem {
  return {
    activities: [],
    customers: [],
    scheduleItem: null,
    activityType: null,
    specialtyCourse: null,
    requestedDate: null,
    requestedTime: null,
    ...overrides,
  } as BookingDetailsItem;
}

test('uses legacy activity fields when a booking has no activity rows', () => {
  const requestedDate = new Date('2026-07-14T00:00:00.000Z');

  expect(
    getDisplayActivities(
      booking({
        activityType: ActivityType.SPECIALTY_COURSE,
        specialtyCourse: 'Nitrox',
        requestedDate,
        requestedTime: '08:00',
      }),
    ),
  ).toEqual([
    {
      id: 'legacy-summary',
      activityType: ActivityType.SPECIALTY_COURSE,
      specialtyCourse: 'Nitrox',
      requestedDate,
      requestedTime: '08:00',
      notes: null,
    },
  ]);
});

test('prefers the primary booking customer and falls back to the first customer', () => {
  const firstCustomer = {
    customerId: 'customer-1',
    role: BookingCustomerRole.PARTICIPANT,
  };
  const primaryCustomer = {
    customerId: 'customer-2',
    role: BookingCustomerRole.PRIMARY_CONTACT,
  };

  expect(
    getPrimaryBookingCustomer(
      booking({
        customers: [firstCustomer, primaryCustomer],
      }),
    ),
  ).toBe(primaryCustomer);
  expect(
    getPrimaryBookingCustomer(
      booking({
        customers: [firstCustomer],
      }),
    ),
  ).toBe(firstCustomer);
  expect(getPrimaryBookingCustomer(booking({ customers: [] }))).toBeNull();
});

test('formats assigned staff summaries for unscheduled, unassigned, and assigned bookings', () => {
  expect(formatAssignedStaffSummary(booking({ scheduleItem: null }))).toBe(
    EMPTY_VALUE,
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
