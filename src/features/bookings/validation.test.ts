import { expect, test } from 'vitest';

import {
  bookingFormDefaultValues,
  normalizeBookingFormValues,
} from '@/features/bookings/intake';
import type { BookingFormValues } from '@/features/bookings/types';
import {
  ActivityType,
  BookingSource,
  Currency,
  DepositStatus,
} from '@/generated/prisma/enums';
import { validateBookingIntake } from './validation';

function validSubmitValues(overrides: Partial<BookingFormValues> = {}) {
  return normalizeBookingFormValues({
    ...bookingFormDefaultValues,
    activityType: ActivityType.OPEN_WATER_COURSE,
    requestedDate: '2026-07-14',
    numberOfPeople: '2',
    source: BookingSource.EMAIL,
    customerName: 'Maria Santos',
    email: 'maria@example.com',
    ...overrides,
  });
}

/** Verifies a draft with a customer message can remain incomplete. */
test('allows an incomplete draft when raw booking text exists', () => {
  const result = validateBookingIntake(
    normalizeBookingFormValues({
      ...bookingFormDefaultValues,
      rawBookingText: 'Customer is asking about availability.',
    }),
    'draft',
  );

  expect(result).toMatchObject({
    success: true,
    fieldErrors: {},
    formErrors: [],
  });
});

/** Verifies completely empty drafts are rejected with a form-level message. */
test('blocks a completely empty draft', () => {
  const result = validateBookingIntake(
    normalizeBookingFormValues(bookingFormDefaultValues),
    'draft',
  );

  expect(result).toMatchObject({
    success: false,
    fieldErrors: {},
    formErrors: [
      'Enter at least one booking or customer detail before saving a draft.',
    ],
  });
});

/** Verifies submissions cannot omit an activity type. */
test('blocks a submit without an activity type', () => {
  const result = validateBookingIntake(
    validSubmitValues({ activityType: '' }),
    'submit',
  );

  expect(result).toMatchObject({
    success: false,
    fieldErrors: {
      activityType: ['Activity type is required before submitting for approval.'],
    },
  });
});

/** Verifies submissions report missing contact information once at form level. */
test('blocks a submit without contact methods', () => {
  const result = validateBookingIntake(
    validSubmitValues({ email: '' }),
    'submit',
  );

  expect(result).toMatchObject({
    success: false,
    fieldErrors: {},
    formErrors: [
      'Provide at least one contact method: WeChat ID, WhatsApp number, email, or phone.',
    ],
  });
});

/** Verifies the three required Fun Dive details are individually reported. */
test('requires certification level, last dive date, and logged dives for Fun Dive', () => {
  const result = validateBookingIntake(
    validSubmitValues({ activityType: ActivityType.FUN_DIVE }),
    'submit',
  );

  expect(result).toMatchObject({
    success: false,
    fieldErrors: {
      certificationLevel: [
        'Certification level is required when submitting a Fun Dive booking.',
      ],
      lastDiveDate: [
        'Last dive date is required when submitting a Fun Dive booking.',
      ],
      divesLogged: [
        'Dives logged is required when submitting a Fun Dive booking.',
      ],
    },
  });
});

/** Verifies completed deposits need all required payment details. */
test.each([DepositStatus.PAID, DepositStatus.PARTIALLY_PAID])(
  '%s deposits require amount, currency, and paid to',
  (depositStatus) => {
    const result = validateBookingIntake(
      validSubmitValues({ depositStatus }),
      'submit',
    );

    expect(result).toMatchObject({
      success: false,
      fieldErrors: {
        amount: ['Deposit amount is required when a deposit is paid.'],
        currency: ['Deposit currency is required when a deposit is paid.'],
        paidTo: ['Paid to is required when a deposit is paid.'],
      },
    });
  },
);

/** Verifies paid deposits reject zero and negative amounts. */
test('requires a positive amount for a paid deposit', () => {
  const result = validateBookingIntake(
    validSubmitValues({
      depositStatus: DepositStatus.PAID,
      amount: '0',
      currency: Currency.PESOS,
      paidTo: 'Front desk',
    }),
    'submit',
  );

  expect(result).toMatchObject({
    success: false,
    fieldErrors: {
      amount: ['Deposit amount must be a positive number.'],
    },
  });
});

/** Verifies the retained Specialty Course requirement. */
test('requires a specialty course for Specialty Course submissions', () => {
  const result = validateBookingIntake(
    validSubmitValues({ activityType: ActivityType.SPECIALTY_COURSE }),
    'submit',
  );

  expect(result).toMatchObject({
    success: false,
    fieldErrors: {
      specialtyCourse: [
        'Specialty course is required when submitting a Specialty Course booking.',
      ],
    },
  });
});

/** Verifies a complete regular booking request is ready for approval. */
test('accepts a valid submission', () => {
  const result = validateBookingIntake(validSubmitValues(), 'submit');

  expect(result).toMatchObject({
    success: true,
    fieldErrors: {},
    formErrors: [],
  });
});
