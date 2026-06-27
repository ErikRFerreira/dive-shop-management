import { expect, test } from 'vitest';

import {
  bookingCustomerDefaultValues,
  bookingFormDefaultValues,
} from '@/features/bookings/form-values';
import { normalizeBookingFormValues } from '@/features/bookings/form-mappers';
import type { BookingFormValues } from '@/features/bookings/types';
import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  Currency,
  DepositStatus,
} from '@/generated/prisma/enums';
import {
  approveBookingSchema,
  markBookingNeedsMoreInfoSchema,
  validateBookingIntake,
} from './validation';
import { primaryContactMethodError } from './validation-messages';

function validSubmitValues(overrides: Partial<BookingFormValues> = {}) {
  return normalizeBookingFormValues({
    ...bookingFormDefaultValues,
    activities: [
      {
        activityType: ActivityType.OPEN_WATER_COURSE,
        specialtyCourse: '',
        requestedDate: '2026-07-14',
        requestedTime: '',
        notes: '',
      },
    ],
    numberOfPeople: '2',
    source: BookingSource.EMAIL,
    customers: [
      {
        ...bookingCustomerDefaultValues,
        role: BookingCustomerRole.PRIMARY_CONTACT,
        customerName: 'Maria Santos',
        email: 'maria@example.com',
      },
    ],
    ...overrides,
  });
}

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

test('requires a booking ID and nonblank reason when requesting more information', () => {
  expect(
    markBookingNeedsMoreInfoSchema.safeParse({
      bookingId: '',
      needsMoreInfoReason: '   ',
    }).success,
  ).toBe(false);
});

test('requires a booking ID when approving a booking', () => {
  expect(
    approveBookingSchema.safeParse({
      bookingId: '   ',
      adminNotes: 'Ready to schedule.',
    }).success,
  ).toBe(false);
});

test('trims optional admin notes when approving a booking', () => {
  expect(
    approveBookingSchema.safeParse({
      bookingId: ' booking-1 ',
      adminNotes: ' Ready to schedule. ',
    }),
  ).toMatchObject({
    success: true,
    data: {
      bookingId: 'booking-1',
      adminNotes: 'Ready to schedule.',
    },
  });
});

test('trims a valid reason when requesting more information', () => {
  const result = markBookingNeedsMoreInfoSchema.safeParse({
    bookingId: ' booking-1 ',
    needsMoreInfoReason: ' Please confirm the diver certification. ',
  });

  expect(result).toMatchObject({
    success: true,
    data: {
      bookingId: 'booking-1',
      needsMoreInfoReason: 'Please confirm the diver certification.',
    },
  });
});

test('blocks a completely empty draft', () => {
  const result = validateBookingIntake(
    normalizeBookingFormValues(bookingFormDefaultValues),
    'draft',
  );

  expect(result).toMatchObject({
    success: false,
    formErrors: [
      'Enter at least one booking, activity, or customer detail before saving a draft.',
    ],
  });
});

test('allows a draft when an existing customer is selected', () => {
  const result = validateBookingIntake(
    normalizeBookingFormValues({
      ...bookingFormDefaultValues,
      customers: [
        {
          ...bookingCustomerDefaultValues,
          customerId: 'customer-1',
        },
      ],
    }),
    'draft',
  );

  expect(result).toMatchObject({
    success: true,
    fieldErrors: {},
    formErrors: [],
  });
});

test('requires an activity and its requested date for submission', () => {
  const result = validateBookingIntake(
    validSubmitValues({ activities: [] }),
    'submit',
  );

  expect(result).toMatchObject({
    success: false,
    fieldErrors: {
      activities: ['Add at least one activity before submitting for approval.'],
    },
  });
});

test('requires an exactly one primary contact with a contact method', () => {
  const result = validateBookingIntake(
    validSubmitValues({
      customers: [
        {
          ...bookingCustomerDefaultValues,
          role: BookingCustomerRole.PARTICIPANT,
          customerName: 'Maria Santos',
        },
      ],
    }),
    'submit',
  );

  expect(result).toMatchObject({
    success: false,
    fieldErrors: {
      customers: ['Select exactly one primary contact before submitting.'],
    },
  });
});

test('requires a primary contact method', () => {
  const result = validateBookingIntake(
    validSubmitValues({
      customers: [
        {
          ...bookingCustomerDefaultValues,
          role: BookingCustomerRole.PRIMARY_CONTACT,
          customerName: 'Maria Santos',
        },
      ],
    }),
    'submit',
  );

  expect(result).toMatchObject({
    success: false,
    fieldErrors: {
      customers: [primaryContactMethodError],
    },
  });
});

test('requires Fun Dive details for every entered customer', () => {
  const result = validateBookingIntake(
    validSubmitValues({
      activities: [
        {
          activityType: ActivityType.FUN_DIVE,
          specialtyCourse: '',
          requestedDate: '2026-07-14',
          requestedTime: '',
          notes: '',
        },
      ],
      customers: [
        {
          ...bookingCustomerDefaultValues,
          role: BookingCustomerRole.PRIMARY_CONTACT,
          customerName: 'Maria Santos',
          email: 'maria@example.com',
          certificationLevel: 'Advanced Open Water',
          lastDiveDate: '2026-06-01',
          divesLogged: '15',
        },
        {
          ...bookingCustomerDefaultValues,
          customerName: 'Kai Chen',
        },
      ],
    }),
    'submit',
  );

  expect(result).toMatchObject({
    success: false,
    fieldErrors: {
      'customers.1.certificationLevel': [
        'Certification level is required when the booking includes a Fun Dive.',
      ],
      'customers.1.divesLogged': [
        'Dives logged is required when the booking includes a Fun Dive.',
      ],
    },
  });
});

test('requires a specialty course for each Specialty Course activity', () => {
  const result = validateBookingIntake(
    validSubmitValues({
      activities: [
        {
          activityType: ActivityType.SPECIALTY_COURSE,
          specialtyCourse: '',
          requestedDate: '2026-07-14',
          requestedTime: '',
          notes: '',
        },
      ],
    }),
    'submit',
  );

  expect(result).toMatchObject({
    success: false,
    fieldErrors: {
      'activities.0.specialtyCourse': [
        'Specialty course is required for this activity.',
      ],
    },
  });
});

test.each([
  ['draft', DepositStatus.PAID],
  ['draft', DepositStatus.PARTIALLY_PAID],
  ['submit', DepositStatus.PAID],
  ['submit', DepositStatus.PARTIALLY_PAID],
] as const)(
  '%s %s deposits require amount, currency, and paid to',
  (intent, depositStatus) => {
    const result = validateBookingIntake(
      validSubmitValues({ depositStatus }),
      intent,
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
    fieldErrors: { amount: ['Deposit amount must be a positive number.'] },
  });
});

test('accepts a valid multi-activity, multi-customer submission', () => {
  const result = validateBookingIntake(
    validSubmitValues({
      activities: [
        {
          activityType: ActivityType.OPEN_WATER_COURSE,
          specialtyCourse: '',
          requestedDate: '2026-07-14',
          requestedTime: '',
          notes: '',
        },
        {
          activityType: ActivityType.ADVANCED_OPEN_WATER_COURSE,
          specialtyCourse: '',
          requestedDate: '2026-07-16',
          requestedTime: '09:00',
          notes: 'Continue after Open Water.',
        },
      ],
      customers: [
        {
          ...bookingCustomerDefaultValues,
          role: BookingCustomerRole.PRIMARY_CONTACT,
          customerName: 'Maria Santos',
          email: 'maria@example.com',
        },
        {
          ...bookingCustomerDefaultValues,
          customerName: 'Kai Chen',
        },
      ],
    }),
    'submit',
  );

  expect(result).toMatchObject({
    success: true,
    fieldErrors: {},
    formErrors: [],
  });
});
