import { beforeEach, expect, test, vi } from 'vitest';

import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  BookingStatus,
  PreferredLanguage,
  ScheduleTimeSlot,
  UserRole,
} from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      count: mocks.count,
      findUnique: mocks.findUnique,
      findMany: mocks.findMany,
    },
  },
}));

import {
  getCustomerDetail,
  getCustomerLookupPage,
  getRecentCustomers,
  parseCustomerPageParam,
  parseCustomerPageSizeParam,
  searchCustomers,
} from './queries';

const customerServiceUser = {
  id: 'customer-service-1',
  name: 'Customer Service',
  email: 'customer-service@example.test',
  role: UserRole.CUSTOMER_SERVICE,
};

beforeEach(() => {
  mocks.count.mockReset();
  mocks.findUnique.mockReset();
  mocks.findMany.mockReset();
});

test('does not query customers for blank search input', async () => {
  await expect(searchCustomers(customerServiceUser, '   ')).resolves.toEqual([]);

  expect(mocks.findMany).not.toHaveBeenCalled();
});

test('searches supported customer identity fields', async () => {
  mocks.findMany.mockResolvedValue([]);

  await searchCustomers(customerServiceUser, ' anchie ');

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
            activityType: ActivityType.FUN_DIVE,
            startAt: null,
            requestedDate: lastBookingDate,
            createdAt: new Date('2026-06-20T00:00:00.000Z'),
            activities: [{ activityType: ActivityType.SNORKELING }],
          },
        },
      ],
      _count: {
        bookings: 3,
      },
    },
  ]);

  await expect(searchCustomers(customerServiceUser, 'anchie')).resolves.toEqual([
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
      lastActivity: ActivityType.FUN_DIVE,
      bookingCount: 3,
    },
  ]);
});

test('returns recent customers ordered by newest update first', async () => {
  mocks.findMany.mockResolvedValue([]);

  await expect(getRecentCustomers(customerServiceUser, 12)).resolves.toEqual([]);

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      orderBy: {
        updatedAt: 'desc',
      },
      take: 12,
    }),
  );
});

test('returns a paginated default customer lookup page', async () => {
  mocks.count.mockResolvedValue(26);
  mocks.findMany.mockResolvedValue([]);

  await expect(
    getCustomerLookupPage(customerServiceUser, '', { page: 2, pageSize: 10 }),
  ).resolves.toEqual({
    customers: [],
    pagination: {
      totalCount: 26,
      page: 2,
      pageSize: 10,
      totalPages: 3,
    },
  });

  expect(mocks.count).toHaveBeenCalledWith({ where: undefined });
  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: undefined,
      orderBy: {
        updatedAt: 'desc',
      },
      skip: 10,
      take: 10,
    }),
  );
});

test('returns a paginated searched customer lookup page', async () => {
  mocks.count.mockResolvedValue(23);
  mocks.findMany.mockResolvedValue([]);

  await expect(
    getCustomerLookupPage(customerServiceUser, ' anchie ', {
      page: 5,
      pageSize: 10,
    }),
  ).resolves.toMatchObject({
    pagination: {
      totalCount: 23,
      page: 3,
      pageSize: 10,
      totalPages: 3,
    },
  });

  expect(mocks.count).toHaveBeenCalledWith(
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
  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      skip: 20,
      take: 10,
    }),
  );
});

test('parses customer pagination params safely', () => {
  expect(parseCustomerPageParam('3')).toBe(3);
  expect(parseCustomerPageParam(undefined)).toBe(1);
  expect(parseCustomerPageParam(['1', '2'])).toBe(1);
  expect(parseCustomerPageParam('0')).toBe(1);
  expect(parseCustomerPageParam('-1')).toBe(1);
  expect(parseCustomerPageParam('1.5')).toBe(1);
  expect(parseCustomerPageParam('unknown')).toBe(1);

  expect(parseCustomerPageSizeParam('10')).toBe(10);
  expect(parseCustomerPageSizeParam(undefined)).toBe(10);
  expect(parseCustomerPageSizeParam(['10'])).toBe(10);
  expect(parseCustomerPageSizeParam('25')).toBe(10);
  expect(parseCustomerPageSizeParam('unknown')).toBe(10);
});

test('returns null when customer detail is missing', async () => {
  mocks.findUnique.mockResolvedValue(null);

  await expect(
    getCustomerDetail(customerServiceUser, 'missing-customer'),
  ).resolves.toBeNull();

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
          requestedTime: '08:30',
          requestedTimeSlot: ScheduleTimeSlot.AM,
          startAt: null,
          numberOfPeople: 2,
          source: BookingSource.WECHAT,
          referrerName: 'Lee',
          createdAt: olderDate,
          updatedAt: olderDate,
          scheduleItem: null,
          activities: [
            {
              activityType: ActivityType.FUN_DIVE,
              requestedDate: olderDate,
              requestedTime: '08:30',
              requestedTimeSlot: ScheduleTimeSlot.AM,
            },
          ],
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
          requestedTime: null,
          requestedTimeSlot: ScheduleTimeSlot.TBD,
          startAt: newestDate,
          numberOfPeople: 3,
          source: BookingSource.REFERRAL,
          referrerName: 'Maria',
          createdAt: newerDate,
          updatedAt: newestDate,
          scheduleItem: {
            date: newestDate,
            startTime: '10:00',
            timeSlot: ScheduleTimeSlot.PM,
          },
          activities: [
            {
              activityType: ActivityType.FUN_DIVE,
              requestedDate: newerDate,
              requestedTime: '09:00',
              requestedTimeSlot: ScheduleTimeSlot.AM,
            },
            {
              activityType: ActivityType.SNORKELING,
              requestedDate: null,
              requestedTime: null,
              requestedTimeSlot: ScheduleTimeSlot.TBD,
            },
          ],
        },
      },
    ],
  });

  await expect(
    getCustomerDetail(customerServiceUser, 'customer-1'),
  ).resolves.toMatchObject({
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
        requestedDate: newerDate,
        requestedTime: null,
        requestedTimeSlot: ScheduleTimeSlot.TBD,
        scheduledDate: newestDate,
        scheduledTime: '10:00',
        scheduledTimeSlot: ScheduleTimeSlot.PM,
        role: BookingCustomerRole.PRIMARY_CONTACT,
        isPrimaryContact: true,
        numberOfPeople: 3,
        source: BookingSource.REFERRAL,
        referrerName: 'Maria',
        hotelAtBooking: 'New Hotel',
        updatedAt: newestDate,
      },
      {
        bookingId: 'booking-old',
        status: BookingStatus.APPROVED,
        date: olderDate,
        requestedDate: olderDate,
        requestedTime: '08:30',
        requestedTimeSlot: ScheduleTimeSlot.AM,
        scheduledDate: null,
        scheduledTime: null,
        scheduledTimeSlot: null,
        role: BookingCustomerRole.PARTICIPANT,
        isPrimaryContact: false,
        numberOfPeople: 2,
        source: BookingSource.WECHAT,
        referrerName: 'Lee',
        hotelAtBooking: 'Old Hotel',
        updatedAt: olderDate,
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

  await expect(
    getCustomerDetail(customerServiceUser, 'customer-empty'),
  ).resolves.toEqual({
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

test('rejects instructor customer queries before Prisma access', async () => {
  const instructor = {
    ...customerServiceUser,
    id: 'instructor-1',
    role: UserRole.INSTRUCTOR,
  };

  await expect(searchCustomers(instructor, 'anchie')).rejects.toMatchObject({
    name: 'AuthorizationError',
  });
  await expect(getRecentCustomers(instructor)).rejects.toMatchObject({
    name: 'AuthorizationError',
  });
  await expect(
    getCustomerLookupPage(instructor, '', { page: 1, pageSize: 10 }),
  ).rejects.toMatchObject({ name: 'AuthorizationError' });
  await expect(getCustomerDetail(instructor, 'customer-1')).rejects.toMatchObject(
    { name: 'AuthorizationError' },
  );

  expect(mocks.findMany).not.toHaveBeenCalled();
  expect(mocks.findUnique).not.toHaveBeenCalled();
  expect(mocks.count).not.toHaveBeenCalled();
});
