import { expect, test } from 'vitest';

import {
  bookingFormDefaultValues,
  formatEnumLabel,
  hasMeaningfulDeposit,
  normalizeBookingFormValues,
} from '@/features/bookings/intake';
import {
  ActivityType,
  BookingSource,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';

/** Verifies enum labels are suitable for the booking form. */
test('formats enum labels for display', () => {
  expect(formatEnumLabel(ActivityType.OPEN_WATER_COURSE)).toBe(
    'Open Water Course',
  );
  expect(formatEnumLabel(null)).toBe('—');
});

/** Verifies browser form strings are normalized for persistence. */
test('normalizes empty values and valid numeric, enum, and date inputs', () => {
  const values = normalizeBookingFormValues({
    ...bookingFormDefaultValues,
    rawBookingText: '  Customer message  ',
    activityType: ActivityType.FUN_DIVE,
    requestedDate: '2026-07-14',
    requestedTime: ' 09:30 ',
    numberOfPeople: ' 3 ',
    source: BookingSource.WECHAT,
    preferredLanguage: PreferredLanguage.CHINESE,
    heightCm: '170',
    weightKg: ' 63.5 ',
    shoeSize: '40.5',
    amount: ' 1200.50 ',
    lastDiveDate: '2026-06-01',
    divesLogged: '15',
  });

  expect(values).toMatchObject({
    rawBookingText: 'Customer message',
    activityType: ActivityType.FUN_DIVE,
    requestedTime: '09:30',
    numberOfPeople: 3,
    source: BookingSource.WECHAT,
    preferredLanguage: PreferredLanguage.CHINESE,
    heightCm: 170,
    weightKg: 63.5,
    shoeSize: 40.5,
    amount: 1200.5,
    divesLogged: 15,
  });
  expect(values.requestedDate?.toISOString()).toBe('2026-07-14T00:00:00.000Z');
  expect(values.lastDiveDate?.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  expect(values.customerName).toBeNull();
});

/** Verifies only meaningful deposit details result in a Deposit record. */
test('creates deposits only for non-default status or supplied deposit values', () => {
  const noDeposit = normalizeBookingFormValues(bookingFormDefaultValues);

  expect(hasMeaningfulDeposit(noDeposit)).toBe(false);
  expect(
    hasMeaningfulDeposit({
      ...noDeposit,
      depositStatus: DepositStatus.PENDING,
    }),
  ).toBe(true);
  expect(
    hasMeaningfulDeposit({
      ...noDeposit,
      amount: 100,
    }),
  ).toBe(true);
});
