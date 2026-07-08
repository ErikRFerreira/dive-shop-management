import { expect, test } from 'vitest';

import type { BookingDetailsItem } from '@/features/bookings/queries';
import {
  getBookingReviewReadiness,
  getMissingBookingReviewInformation,
} from '@/features/bookings/review-requirements';
import {
  ActivityType,
  BookingCustomerRole,
  BookingParticipantStatus,
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
        participationStatus: BookingParticipantStatus.ACTIVE,
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

/**
 * Creates the small decimal mock needed by review requirement tests.
 *
 * @returns Decimal-like value with comparison and display methods used by helpers.
 */
function makePositiveDecimal() {
  return {
    gt: (value: number) => value === 0,
    lte: () => false,
    toString: () => '100',
  };
}

test('returns no missing review information for a complete non-fun-dive booking', () => {
  expect(getMissingBookingReviewInformation(makeBooking())).toEqual([]);
});

test('requires core booking details and one primary contact', () => {
  const warnings = getMissingBookingReviewInformation(
    makeBooking({
      activities: [],
      source: null,
      customers: [],
    }),
  );

  expect(warnings).toEqual([
    'Add at least one activity.',
    'Booking source is required.',
    'Add at least one active customer or diver.',
    'Select exactly one primary contact.',
  ]);
});

test('does not count inactive participants for review missing information', () => {
  const warnings = getMissingBookingReviewInformation(
    makeBooking({
      customers: [
        {
          ...makeBooking().customers[0],
          participationStatus: BookingParticipantStatus.DROPPED_OUT,
        },
      ],
    }),
  );

  expect(warnings).toEqual([
    'Add at least one active customer or diver.',
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

test('returns complete and not-required readiness states for a reviewable non-fun-dive booking', () => {
  expect(getBookingReviewReadiness(makeBooking())).toEqual([
    {
      label: 'Activity selected',
      status: 'complete',
      description: 'At least one activity is selected.',
    },
    {
      label: 'Requested date set',
      status: 'complete',
      description: 'All activities have requested dates.',
    },
    {
      label: 'Primary customer set',
      status: 'complete',
      description: 'Exactly one primary contact is selected.',
    },
    {
      label: 'Contact method present',
      status: 'complete',
      description: 'Primary contact has at least one contact method.',
    },
    {
      label: 'Diving experience',
      status: 'not required',
      description: 'Not required for the selected activity type.',
    },
    {
      label: 'Deposit info',
      status: 'not required',
      description: 'No paid deposit details are required.',
    },
    {
      label: 'Equipment sizing',
      status: 'recommended/optional',
      description: 'Confirm whether rental equipment is needed when possible.',
    },
  ]);
});

test('marks required readiness items as missing when review data is incomplete', () => {
  const readiness = getBookingReviewReadiness(
    makeBooking({
      activities: [
        {
          id: 'activity-1',
          activityType: null,
          specialtyCourse: null,
          requestedDate: null,
          requestedTime: null,
          notes: null,
        },
      ],
      customers: [
        {
          customerId: 'customer-1',
          role: BookingCustomerRole.PRIMARY_CONTACT,
          participationStatus: BookingParticipantStatus.ACTIVE,
          certificationLevel: null,
          lastDiveAt: null,
          divesLogged: null,
          customer: {
            fullName: 'Ada Diver',
            firstName: null,
            lastName: null,
            weChatId: null,
            whatsAppNumber: null,
            email: null,
            phone: null,
          },
        },
      ],
    }),
  );

  expect(readiness).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        label: 'Activity selected',
        status: 'missing',
      }),
      expect.objectContaining({
        label: 'Requested date set',
        status: 'missing',
      }),
      expect.objectContaining({
        label: 'Contact method present',
        status: 'missing',
      }),
    ]),
  );
});

test('marks fun-dive experience, paid deposit info, and requested equipment sizing as missing when incomplete', () => {
  const readiness = getBookingReviewReadiness(
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
      customers: [
        {
          customerId: 'customer-1',
          role: BookingCustomerRole.PRIMARY_CONTACT,
          participationStatus: BookingParticipantStatus.ACTIVE,
          certificationLevel: null,
          lastDiveAt: null,
          divesLogged: null,
          equipmentNeeded: 'Yes, full rental set',
          heightCm: 170,
          weightKg: null,
          shoeSize: null,
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
      deposits: [
        {
          id: 'deposit-1',
          status: DepositStatus.PARTIALLY_PAID,
          amount: makePositiveDecimal(),
          currency: null,
          paidTo: null,
        },
      ],
    } as Partial<BookingDetailsItem>),
  );

  expect(readiness).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        label: 'Diving experience',
        status: 'missing',
      }),
      expect.objectContaining({
        label: 'Deposit info',
        status: 'missing',
      }),
      expect.objectContaining({
        label: 'Equipment sizing',
        status: 'missing',
      }),
    ]),
  );
});

test('marks equipment sizing as not required when customers clearly do not need rentals', () => {
  const readiness = getBookingReviewReadiness(
    makeBooking({
      customers: [
        {
          customerId: 'customer-1',
          role: BookingCustomerRole.PRIMARY_CONTACT,
          participationStatus: BookingParticipantStatus.ACTIVE,
          certificationLevel: null,
          lastDiveAt: null,
          divesLogged: null,
          equipmentNeeded: 'No equipment needed',
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
    }),
  );

  expect(readiness).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        label: 'Equipment sizing',
        status: 'not required',
      }),
    ]),
  );
});
