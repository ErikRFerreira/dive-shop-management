import { expect, test } from 'vitest';

import { buildCreateReadinessItems } from '@/components/bookings/form/booking-form-readiness';
import { bookingFormDefaultValues } from '@/features/bookings/form-values';
import type { BookingFormValues } from '@/features/bookings/types';
import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  Currency,
  DepositStatus,
} from '@/generated/prisma/enums';

/**
 * Builds a booking readiness input with complete defaults and targeted overrides.
 *
 * @param overrides - Partial form values to merge into the complete readiness fixture.
 * @returns The input shape consumed by the readiness helper.
 */
function readinessValues(overrides: Partial<BookingFormValues> = {}) {
  return {
    activities: [
      {
        ...bookingFormDefaultValues.activities[0],
        activityType: ActivityType.OPEN_WATER_COURSE,
        requestedDate: '2026-07-20',
      },
    ],
    amount: '',
    currency: Currency.DOLLAR,
    customers: [
      {
        ...bookingFormDefaultValues.customers[0],
        role: BookingCustomerRole.PRIMARY_CONTACT,
        customerName: 'Maria Santos',
        email: 'maria@example.test',
      },
    ],
    depositStatus: DepositStatus.UNKNOWN,
    paidTo: '',
    source: BookingSource.WECHAT,
    ...overrides,
  };
}

/**
 * Looks up one readiness item by its rendered label.
 *
 * @param label - Readiness item label shown in the form rail.
 * @param values - Readiness helper input values.
 * @returns The matching readiness item.
 */
function readinessItem(
  label: string,
  values: ReturnType<typeof readinessValues>,
) {
  const item = buildCreateReadinessItems(values).find(
    (readiness) => readiness.label === label,
  );

  if (!item) {
    throw new Error(`Missing readiness item: ${label}`);
  }

  return item;
}

/**
 * Looks up whether a readiness item label is present.
 *
 * @param label - Readiness item label shown in the form rail.
 * @param values - Readiness helper input values.
 * @returns True when the readiness helper includes the item.
 */
function hasReadinessItem(
  label: string,
  values: ReturnType<typeof readinessValues>,
) {
  return buildCreateReadinessItems(values).some(
    (readiness) => readiness.label === label,
  );
}

test('marks core create-booking requirements incomplete when intake values are missing', () => {
  const emptyValues = readinessValues({
    activities: [
      {
        ...bookingFormDefaultValues.activities[0],
        activityType: '' as ActivityType,
        requestedDate: '',
      },
    ],
    customers: [
      {
        ...bookingFormDefaultValues.customers[0],
        role: BookingCustomerRole.PRIMARY_CONTACT,
        customerName: '',
        email: '',
      },
    ],
    source: '' as BookingSource,
  });

  expect(readinessItem('Source / referrer', emptyValues).complete).toBe(false);
  expect(readinessItem('At least one customer/diver', emptyValues).complete).toBe(
    false,
  );
  expect(readinessItem('At least one activity', emptyValues).complete).toBe(
    false,
  );
  expect(readinessItem('Requested date', emptyValues).complete).toBe(false);
  expect(readinessItem('Primary customer name', emptyValues).complete).toBe(
    false,
  );
  expect(readinessItem('At least one contact method', emptyValues).complete).toBe(
    false,
  );
});

test('requires amount, currency, and paid-to details for paid deposits', () => {
  const incompletePaidDeposit = readinessValues({
    depositStatus: DepositStatus.PAID,
    amount: '100',
    currency: Currency.DOLLAR,
    paidTo: '',
  });
  const completePaidDeposit = readinessValues({
    depositStatus: DepositStatus.PARTIALLY_PAID,
    amount: '100',
    currency: Currency.DOLLAR,
    paidTo: 'Front desk',
  });

  expect(
    readinessItem(
      'Deposit amount, currency & paid to',
      incompletePaidDeposit,
    ).complete,
  ).toBe(false);
  expect(
    readinessItem('Deposit amount, currency & paid to', completePaidDeposit)
      .complete,
  ).toBe(true);
});

test('requires diving experience details when the booking includes a fun dive', () => {
  const missingExperience = readinessValues({
    activities: [
      {
        ...bookingFormDefaultValues.activities[0],
        activityType: ActivityType.FUN_DIVE,
        requestedDate: '2026-07-20',
      },
    ],
  });
  const completeExperience = readinessValues({
    activities: [
      {
        ...bookingFormDefaultValues.activities[0],
        activityType: ActivityType.FUN_DIVE,
        requestedDate: '2026-07-20',
      },
    ],
    customers: [
      {
        ...bookingFormDefaultValues.customers[0],
        role: BookingCustomerRole.PRIMARY_CONTACT,
        customerName: 'Maria Santos',
        email: 'maria@example.test',
        certificationLevel: 'Advanced Open Water',
        divesLogged: '42',
      },
    ],
  });

  expect(
    readinessItem('Diving experience details', missingExperience).complete,
  ).toBe(false);
  expect(
    readinessItem('Diving experience details', completeExperience).complete,
  ).toBe(true);
});

test('omits diving experience details when the booking has no fun dives', () => {
  expect(
    hasReadinessItem('Diving experience details', readinessValues()),
  ).toBe(false);
});

test('omits specialty name readiness when the booking has no specialty courses', () => {
  const readinessItems = buildCreateReadinessItems(readinessValues());

  expect(hasReadinessItem('Specialty name', readinessValues())).toBe(false);
  expect(readinessItems).toHaveLength(7);
});

test('requires a useful specialty name when the booking includes a specialty course', () => {
  const missingSpecialtyName = readinessValues({
    activities: [
      {
        ...bookingFormDefaultValues.activities[0],
        activityType: ActivityType.SPECIALTY_COURSE,
        requestedDate: '2026-07-20',
        specialtyCourse: 'specialty',
      },
    ],
  });
  const completeSpecialtyName = readinessValues({
    activities: [
      {
        ...bookingFormDefaultValues.activities[0],
        activityType: ActivityType.SPECIALTY_COURSE,
        requestedDate: '2026-07-20',
        specialtyCourse: 'Nitrox',
      },
    ],
  });

  expect(readinessItem('Specialty name', missingSpecialtyName).complete).toBe(
    false,
  );
  expect(buildCreateReadinessItems(missingSpecialtyName)).toHaveLength(8);
  expect(readinessItem('Specialty name', completeSpecialtyName).complete).toBe(
    true,
  );
});
