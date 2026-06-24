import { expect, test } from 'vitest';

import {
  bookingCustomerDefaultValues,
  bookingFormDefaultValues,
  formatEnumLabel,
  hasMeaningfulDeposit,
  normalizeBookingFormValues,
} from '@/features/bookings/intake';
import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  Currency,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';

test('formats enum labels for display', () => {
  expect(formatEnumLabel(ActivityType.OPEN_WATER_COURSE)).toBe('Open Water Course');
  expect(formatEnumLabel(null)).toBe('—');
});

test('normalizes nested activity and customer values for persistence', () => {
  const values = normalizeBookingFormValues({
    ...bookingFormDefaultValues,
    rawBookingText: '  Customer message  ',
    activities: [
      {
        activityType: ActivityType.FUN_DIVE,
        specialtyCourse: '  Nitrox  ',
        requestedDate: '2026-07-14',
        requestedTime: ' 09:30 ',
        notes: '  Morning boat  ',
      },
    ],
    numberOfPeople: ' 3 ',
    source: BookingSource.WECHAT,
    customers: [
      {
        ...bookingCustomerDefaultValues,
        role: BookingCustomerRole.PRIMARY_CONTACT,
        customerName: '  Maria Santos ',
        preferredLanguage: PreferredLanguage.CHINESE,
        hotelAtBooking: '  Sea View Hotel ',
        equipmentNeeded: '  BCD and fins ',
        heightCm: '170',
        weightKg: ' 63.5 ',
        shoeSize: '40.5',
        lastDiveDate: '2026-06-01',
        divesLogged: '15',
      },
    ],
    amount: ' 1200.50 ',
    currency: Currency.PESOS,
  });

  expect(values).toMatchObject({
    rawBookingText: 'Customer message',
    numberOfPeople: 3,
    source: BookingSource.WECHAT,
    amount: 1200.5,
    currency: Currency.PESOS,
    activities: [
      {
        activityType: ActivityType.FUN_DIVE,
        specialtyCourse: 'Nitrox',
        requestedTime: '09:30',
        notes: 'Morning boat',
      },
    ],
    customers: [
      {
        role: BookingCustomerRole.PRIMARY_CONTACT,
        customerName: 'Maria Santos',
        preferredLanguage: PreferredLanguage.CHINESE,
        hotelAtBooking: 'Sea View Hotel',
        equipmentNeeded: 'BCD and fins',
        heightCm: 170,
        weightKg: 63.5,
        shoeSize: 40.5,
        divesLogged: 15,
      },
    ],
  });
  expect(values.activities[0].requestedDate?.toISOString()).toBe('2026-07-14T00:00:00.000Z');
  expect(values.customers[0].lastDiveDate?.toISOString()).toBe('2026-06-01T00:00:00.000Z');
});

test('creates deposits only for non-default status or supplied deposit values', () => {
  const noDeposit = normalizeBookingFormValues(bookingFormDefaultValues);

  expect(hasMeaningfulDeposit(noDeposit)).toBe(false);
  expect(hasMeaningfulDeposit({ ...noDeposit, depositStatus: DepositStatus.PENDING })).toBe(true);
  expect(hasMeaningfulDeposit({ ...noDeposit, amount: 100 })).toBe(true);
});
