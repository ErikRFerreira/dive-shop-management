import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
  bookingCustomerDefaultValues,
  bookingFormDefaultValues,
} from '@/features/bookings/form-values';
import { normalizeBookingFormValues } from '@/features/bookings/form-mappers';
import type { BookingFormValues } from '@/features/bookings/types';
import {
  ActivityType,
  BookingCustomerRole,
  BookingParticipantStatus,
  BookingSource,
  Currency,
  DepositStatus,
  ScheduleTimeSlot,
} from '@/generated/prisma/enums';
import {
  approveBookingSchema,
  markBookingNeedsMoreInfoSchema,
  validateBookingIntake,
} from './validation';
import { primaryContactMethodError } from './validation-messages';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-09T04:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

function validSubmitValues(overrides: Partial<BookingFormValues> = {}) {
  return normalizeBookingFormValues({
    ...bookingFormDefaultValues,
    activities: [
      {
        activityType: ActivityType.OPEN_WATER_COURSE,
        specialtyCourse: '',
        durationDays: '',
        requestedDate: '2026-07-14',
        requestedTime: '',
        notes: '',
      },
    ],
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

test('does not treat booking-specific-only customer fields as draft content', () => {
  const result = validateBookingIntake(
    normalizeBookingFormValues({
      ...bookingFormDefaultValues,
      customers: [
        {
          ...bookingCustomerDefaultValues,
          role: BookingCustomerRole.PRIMARY_CONTACT,
          equipmentNeeded: 'YES',
          certificationLevel: 'Open Water',
          divesLogged: '12',
        },
      ],
    }),
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

test('rejects past requested dates for submission', () => {
  const result = validateBookingIntake(
    validSubmitValues({
      activities: [
        {
          activityType: ActivityType.OPEN_WATER_COURSE,
          specialtyCourse: '',
          durationDays: '',
          requestedDate: '2026-07-08',
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
      'activities.0.requestedDate': ['Requested date cannot be in the past.'],
    },
  });
});

test('accepts today and future requested dates for submission', () => {
  expect(
    validateBookingIntake(
      validSubmitValues({
        activities: [
          {
            activityType: ActivityType.OPEN_WATER_COURSE,
            specialtyCourse: '',
            durationDays: '',
            requestedDate: '2026-07-09',
            requestedTime: '',
            notes: '',
          },
        ],
      }),
      'submit',
    ),
  ).toMatchObject({ success: true });

  expect(
    validateBookingIntake(
      validSubmitValues({
        activities: [
          {
            activityType: ActivityType.OPEN_WATER_COURSE,
            specialtyCourse: '',
            durationDays: '',
            requestedDate: '2026-07-10',
            requestedTime: '',
            notes: '',
          },
        ],
      }),
      'submit',
    ),
  ).toMatchObject({ success: true });
});

test('allows past requested dates for draft saves with content', () => {
  const result = validateBookingIntake(
    normalizeBookingFormValues({
      ...bookingFormDefaultValues,
      rawBookingText: 'Customer asked about an old booking date.',
      activities: [
        {
          activityType: ActivityType.OPEN_WATER_COURSE,
          specialtyCourse: '',
          durationDays: '',
          requestedDate: '2026-07-08',
          requestedTime: '',
          notes: '',
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

test('uses booking summary labels in submit validation errors', () => {
  const result = validateBookingIntake(
    validSubmitValues({
      source: '',
    }),
    'submit',
  );

  expect(result).toMatchObject({
    success: false,
    fieldErrors: {
      source: [
        'Source / referrer is required before submitting for approval.',
      ],
    },
  });
});

test('requires at least one active customer or diver for submission', () => {
  const result = validateBookingIntake(
    validSubmitValues({
      customers: [
        {
          ...bookingCustomerDefaultValues,
          role: BookingCustomerRole.PRIMARY_CONTACT,
        },
      ],
    }),
    'submit',
  );

  expect(result).toMatchObject({
    success: false,
    fieldErrors: {
      customers: expect.arrayContaining([
        'Add at least one active customer or diver before submitting.',
      ]),
    },
  });
});

test.each([
  BookingParticipantStatus.DROPPED_OUT,
  BookingParticipantStatus.CANCELLED,
  BookingParticipantStatus.NO_SHOW,
] as const)(
  'does not count %s customers or divers for submission',
  (participationStatus) => {
    const values = validSubmitValues();
    values.customers[0].participationStatus = participationStatus;

    const result = validateBookingIntake(values, 'submit');

    expect(result).toMatchObject({
      success: false,
      fieldErrors: {
        customers: expect.arrayContaining([
          'Add at least one active customer or diver before submitting.',
        ]),
      },
    });
  },
);

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
          durationDays: '',
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
        'Logged dives is required when the booking includes a Fun Dive.',
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
          durationDays: '',
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
        'Enter a specific specialty name for this activity.',
      ],
    },
  });
});

test.each(['specialty', 'Specialty Course', 'course'] as const)(
  'requires a useful specialty name instead of %s',
  (specialtyCourse) => {
    const result = validateBookingIntake(
      validSubmitValues({
        activities: [
          {
            activityType: ActivityType.SPECIALTY_COURSE,
            specialtyCourse,
            durationDays: '',
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
          'Enter a specific specialty name for this activity.',
        ],
      },
    });
  },
);

test('accepts a useful specialty name for submission', () => {
  const result = validateBookingIntake(
    validSubmitValues({
      activities: [
        {
          activityType: ActivityType.SPECIALTY_COURSE,
          specialtyCourse: 'Nitrox',
          durationDays: '',
          requestedDate: '2026-07-14',
          requestedTime: '',
          notes: '',
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

test('allows incomplete specialty course details for draft saves with content', () => {
  const result = validateBookingIntake(
    normalizeBookingFormValues({
      ...bookingFormDefaultValues,
      rawBookingText: 'Customer asked about a specialty course.',
      activities: [
        {
          activityType: ActivityType.SPECIALTY_COURSE,
          specialtyCourse: '',
          durationDays: '',
          requestedDate: '',
          requestedTime: '',
          notes: '',
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
          durationDays: '',
          requestedDate: '2026-07-14',
          requestedTime: '',
          notes: '',
        },
        {
          activityType: ActivityType.ADVANCED_OPEN_WATER_COURSE,
          specialtyCourse: '',
          durationDays: '',
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

test('normalizes stale submitted activity slots to TBD', () => {
  const values = validSubmitValues({
    activities: [
      {
        activityType: ActivityType.OPEN_WATER_COURSE,
        specialtyCourse: '',
        durationDays: '',
        requestedDate: '2026-07-14',
        requestedTime: '',
        requestedTimeSlot: ScheduleTimeSlot.AM,
        notes: '',
      },
    ],
  });

  expect(values.activities[0].requestedTimeSlot).toBe(ScheduleTimeSlot.TBD);
  expect(validateBookingIntake(values, 'submit')).toMatchObject({
    success: true,
  });
});
