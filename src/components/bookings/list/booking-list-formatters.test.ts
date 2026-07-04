import { expect, test } from 'vitest';

import type { BookingListItem } from '@/features/bookings/queries';
import {
  ActivityType,
  BookingCustomerRole,
  BookingStatus,
} from '@/generated/prisma/enums';
import {
  formatBookingHotel,
  getBookingActivityLines,
  getStaffAssignmentLines,
} from './booking-list-formatters';

/**
 * Builds a partial booking list item for formatter helper tests.
 *
 * @param overrides - Booking fields required by the current scenario.
 * @returns Booking list test double.
 */
function booking(overrides: Partial<BookingListItem> = {}): BookingListItem {
  const createdAt = new Date('2026-07-01T08:00:00.000Z');
  const customer = {
    id: 'customer-1',
    fullName: 'Maria Santos',
    firstName: null,
    lastName: null,
    chineseName: null,
    weChatId: null,
    whatsAppNumber: null,
    email: null,
    phone: null,
    hotel: 'Customer Profile Hotel',
    preferredLanguage: null,
    notes: null,
    createdAt,
    updatedAt: createdAt,
  };

  return {
    id: 'booking-1',
    status: BookingStatus.APPROVED,
    activityType: ActivityType.FUN_DIVE,
    requestedDate: null,
    requestedTime: null,
    activities: [],
    customers: [
      {
        bookingRequestId: 'booking-1',
        customerId: 'customer-1',
        role: BookingCustomerRole.PRIMARY_CONTACT,
        hotelAtBooking: 'Booking Hotel',
        equipmentNeeded: null,
        notes: null,
        certificationAgency: null,
        certificationLevel: null,
        lastDiveAt: null,
        heightCm: null,
        weightKg: null,
        shoeSize: null,
        divesLogged: null,
        createdAt,
        updatedAt: createdAt,
        customer,
      },
    ],
    scheduleItem: null,
    displayCustomer: customer,
    ...overrides,
  } as BookingListItem;
}

test('falls back to legacy activity type when no activity rows exist', () => {
  expect(getBookingActivityLines(booking())).toEqual([
    {
      key: 'booking-1-fallback-activity',
      label: 'Fun Dive',
    },
  ]);
});

test('formats booking-specific hotel before customer profile hotel', () => {
  const row = booking();

  expect(formatBookingHotel(row)).toBe('Booking Hotel');
  expect(
    formatBookingHotel(
      booking({
        customers: row.customers.map((customer) => ({
          ...customer,
          hotelAtBooking: null,
        })),
      }),
    ),
  ).toBe('Customer Profile Hotel');
});

test('resolves staff assignment labels for unscheduled, unassigned, and assigned rows', () => {
  expect(getStaffAssignmentLines(booking({ scheduleItem: null }))).toEqual([
    { key: 'booking-1-unscheduled-staff', label: '\u2014' },
  ]);
  expect(
    getStaffAssignmentLines(
      booking({
        scheduleItem: {
          assignments: [],
        },
      }),
    ),
  ).toEqual([{ key: 'booking-1-unassigned-staff', label: 'Unassigned' }]);
  expect(
    getStaffAssignmentLines(
      booking({
        scheduleItem: {
          assignments: [
            { id: 'assignment-1', user: { name: 'Inez Instructor' } },
            { id: 'assignment-2', user: { name: 'Dina Divemaster' } },
          ],
        },
      }),
    ),
  ).toEqual([
    { key: 'assignment-1', label: 'Inez Instructor' },
    { key: 'assignment-2', label: 'Dina Divemaster' },
  ]);
});
