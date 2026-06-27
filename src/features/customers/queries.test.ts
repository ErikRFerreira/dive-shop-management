import { beforeEach, expect, test, vi } from 'vitest';

import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  BookingStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      findUnique: mocks.findUnique,
      findMany: mocks.findMany,
    },
  },
}));

import { getCustomerDetail, searchCustomers } from './queries';

beforeEach(() => {
  mocks.findUnique.mockReset();
  mocks.findMany.mockReset();
});

test('does not query customers for blank search input', async () => {
  await expect(searchCustomers('   ')).resolves.toEqual([]);

  expect(mocks.findMany).not.toHaveBeenCalled();
});

test('searches supported customer identity fields', async () => {
  mocks.findMany.mockResolvedValue([]);

  await searchCustomers(' anchie ');

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        OR: [
          { fullName: { contains: 'anchie', mode: 'insensitive' } },
          { firstName: { contains: 'anchie', mode: 'insensitive' } },
          { lastName: { contains: 'anchie', mode: 'insensitive' } },
          { chineseName: { contains: 'anchie', mode: 'insensitive' } },
          { weChatId: { contains: 'anchie', mode: 'insensitive' } },
          { whatsAppNumber: { contains: 'anchie', mode: 'insensitive' } },
          { email: { contains: 'anchie', mode: 'insensitive' } },
          { phone: { contains: 'anchie', mode: 'insensitive' } },
        ],
      },
    }),
  );
});

test('maps customer search results with latest booking details', async () => {
  const lastBookingDate = new Date('2026-07-14T00:00:00.000Z');
  const lastDiveDate = new Date('2026-06-01T00:00:00.000Z');

  mocks.findMany.mockResolvedValue([
    {
      id: 'customer-1',
      fullName: null,
      firstName: 'Anchie',
      lastName: 'Tan',
      chineseName: '安琪',
      weChatId: 'anchie-wx',
      whatsAppNumber: '+639171234567',
      email: 'anchie@example.test',
      phone: null,
      hotel: 'Ocean View',
      preferredLanguage: PreferredLanguage.CHINESE,
      bookings: [
        {
          certificationLevel: 'Advanced Open Water',
          certificationAgency: 'PADI',
          lastDiveAt: lastDiveDate,
          divesLogged: 24,
          bookingRequest: {
            startAt: null,
            requestedDate: lastBookingDate,
            createdAt: new Date('2026-06-20T00:00:00.000Z'),
          },
        },
      ],
    },
  ]);

  await expect(searchCustomers('anchie')).resolves.toEqual([
    {
      id: 'customer-1',
      name: 'Anchie Tan',
      fullName: null,
      firstName: 'Anchie',
      lastName: 'Tan',
      chineseName: '安琪',
      weChatId: 'anchie-wx',
      whatsAppNumber: '+639171234567',
      email: 'anchie@example.test',
      phone: null,
      hotel: 'Ocean View',
      preferredLanguage: PreferredLanguage.CHINESE,
      certificationLevel: 'Advanced Open Water',
      certificationAgency: 'PADI',
      lastDiveDate,
      divesLogged: 24,
      lastBookingDate,
    },
  ]);
});

test('returns null when customer detail is missing', async () => {
  mocks.findUnique.mockResolvedValue(null);

  await expect(getCustomerDetail('missing-customer')).resolves.toBeNull();

  expect(mocks.findUnique).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: 'missing-customer' },
    }),
  );
});

test('maps customer detail with latest known dive info and sorted booking history', async () => {
  const olderDate = new Date('2026-03-10T00:00:00.000Z');
  const newerDate = new Date('2026-07-14T00:00:00.000Z');
  const newestDate = new Date('2026-08-01T08:00:00.000Z');

  mocks.findUnique.mockResolvedValue({
    id: 'customer-1',
    fullName: null,
    firstName: 'Anchie',
    lastName: 'Tan',
    chineseName: '安琪',
    weChatId: 'anchie-wx',
    whatsAppNumber: '+639171234567',
    email: 'anchie@example.test',
    phone: null,
    hotel: 'Ocean View',
    preferredLanguage: PreferredLanguage.CHINESE,
    notes: 'Returning diver',
    createdAt: olderDate,
    updatedAt: newerDate,
    bookings: [
      {
        bookingRequestId: 'booking-old',
        customerId: 'customer-1',
        role: BookingCustomerRole.PARTICIPANT,
        hotelAtBooking: 'Old Hotel',
        equipmentNeeded: 'Mask strap',
        certificationAgency: 'PADI',
        certificationLevel: 'Open Water',
        lastDiveAt: new Date('2026-02-01T00:00:00.000Z'),
        heightCm: 170,
        weightKg: { toString: () => '63.5' },
        shoeSize: { toString: () => '40.5' },
        divesLogged: 20,
        createdAt: olderDate,
        updatedAt: olderDate,
        bookingRequest: {
          id: 'booking-old',
          status: BookingStatus.APPROVED,
          activityType: ActivityType.FUN_DIVE,
          requestedDate: olderDate,
          startAt: null,
          numberOfPeople: 2,
          source: BookingSource.WECHAT,
          referrerName: 'Lee',
          createdAt: olderDate,
          activities: [{ activityType: ActivityType.FUN_DIVE }],
        },
      },
      {
        bookingRequestId: 'booking-new',
        customerId: 'customer-1',
        role: BookingCustomerRole.PRIMARY_CONTACT,
        hotelAtBooking: 'New Hotel',
        equipmentNeeded: null,
        certificationAgency: null,
        certificationLevel: 'Advanced Open Water',
        lastDiveAt: null,
        heightCm: null,
        weightKg: null,
        shoeSize: null,
        divesLogged: 42,
        createdAt: newerDate,
        updatedAt: newerDate,
        bookingRequest: {
          id: 'booking-new',
          status: BookingStatus.PENDING_APPROVAL,
          activityType: null,
          requestedDate: newerDate,
          startAt: newestDate,
          numberOfPeople: 3,
          source: BookingSource.REFERRAL,
          referrerName: 'Maria',
          createdAt: newerDate,
          activities: [
            { activityType: ActivityType.FUN_DIVE },
            { activityType: ActivityType.SNORKELING },
          ],
        },
      },
    ],
  });

  await expect(getCustomerDetail('customer-1')).resolves.toMatchObject({
    id: 'customer-1',
    name: 'Anchie Tan',
    chineseName: '安琪',
    diveInfo: {
      certificationLevel: 'Advanced Open Water',
      certificationAgency: 'PADI',
      lastDiveDate: new Date('2026-02-01T00:00:00.000Z'),
      divesLogged: 42,
      heightCm: 170,
      weightKg: '63.5',
      shoeSize: '40.5',
      equipmentNotes: 'Mask strap',
    },
    bookingHistory: [
      {
        bookingId: 'booking-new',
        status: BookingStatus.PENDING_APPROVAL,
        date: newestDate,
        role: BookingCustomerRole.PRIMARY_CONTACT,
        isPrimaryContact: true,
        numberOfPeople: 3,
        source: BookingSource.REFERRAL,
        referrerName: 'Maria',
        hotelAtBooking: 'New Hotel',
      },
      {
        bookingId: 'booking-old',
        status: BookingStatus.APPROVED,
        date: olderDate,
        role: BookingCustomerRole.PARTICIPANT,
        isPrimaryContact: false,
        numberOfPeople: 2,
        source: BookingSource.WECHAT,
        referrerName: 'Lee',
        hotelAtBooking: 'Old Hotel',
      },
    ],
  });
});

test('maps incomplete customer detail data safely', async () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');

  mocks.findUnique.mockResolvedValue({
    id: 'customer-empty',
    fullName: null,
    firstName: null,
    lastName: null,
    chineseName: null,
    weChatId: null,
    whatsAppNumber: null,
    email: null,
    phone: null,
    hotel: null,
    preferredLanguage: null,
    notes: null,
    createdAt,
    updatedAt: createdAt,
    bookings: [],
  });

  await expect(getCustomerDetail('customer-empty')).resolves.toEqual({
    id: 'customer-empty',
    name: 'Unnamed customer',
    fullName: null,
    firstName: null,
    lastName: null,
    chineseName: null,
    weChatId: null,
    whatsAppNumber: null,
    email: null,
    phone: null,
    hotel: null,
    preferredLanguage: null,
    notes: null,
    createdAt,
    updatedAt: createdAt,
    diveInfo: {
      certificationLevel: null,
      certificationAgency: null,
      lastDiveDate: null,
      divesLogged: null,
      heightCm: null,
      weightKg: null,
      shoeSize: null,
      equipmentNotes: null,
    },
    bookingHistory: [],
  });
});
