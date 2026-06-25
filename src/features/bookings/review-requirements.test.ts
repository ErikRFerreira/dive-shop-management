import { expect, test } from 'vitest';

import type { BookingDetailsItem } from '@/features/bookings/queries';
import { getMissingBookingReviewInformation } from '@/features/bookings/review-requirements';
import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  DepositStatus,
} from '@/generated/prisma/enums';

function makeBooking(
  overrides: Partial<BookingDetailsItem> = {},
): BookingDetailsItem {
  return {
    id: 'booking-1',
    activities: [
      {
        id: 'activity-1',
        activityType: ActivityType.OPEN_WATER_COURSE,
        specialtyCourse: null,
        requestedDate: new Date('2026-07-01'),
        requestedTime: '09:00',
        notes: null,
      },
    ],
    activityType: ActivityType.OPEN_WATER_COURSE,
    specialtyCourse: null,
    requestedDate: new Date('2026-07-01'),
    requestedTime: '09:00',
    numberOfPeople: 1,
    source: BookingSource.WECHAT,
    customers: [
      {
        customerId: 'customer-1',
        role: BookingCustomerRole.PRIMARY_CONTACT,
        certificationLevel: null,
        lastDiveAt: null,
        divesLogged: null,
        customer: {
          fullName: 'Ada Diver',
          firstName: null,
          lastName: null,
          weChatId: 'ada-d',
          whatsAppNumber: null,
          email: null,
          phone: null,
        },
      },
    ],
    deposits: [],
    ...overrides,
  } as BookingDetailsItem;
}

test('returns no missing review information for a complete non-fun-dive booking', () => {
  expect(getMissingBookingReviewInformation(makeBooking())).toEqual([]);
});

test('requires core booking details and one primary contact', () => {
  const warnings = getMissingBookingReviewInformation(
    makeBooking({
      activities: [],
      numberOfPeople: 0,
      source: null,
      customers: [],
    }),
  );

  expect(warnings).toEqual([
    'Add at least one activity.',
    'Number of people must be at least 1.',
    'Booking source is required.',
    'Add at least one customer or diver.',
    'Select exactly one primary contact.',
  ]);
});

test('requires fun diver fields when the booking includes a fun dive', () => {
  const warnings = getMissingBookingReviewInformation(
    makeBooking({
      activities: [
        {
          id: 'activity-1',
          activityType: ActivityType.FUN_DIVE,
          specialtyCourse: null,
          requestedDate: new Date('2026-07-01'),
          requestedTime: null,
          notes: null,
        },
      ],
    }),
  );

  expect(warnings).toEqual([
    'Customer/diver 1: certification level is required.',
    'Customer/diver 1: last dive date is required.',
    'Customer/diver 1: logged dives are required.',
  ]);
});

test('requires paid deposit records to include payment details', () => {
  const warnings = getMissingBookingReviewInformation(
    makeBooking({
      deposits: [
        {
          id: 'deposit-1',
          status: DepositStatus.PAID,
          amount: null,
          currency: null,
          paidTo: null,
        },
      ],
    }),
  );

  expect(warnings).toEqual([
    'Deposit 1: a positive amount is required.',
    'Deposit 1: currency is required.',
    'Deposit 1: paid to is required.',
  ]);
});
