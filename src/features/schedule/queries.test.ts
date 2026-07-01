import { beforeEach, expect, test, vi } from 'vitest';

import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  BookingStatus,
  ScheduleAssignmentRole,
  UserRole,
} from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findManyUsers: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  db: {
    scheduleItem: {
      findMany: mocks.findMany,
    },
    user: {
      findMany: mocks.findManyUsers,
    },
  },
}));

import {
  buildSchedulePageWhere,
  getAssignableStaff,
  getMyScheduleAssignments,
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

const instructorUser = {
  ...adminUser,
  id: 'instructor-1',
  role: UserRole.INSTRUCTOR,
};

const divemasterUser = {
  ...adminUser,
  id: 'divemaster-1',
  role: UserRole.DIVEMASTER,
};

type ScheduleCalendarQueryItem = Parameters<
  typeof mapScheduleItemsToCalendarEvents
>[0][number];

type ScheduleCalendarBookingRequest =
  ScheduleCalendarQueryItem['bookingRequest'];

/**
 * Builds a schedule query row for focused calendar event mapping tests.
 *
 * @param overrides - Schedule item and nested booking fields to override.
 * @returns A complete schedule row matching the calendar mapper input.
 */
function scheduleCalendarQueryItem(
  overrides: Partial<Omit<ScheduleCalendarQueryItem, 'bookingRequest'>> & {
    bookingRequest?: Partial<ScheduleCalendarBookingRequest>;
  } = {},
): ScheduleCalendarQueryItem {
  const scheduleDate = new Date('2026-07-14T00:00:00.000Z');
  const bookingRequest: ScheduleCalendarBookingRequest = {
    id: 'booking-1',
    status: BookingStatus.SCHEDULED,
    createdById: 'customer-service-1',
    numberOfPeople: 2,
    source: BookingSource.WECHAT,
    referrerName: null,
    endAt: new Date('2026-07-14T12:30:00.000Z'),
    internalNotes: null,
    activities: [
      {
        id: 'activity-1',
        activityType: ActivityType.FUN_DIVE,
        specialtyCourse: null,
        requestedDate: scheduleDate,
        requestedTime: '08:00',
        notes: null,
        sortOrder: 0,
      },
    ],
    customers: [
      {
        role: BookingCustomerRole.PRIMARY_CONTACT,
        hotelAtBooking: null,
        createdAt: new Date('2026-06-24T00:00:00.000Z'),
        customer: {
          fullName: 'Maria Santos',
          chineseName: null,
          firstName: null,
          lastName: null,
          hotel: null,
        },
      },
    ],
    ...overrides.bookingRequest,
  };

  return {
    id: 'schedule-1',
    bookingRequestId: bookingRequest.id,
    date: scheduleDate,
    startTime: '08:00',
    activityType: ActivityType.FUN_DIVE,
    scheduleNotes: null,
    createdAt: new Date('2026-06-25T00:00:00.000Z'),
    assignments: [],
    ...overrides,
    bookingRequest,
  };
}

beforeEach(() => {
  mocks.findMany.mockReset();
  mocks.findManyUsers.mockReset();
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
  expect(
    mocks.findMany.mock.calls[0]?.[0]?.select.bookingRequest.select.customers
      .select.customer.select.chineseName,
  ).toBe(true);
});

test('queries calendar items with a schedule date range filter', async () => {
  mocks.findMany.mockResolvedValue([]);

  await getScheduleItemsForCalendar(adminUser, { range: 'today' });

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        date: {
          gte: expect.any(Date),
          lt: expect.any(Date),
        },
      },
    }),
  );
});

test('queries calendar items assigned to a selected staff user', async () => {
  mocks.findMany.mockResolvedValue([]);

  await getScheduleItemsForCalendar(adminUser, { staffId: 'staff-1' });

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        AND: [
          {
            assignments: {
              some: {
                userId: 'staff-1',
              },
            },
          },
        ],
      },
    }),
  );
});

test('queries calendar items with zero assignments for unassigned-only filters', async () => {
  mocks.findMany.mockResolvedValue([]);

  await getScheduleItemsForCalendar(adminUser, { unassignedOnly: true });

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        AND: [
          {
            assignments: {
              none: {},
            },
          },
        ],
      },
    }),
  );
});

test('queries calendar items by schedule item or booking activity type', async () => {
  mocks.findMany.mockResolvedValue([]);

  await getScheduleItemsForCalendar(adminUser, {
    activityType: ActivityType.FUN_DIVE,
  });

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        AND: [
          {
            OR: [
              {
                activityType: ActivityType.FUN_DIVE,
              },
              {
                bookingRequest: {
                  activities: {
                    some: {
                      activityType: ActivityType.FUN_DIVE,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    }),
  );
});

test('queries calendar items with combined schedule filters', async () => {
  mocks.findMany.mockResolvedValue([]);

  await getScheduleItemsForCalendar(adminUser, {
    activityType: ActivityType.SNORKELING,
    range: 'this-week',
    staffId: 'staff-2',
    unassignedOnly: true,
  });

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        date: {
          gte: expect.any(Date),
          lt: expect.any(Date),
        },
        AND: [
          {
            assignments: {
              some: {
                userId: 'staff-2',
              },
            },
          },
          {
            assignments: {
              none: {},
            },
          },
          {
            OR: [
              {
                activityType: ActivityType.SNORKELING,
              },
              {
                bookingRequest: {
                  activities: {
                    some: {
                      activityType: ActivityType.SNORKELING,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    }),
  );
});

test('queries active instructors and divemasters as assignable staff', async () => {
  mocks.findManyUsers.mockResolvedValue([]);

  await getAssignableStaff();

  expect(mocks.findManyUsers).toHaveBeenCalledWith({
    where: {
      isActive: true,
      role: {
        in: [UserRole.INSTRUCTOR, UserRole.DIVEMASTER],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  });
});

test('queries my assignments with scheduled status and current user assignment filter', async () => {
  mocks.findMany.mockResolvedValue([]);

  await getMyScheduleAssignments(instructorUser);

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        assignments: {
          some: {
            userId: instructorUser.id,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
    }),
  );
  expect(
    mocks.findMany.mock.calls[0]?.[0]?.select.bookingRequest.select.customers
      .select.customer.select.chineseName,
  ).toBe(true);
});

test('queries divemaster assignments with the current user assignment filter', async () => {
  mocks.findMany.mockResolvedValue([]);

  await getMyScheduleAssignments(divemasterUser);

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        assignments: {
          some: {
            userId: divemasterUser.id,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
    }),
  );
  expect(
    mocks.findMany.mock.calls[0]?.[0]?.select.bookingRequest.select.customers
      .select.customer.select.chineseName,
  ).toBe(true);
});

test('does not query my assignments for unauthorized customer service users', async () => {
  await expect(getMyScheduleAssignments(customerServiceUser)).resolves.toEqual([]);

  expect(mocks.findMany).not.toHaveBeenCalled();
});

test('does not query my assignments for admin or manager users', async () => {
  await expect(getMyScheduleAssignments(adminUser)).resolves.toEqual([]);
  await expect(
    getMyScheduleAssignments({ ...adminUser, role: UserRole.MANAGER }),
  ).resolves.toEqual([]);

  expect(mocks.findMany).not.toHaveBeenCalled();
});

test('maps my assignments with the current user role from multiple assignments', async () => {
  const scheduleDate = new Date('2026-07-14T00:00:00.000Z');

  mocks.findMany.mockResolvedValue([
    {
      id: 'schedule-1',
      bookingRequestId: 'booking-1',
      date: scheduleDate,
      startTime: '08:00',
      activityType: ActivityType.FUN_DIVE,
      scheduleNotes: 'Meet at the shop.',
      createdAt: new Date('2026-06-25T00:00:00.000Z'),
      assignments: [
        {
          id: 'assignment-other',
          userId: 'divemaster-1',
          role: ScheduleAssignmentRole.DIVEMASTER,
        },
        {
          id: 'assignment-current',
          userId: instructorUser.id,
          role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
        },
      ],
      bookingRequest: {
        id: 'booking-1',
        status: BookingStatus.SCHEDULED,
        numberOfPeople: 3,
        endAt: new Date('2026-07-14T12:30:00.000Z'),
        activities: [
          {
            id: 'activity-1',
            activityType: ActivityType.FUN_DIVE,
            specialtyCourse: null,
            requestedDate: scheduleDate,
            requestedTime: '08:00',
            notes: 'Two tanks.',
            sortOrder: 0,
          },
          {
            id: 'activity-2',
            activityType: ActivityType.SNORKELING,
            specialtyCourse: null,
            requestedDate: scheduleDate,
            requestedTime: '10:00',
            notes: null,
            sortOrder: 1,
          },
        ],
        customers: [
          {
            role: BookingCustomerRole.PARTICIPANT,
            hotelAtBooking: null,
            createdAt: new Date('2026-06-24T00:00:00.000Z'),
            customer: {
              fullName: 'Participant Diver',
              chineseName: null,
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
              chineseName: '玛丽亚',
              firstName: null,
              lastName: null,
              hotel: 'Customer Hotel',
            },
          },
        ],
      },
    },
  ]);

  await expect(getMyScheduleAssignments(instructorUser)).resolves.toEqual([
    {
      scheduleItemId: 'schedule-1',
      bookingId: 'booking-1',
      date: scheduleDate,
      startTime: '08:00',
      endTime: '12:30',
      isTimeTbd: false,
      activityType: ActivityType.FUN_DIVE,
      activityLabel: 'Fun Dive',
      activitySummary: 'Fun Dive + Snorkeling',
      activities: [
        {
          id: 'activity-1',
          activityType: ActivityType.FUN_DIVE,
          activityLabel: 'Fun Dive',
          specialtyCourse: null,
          requestedDate: scheduleDate,
          requestedTime: '08:00',
          notes: 'Two tanks.',
        },
        {
          id: 'activity-2',
          activityType: ActivityType.SNORKELING,
          activityLabel: 'Snorkeling',
          specialtyCourse: null,
          requestedDate: scheduleDate,
          requestedTime: '10:00',
          notes: null,
        },
      ],
      primaryCustomerName: 'Maria Santos',
      customers: [
        {
          name: 'Participant Diver',
          chineseName: null,
          isPrimaryContact: false,
          role: BookingCustomerRole.PARTICIPANT,
        },
        {
          name: 'Maria Santos / 玛丽亚',
          chineseName: '玛丽亚',
          isPrimaryContact: true,
          role: BookingCustomerRole.PRIMARY_CONTACT,
        },
      ],
      numberOfPeople: 3,
      hotel: 'Primary Booking Hotel',
      scheduleNotes: 'Meet at the shop.',
      assignmentRole: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
    },
  ]);
});

test('scopes customer service schedule rows to their own bookings', () => {
  expect(buildSchedulePageWhere(customerServiceUser)).toEqual({
    bookingRequest: {
      status: BookingStatus.SCHEDULED,
      createdById: customerServiceUser.id,
    },
  });
});

test('leaves admin manager and instructor schedule rows unscoped except scheduled status', () => {
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
  expect(buildSchedulePageWhere(instructorUser)).toEqual({
    bookingRequest: {
      status: BookingStatus.SCHEDULED,
    },
  });
});

test('returns no schedule rows for unsupported roles', () => {
  expect(
    buildSchedulePageWhere({ ...adminUser, role: UserRole.DIVEMASTER }),
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
      assignments: [
        {
          id: 'assignment-1',
          userId: 'instructor-1',
          role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
          notes: null,
          user: {
            id: 'instructor-1',
            name: 'Inez Instructor',
            email: 'inez@example.test',
            role: UserRole.INSTRUCTOR,
          },
        },
      ],
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
              chineseName: null,
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
              chineseName: null,
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
      assignments: [
        {
          id: 'assignment-1',
          userId: 'instructor-1',
          role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
          notes: null,
          user: {
            id: 'instructor-1',
            name: 'Inez Instructor',
            email: 'inez@example.test',
            role: UserRole.INSTRUCTOR,
          },
        },
      ],
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
      assignments: [],
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
              chineseName: null,
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
        assignments: [
          {
            id: 'assignment-1',
            userId: 'divemaster-1',
            role: ScheduleAssignmentRole.DIVEMASTER,
            notes: 'Leads certified divers.',
            user: {
              id: 'divemaster-1',
              name: 'Dina Divemaster',
              email: 'dina@example.test',
              role: UserRole.DIVEMASTER,
            },
          },
        ],
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
                chineseName: null,
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
      title: '[Dina] Fun Dive x2 Anchie',
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
      customers: [
        {
          name: 'Anchie',
          chineseName: null,
          isPrimaryContact: true,
          role: BookingCustomerRole.PRIMARY_CONTACT,
        },
      ],
      numberOfPeople: 2,
      hotel: 'Primary Booking Hotel',
      source: BookingSource.WECHAT,
      referrerName: 'Lina',
      notes: 'Bring cash for marine park fees.',
      assignments: [
        {
          id: 'assignment-1',
          userId: 'divemaster-1',
          role: ScheduleAssignmentRole.DIVEMASTER,
          notes: 'Leads certified divers.',
          user: {
            id: 'divemaster-1',
            name: 'Dina Divemaster',
            email: 'dina@example.test',
            role: UserRole.DIVEMASTER,
          },
        },
      ],
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
        assignments: [],
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
                chineseName: null,
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
      title: '[Unassigned] Open Water x1 Li Na',
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

test('maps multiple assigned staff into a compact calendar event title prefix', () => {
  const [event] = mapScheduleItemsToCalendarEvents([
    scheduleCalendarQueryItem({
      activityType: ActivityType.RESCUE_DIVER_COURSE,
      assignments: [
        {
          id: 'assignment-1',
          userId: 'instructor-1',
          role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
          notes: null,
          user: {
            id: 'instructor-1',
            name: 'Mark Instructor',
            email: 'mark@example.test',
            role: UserRole.INSTRUCTOR,
          },
        },
        {
          id: 'assignment-2',
          userId: 'divemaster-1',
          role: ScheduleAssignmentRole.DIVEMASTER,
          notes: null,
          user: {
            id: 'divemaster-1',
            name: 'Erik Divemaster',
            email: 'erik@example.test',
            role: UserRole.DIVEMASTER,
          },
        },
      ],
      bookingRequest: {
        activities: [
          {
            id: 'activity-1',
            activityType: ActivityType.RESCUE_DIVER_COURSE,
            specialtyCourse: null,
            requestedDate: new Date('2026-07-14T00:00:00.000Z'),
            requestedTime: '08:00',
            notes: null,
            sortOrder: 0,
          },
        ],
        customers: [
          {
            role: BookingCustomerRole.PRIMARY_CONTACT,
            hotelAtBooking: null,
            createdAt: new Date('2026-06-24T00:00:00.000Z'),
            customer: {
              fullName: 'John Doe',
              chineseName: null,
              firstName: null,
              lastName: null,
              hotel: null,
            },
          },
        ],
        numberOfPeople: 1,
      },
    }),
  ]);

  expect(event?.title).toBe('[Mark/Erik] Rescue Diver Course x1 John Doe');
  expect(event?.title).not.toContain('example.test');
});

test('falls back safely for blank staff names and unknown party size', () => {
  const [event] = mapScheduleItemsToCalendarEvents([
    scheduleCalendarQueryItem({
      assignments: [
        {
          id: 'assignment-1',
          userId: 'instructor-1',
          role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
          notes: null,
          user: {
            id: 'instructor-1',
            name: ' ',
            email: 'instructor@example.test',
            role: UserRole.INSTRUCTOR,
          },
        },
      ],
      bookingRequest: {
        numberOfPeople: null,
        customers: [],
      },
    }),
  ]);

  expect(event?.title).toBe('[Lead Instructor] Fun Dive xTBD Customer TBD');
  expect(event?.title).not.toContain('instructor@example.test');
});
