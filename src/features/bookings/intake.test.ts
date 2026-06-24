import { expect, test } from 'vitest';

import {
  bookingCustomerDefaultValues,
  bookingFormDefaultValues,
} from '@/features/bookings/form-values';
import { formatEnumLabel } from '@/features/bookings/form-options';
import {
  hasMeaningfulDeposit,
  mapBookingToFormValues,
  normalizeBookingFormValues,
} from '@/features/bookings/form-mappers';
import type { BookingDetailsItem } from '@/features/bookings/queries';
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

test('maps persisted booking relations into editable browser form values', () => {
  const booking = {
    id: 'booking-1',
    status: 'NEEDS_MORE_INFO',
    activityType: ActivityType.FUN_DIVE,
    specialtyCourse: null,
    source: BookingSource.EMAIL,
    requestedDate: new Date('2026-07-14T00:00:00.000Z'),
    requestedTime: '09:00',
    numberOfPeople: 2,
    referrerName: 'Hotel desk',
    startAt: null,
    endAt: null,
    notes: 'Original request',
    internalNotes: 'Check certification',
    needsMoreInfoReason: 'Add certification details.',
    createdById: 'cs-1',
    createdBy: { id: 'cs-1', name: 'Customer Service' },
    createdAt: new Date(),
    updatedAt: new Date(),
    activities: [
      {
        id: 'activity-1',
        activityType: ActivityType.FUN_DIVE,
        specialtyCourse: null,
        requestedDate: new Date('2026-07-14T00:00:00.000Z'),
        requestedTime: '09:00',
        notes: 'Morning boat',
        sortOrder: 0,
      },
    ],
    customers: [
      {
        bookingRequestId: 'booking-1',
        customerId: 'customer-1',
        role: BookingCustomerRole.PRIMARY_CONTACT,
        hotelAtBooking: 'Sea View',
        equipmentNeeded: 'BCD',
        notes: 'Needs rental fins',
        certificationAgency: 'PADI',
        certificationLevel: 'Advanced',
        lastDiveAt: new Date('2026-06-01T00:00:00.000Z'),
        heightCm: 170,
        weightKg: { toString: () => '63.5' },
        shoeSize: { toString: () => '40.5' },
        divesLogged: 15,
        customer: {
          fullName: 'Maria Santos',
          chineseName: null,
          weChatId: 'maria-wechat',
          whatsAppNumber: null,
          email: 'maria@example.com',
          phone: null,
          preferredLanguage: PreferredLanguage.ENGLISH,
        },
      },
    ],
    deposits: [
      {
        id: 'deposit-newest',
        bookingRequestId: 'booking-1',
        amount: { toString: () => '1200.50' },
        status: DepositStatus.PAID,
        currency: Currency.PESOS,
        paidTo: 'Front desk',
        paymentMethod: 'Cash',
        dueAt: null,
        paidAt: null,
        notes: 'Received',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    displayCustomer: null,
  } as unknown as BookingDetailsItem;

  expect(mapBookingToFormValues(booking)).toMatchObject({
    rawBookingText: 'Original request',
    numberOfPeople: '2',
    activities: [
      {
        activityType: ActivityType.FUN_DIVE,
        requestedDate: '2026-07-14',
      },
    ],
    customers: [
      {
        customerId: 'customer-1',
        customerName: 'Maria Santos',
        weightKg: '63.5',
        lastDiveDate: '2026-06-01',
      },
    ],
    depositStatus: DepositStatus.PAID,
    amount: '1200.50',
    currency: Currency.PESOS,
  });
});
