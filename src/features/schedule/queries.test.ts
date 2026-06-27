import { beforeEach, expect, test, vi } from 'vitest';

import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  BookingStatus,
  UserRole,
} from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  db: {
    scheduleItem: {
      findMany: mocks.findMany,
    },
  },
}));

import {
  buildSchedulePageWhere,
  getScheduleItemsForCalendar,
  getScheduledBookingsForSchedulePage,
  mapScheduleItemsToCalendarEvents,
} from '@/features/schedule/queries';

const adminUser = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@example.test',
  role: UserRole.ADMIN,
};

const customerServiceUser = {
  ...adminUser,
  id: 'customer-service-1',
  role: UserRole.CUSTOMER_SERVICE,
};

beforeEach(() => {
  mocks.findMany.mockReset();
});

test('queries only official scheduled bookings in sorted order', async () => {
  mocks.findMany.mockResolvedValue([]);

  await getScheduledBookingsForSchedulePage(adminUser);

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
    }),
  );
});

test('queries calendar items with the official scheduled booking filter', async () => {
  mocks.findMany.mockResolvedValue([]);

  await getScheduleItemsForCalendar(adminUser);

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
    }),
  );
});

test('scopes customer service schedule rows to their own bookings', () => {
  expect(buildSchedulePageWhere(customerServiceUser)).toEqual({
    bookingRequest: {
      status: BookingStatus.SCHEDULED,
      createdById: customerServiceUser.id,
    },
  });
});

test('leaves admin and manager schedule rows unscoped except scheduled status', () => {
  expect(buildSchedulePageWhere(adminUser)).toEqual({
    bookingRequest: {
      status: BookingStatus.SCHEDULED,
    },
  });
  expect(
    buildSchedulePageWhere({ ...adminUser, role: UserRole.MANAGER }),
  ).toEqual({
    bookingRequest: {
      status: BookingStatus.SCHEDULED,
    },
  });
});

test('returns no schedule rows for unsupported roles', () => {
  expect(
    buildSchedulePageWhere({ ...adminUser, role: UserRole.INSTRUCTOR }),
  ).toEqual({
    id: { in: [] },
    bookingRequest: {
      status: BookingStatus.SCHEDULED,
    },
  });
});

test('maps schedule rows into schedule page items', async () => {
  const scheduleDate = new Date('2026-07-14T00:00:00.000Z');

  mocks.findMany.mockResolvedValue([
    {
      id: 'schedule-1',
      bookingRequestId: 'booking-1',
      date: scheduleDate,
      startTime: '08:00',
      activityType: ActivityType.FUN_DIVE,
      scheduleNotes: 'Bring cash for marine park fees.',
      createdAt: new Date('2026-06-25T00:00:00.000Z'),
      bookingRequest: {
        id: 'booking-1',
        status: BookingStatus.SCHEDULED,
        createdById: 'customer-service-1',
        numberOfPeople: 2,
        source: BookingSource.WECHAT,
        referrerName: 'Lina',
        internalNotes: 'Customer prefers a morning slot.',
        customers: [
          {
            role: BookingCustomerRole.PARTICIPANT,
            hotelAtBooking: null,
            createdAt: new Date('2026-06-24T00:00:00.000Z'),
            customer: {
              fullName: 'Participant Diver',
              firstName: null,
              lastName: null,
              hotel: 'Participant Hotel',
            },
          },
          {
            role: BookingCustomerRole.PRIMARY_CONTACT,
            hotelAtBooking: 'Primary Booking Hotel',
            createdAt: new Date('2026-06-24T00:01:00.000Z'),
            customer: {
              fullName: 'Maria Santos',
              firstName: null,
              lastName: null,
              hotel: 'Customer Hotel',
            },
          },
        ],
      },
    },
  ]);

  await expect(getScheduledBookingsForSchedulePage(adminUser)).resolves.toEqual([
    {
      scheduleItemId: 'schedule-1',
      bookingId: 'booking-1',
      date: scheduleDate,
      startTime: '08:00',
      activityType: ActivityType.FUN_DIVE,
      primaryCustomerName: 'Maria Santos',
      numberOfPeople: 2,
      hotel: 'Primary Booking Hotel',
      source: BookingSource.WECHAT,
      referrerName: 'Lina',
      notes: 'Bring cash for marine park fees.',
    },
  ]);
});

test('falls back to booking internal notes and customer hotel', async () => {
  const scheduleDate = new Date('2026-07-15T00:00:00.000Z');

  mocks.findMany.mockResolvedValue([
    {
      id: 'schedule-2',
      bookingRequestId: 'booking-2',
      date: scheduleDate,
      startTime: null,
      activityType: ActivityType.OPEN_WATER_COURSE,
      scheduleNotes: null,
      createdAt: new Date('2026-06-25T00:00:00.000Z'),
      bookingRequest: {
        id: 'booking-2',
        status: BookingStatus.SCHEDULED,
        createdById: 'customer-service-1',
        numberOfPeople: 1,
        source: BookingSource.EMAIL,
        referrerName: null,
        internalNotes: 'Use the pool first.',
        customers: [
          {
            role: BookingCustomerRole.PRIMARY_CONTACT,
            hotelAtBooking: null,
            createdAt: new Date('2026-06-24T00:00:00.000Z'),
            customer: {
              fullName: null,
              firstName: 'Ari',
              lastName: 'Tan',
              hotel: 'Harbor Inn',
            },
          },
        ],
      },
    },
  ]);

  await expect(getScheduledBookingsForSchedulePage(adminUser)).resolves.toEqual([
    expect.objectContaining({
      scheduleItemId: 'schedule-2',
      primaryCustomerName: 'Ari Tan',
      hotel: 'Harbor Inn',
      notes: 'Use the pool first.',
    }),
  ]);
});

test('maps timed schedule rows into calendar events', () => {
  const scheduleDate = new Date('2026-07-14T00:00:00.000Z');

  expect(
    mapScheduleItemsToCalendarEvents([
      {
        id: 'schedule-1',
        bookingRequestId: 'booking-1',
        date: scheduleDate,
        startTime: '08:00',
        activityType: ActivityType.FUN_DIVE,
        scheduleNotes: 'Bring cash for marine park fees.',
        createdAt: new Date('2026-06-25T00:00:00.000Z'),
        bookingRequest: {
          id: 'booking-1',
          status: BookingStatus.SCHEDULED,
          createdById: 'customer-service-1',
          numberOfPeople: 2,
          source: BookingSource.WECHAT,
          referrerName: 'Lina',
          endAt: new Date('2026-07-14T12:30:00.000Z'),
          internalNotes: 'Customer prefers a morning slot.',
          activities: [
            {
              id: 'activity-1',
              activityType: ActivityType.FUN_DIVE,
              specialtyCourse: null,
              requestedDate: scheduleDate,
              requestedTime: '08:00',
              notes: 'Two-tank trip.',
              sortOrder: 0,
            },
          ],
          customers: [
            {
              role: BookingCustomerRole.PRIMARY_CONTACT,
              hotelAtBooking: 'Primary Booking Hotel',
              createdAt: new Date('2026-06-24T00:01:00.000Z'),
              customer: {
                fullName: 'Anchie',
                firstName: null,
                lastName: null,
                hotel: 'Customer Hotel',
              },
            },
          ],
        },
      },
    ]),
  ).toEqual([
    {
      id: 'schedule-1',
      title: 'Fun Dive - Anchie - 2 pax',
      start: '2026-07-14T08:00:00',
      end: '2026-07-14T12:30:00',
      allDay: false,
      bookingId: 'booking-1',
      bookingReference: 'booking-1',
      scheduleItemId: 'schedule-1',
      date: scheduleDate,
      startTime: '08:00',
      endTime: '12:30',
      activityType: ActivityType.FUN_DIVE,
      activityLabel: 'Fun Dive',
      activitySummary: 'Fun Dive',
      activities: [
        {
          id: 'activity-1',
          activityType: ActivityType.FUN_DIVE,
          activityLabel: 'Fun Dive',
          specialtyCourse: null,
          requestedDate: scheduleDate,
          requestedTime: '08:00',
          notes: 'Two-tank trip.',
        },
      ],
      primaryCustomerName: 'Anchie',
      numberOfPeople: 2,
      hotel: 'Primary Booking Hotel',
      source: BookingSource.WECHAT,
      referrerName: 'Lina',
      notes: 'Bring cash for marine park fees.',
      isTimeTbd: false,
    },
  ]);
});

test('maps no-time schedule rows into TBD all-day calendar events', () => {
  const scheduleDate = new Date('2026-07-15T00:00:00.000Z');

  expect(
    mapScheduleItemsToCalendarEvents([
      {
        id: 'schedule-2',
        bookingRequestId: 'booking-2',
        date: scheduleDate,
        startTime: null,
        activityType: ActivityType.OPEN_WATER_COURSE,
        scheduleNotes: null,
        createdAt: new Date('2026-06-25T00:00:00.000Z'),
        bookingRequest: {
          id: 'booking-2',
          status: BookingStatus.SCHEDULED,
          createdById: 'customer-service-1',
          numberOfPeople: 1,
          source: BookingSource.EMAIL,
          referrerName: null,
          endAt: null,
          internalNotes: 'Use the pool first.',
          activities: [],
          customers: [
            {
              role: BookingCustomerRole.PRIMARY_CONTACT,
              hotelAtBooking: null,
              createdAt: new Date('2026-06-24T00:00:00.000Z'),
              customer: {
                fullName: null,
                firstName: 'Li',
                lastName: 'Na',
                hotel: 'Harbor Inn',
              },
            },
          ],
        },
      },
    ]),
  ).toEqual([
    expect.objectContaining({
      id: 'schedule-2',
      title: 'TBD - Open Water - Li Na - 1 pax',
      start: '2026-07-15',
      end: null,
      allDay: true,
      startTime: null,
      endTime: null,
      activityLabel: 'Open Water',
      activitySummary: 'Open Water',
      isTimeTbd: true,
    }),
  ]);
});
