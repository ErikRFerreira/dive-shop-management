import { beforeEach, expect, test, vi } from 'vitest';

import {
  ActivityType,
  BookingCustomerRole,
  BookingParticipantStatus,
  BookingSource,
  BookingStatus,
  ScheduleAssignmentRole,
  UserRole,
} from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  findMany: vi.fn(),
  findManyUsers: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  db: {
    scheduleItem: {
      count: mocks.count,
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
  getMyScheduleAssignmentBriefing,
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
        participationStatus: BookingParticipantStatus.ACTIVE,
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
    dayNumber: 1,
    totalDays: 1,
    scheduleNotes: null,
    createdAt: new Date('2026-06-25T00:00:00.000Z'),
    bookingActivity: null,
    assignments: [],
    ...overrides,
    bookingRequest,
  };
}

beforeEach(() => {
  mocks.count.mockReset();
  mocks.findMany.mockReset();
  mocks.findManyUsers.mockReset();
  vi.useRealTimers();
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

test('keeps cancelled bookings out of active calendar queries', async () => {
  mocks.findMany.mockResolvedValue([]);

  await getScheduleItemsForCalendar(adminUser);

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
      }),
    }),
  );
  expect(mocks.findMany.mock.calls[0]?.[0]?.where.bookingRequest.status).not.toBe(
    BookingStatus.CANCELLED,
  );
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
            activityType: {
              in: [ActivityType.FUN_DIVE],
            },
          },
          {
            bookingRequest: {
              activities: {
                some: {
                  activityType: {
                    in: [ActivityType.FUN_DIVE],
                  },
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

test('queries calendar items by broad fun dives schedule type', async () => {
  mocks.findMany.mockResolvedValue([]);

  await getScheduleItemsForCalendar(adminUser, {
    scheduleType: 'fun-dives',
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
                activityType: {
                  in: [ActivityType.FUN_DIVE],
                },
              },
              {
                bookingRequest: {
                  activities: {
                    some: {
                      activityType: {
                        in: [ActivityType.FUN_DIVE],
                      },
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

test('queries calendar items by broad courses schedule type', async () => {
  mocks.findMany.mockResolvedValue([]);

  await getScheduleItemsForCalendar(adminUser, {
    scheduleType: 'courses',
  });

  const courseActivityTypes = [
    ActivityType.DISCOVER_SCUBA_DIVING,
    ActivityType.OPEN_WATER_COURSE,
    ActivityType.ADVANCED_OPEN_WATER_COURSE,
    ActivityType.RESCUE_DIVER_COURSE,
    ActivityType.EMERGENCY_FIRST_RESPONSE,
    ActivityType.SPECIALTY_COURSE,
  ];

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
                activityType: {
                  in: courseActivityTypes,
                },
              },
              {
                bookingRequest: {
                  activities: {
                    some: {
                      activityType: {
                        in: courseActivityTypes,
                      },
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
    scheduleType: 'courses',
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
                activityType: {
                  in: [
                    ActivityType.DISCOVER_SCUBA_DIVING,
                    ActivityType.OPEN_WATER_COURSE,
                    ActivityType.ADVANCED_OPEN_WATER_COURSE,
                    ActivityType.RESCUE_DIVER_COURSE,
                    ActivityType.EMERGENCY_FIRST_RESPONSE,
                    ActivityType.SPECIALTY_COURSE,
                  ],
                },
              },
              {
                bookingRequest: {
                  activities: {
                    some: {
                      activityType: {
                        in: [
                          ActivityType.DISCOVER_SCUBA_DIVING,
                          ActivityType.OPEN_WATER_COURSE,
                          ActivityType.ADVANCED_OPEN_WATER_COURSE,
                          ActivityType.RESCUE_DIVER_COURSE,
                          ActivityType.EMERGENCY_FIRST_RESPONSE,
                          ActivityType.SPECIALTY_COURSE,
                        ],
                      },
                    },
                  },
                },
              },
            ],
          },
          {
            OR: [
              {
                activityType: {
                  in: [ActivityType.SNORKELING],
                },
              },
              {
                bookingRequest: {
                  activities: {
                    some: {
                      activityType: {
                        in: [ActivityType.SNORKELING],
                      },
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
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-14T08:00:00.000Z'));
  mocks.findMany.mockResolvedValue([]);

  await getMyScheduleAssignments(instructorUser);

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        date: {
          gte: new Date('2026-07-14T00:00:00.000Z'),
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

test('keeps cancelled bookings out of personal assignment queries', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-14T08:00:00.000Z'));
  mocks.findMany.mockResolvedValue([]);

  await getMyScheduleAssignments(instructorUser);

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        assignments: {
          some: {
            userId: instructorUser.id,
          },
        },
      }),
    }),
  );
  expect(mocks.findMany.mock.calls[0]?.[0]?.where.bookingRequest.status).not.toBe(
    BookingStatus.CANCELLED,
  );
});

test('queries divemaster assignments with the current user assignment filter', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-14T08:00:00.000Z'));
  mocks.findMany.mockResolvedValue([]);

  await getMyScheduleAssignments(divemasterUser);

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        date: {
          gte: new Date('2026-07-14T00:00:00.000Z'),
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
      dayNumber: 1,
      totalDays: 1,
      scheduleNotes: 'Meet at the shop.',
      createdAt: new Date('2026-06-25T00:00:00.000Z'),
      bookingActivity: null,
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
	            participationStatus: BookingParticipantStatus.ACTIVE,
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
              participationStatus: BookingParticipantStatus.ACTIVE,
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
          {
            role: BookingCustomerRole.PARTICIPANT,
            participationStatus: BookingParticipantStatus.NO_SHOW,
            hotelAtBooking: 'Inactive Hotel',
            createdAt: new Date('2026-06-24T00:02:00.000Z'),
            customer: {
              fullName: 'Inactive Diver',
              chineseName: null,
              firstName: null,
              lastName: null,
              hotel: 'Inactive Profile Hotel',
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
      dayNumber: 1,
      totalDays: 1,
      dayLabel: null,
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
	      numberOfPeople: 2,
      hotel: 'Primary Booking Hotel',
      scheduleNotes: 'Meet at the shop.',
      assignmentRole: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
    },
  ]);
});

test('maps assigned multi-day schedule items with course day labels', async () => {
  const scheduleDate = new Date('2026-07-16T00:00:00.000Z');

  mocks.findMany.mockResolvedValue([
    scheduleCalendarQueryItem({
      id: 'schedule-day-3',
      date: scheduleDate,
      activityType: ActivityType.OPEN_WATER_COURSE,
      dayNumber: 3,
      totalDays: 3,
      bookingActivity: {
        id: 'activity-1',
        activityType: ActivityType.OPEN_WATER_COURSE,
        specialtyCourse: null,
        requestedDate: new Date('2026-07-14T00:00:00.000Z'),
        requestedTime: '08:00',
        notes: null,
      },
      assignments: [
        {
          id: 'assignment-current',
          userId: instructorUser.id,
          role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
          notes: null,
          user: {
            id: instructorUser.id,
            name: 'Inez Instructor',
            email: 'inez@example.test',
            role: UserRole.INSTRUCTOR,
          },
        },
      ],
      bookingRequest: {
        numberOfPeople: 9,
        activities: [
          {
            id: 'activity-1',
            activityType: ActivityType.OPEN_WATER_COURSE,
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
            participationStatus: BookingParticipantStatus.ACTIVE,
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
          {
            role: BookingCustomerRole.PARTICIPANT,
            participationStatus: BookingParticipantStatus.CANCELLED,
            hotelAtBooking: null,
            createdAt: new Date('2026-06-24T00:01:00.000Z'),
            customer: {
              fullName: 'Cancelled Diver',
              chineseName: null,
              firstName: null,
              lastName: null,
              hotel: null,
            },
          },
        ],
      },
    }),
  ]);

  await expect(getMyScheduleAssignments(instructorUser)).resolves.toEqual([
    expect.objectContaining({
      scheduleItemId: 'schedule-day-3',
      activitySummary: 'Open Water',
      dayNumber: 3,
      totalDays: 3,
      dayLabel: 'Day 3/3',
      numberOfPeople: 1,
      assignmentRole: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
    }),
  ]);
});

test('queries my assignment briefing with date buckets, upcoming cap, and total count', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-14T08:00:00.000Z'));
  const todayItem = scheduleCalendarQueryItem({
    id: 'today-schedule',
    date: new Date('2026-07-14T00:00:00.000Z'),
    assignments: [
      {
        id: 'assignment-current',
        userId: instructorUser.id,
        role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
        notes: null,
        user: {
          id: instructorUser.id,
          name: 'Inez Instructor',
          email: 'inez@example.test',
          role: UserRole.INSTRUCTOR,
        },
      },
    ],
  });
  const tomorrowItem = scheduleCalendarQueryItem({
    id: 'tomorrow-schedule',
    date: new Date('2026-07-15T00:00:00.000Z'),
    assignments: [
      {
        id: 'assignment-current',
        userId: instructorUser.id,
        role: ScheduleAssignmentRole.ASSISTANT_INSTRUCTOR,
        notes: null,
        user: {
          id: instructorUser.id,
          name: 'Inez Instructor',
          email: 'inez@example.test',
          role: UserRole.INSTRUCTOR,
        },
      },
    ],
  });
  const upcomingItem = scheduleCalendarQueryItem({
    id: 'upcoming-schedule',
    date: new Date('2026-07-16T00:00:00.000Z'),
    assignments: [
      {
        id: 'assignment-current',
        userId: instructorUser.id,
        role: ScheduleAssignmentRole.DIVEMASTER,
        notes: null,
        user: {
          id: instructorUser.id,
          name: 'Inez Instructor',
          email: 'inez@example.test',
          role: UserRole.INSTRUCTOR,
        },
      },
    ],
  });

  mocks.findMany
    .mockResolvedValueOnce([todayItem])
    .mockResolvedValueOnce([tomorrowItem])
    .mockResolvedValueOnce([upcomingItem]);
  mocks.count.mockResolvedValue(8);

  await expect(getMyScheduleAssignmentBriefing(instructorUser)).resolves.toEqual({
    todayAssignments: [expect.objectContaining({ scheduleItemId: 'today-schedule' })],
    tomorrowAssignments: [
      expect.objectContaining({ scheduleItemId: 'tomorrow-schedule' }),
    ],
    upcomingAssignments: [
      expect.objectContaining({ scheduleItemId: 'upcoming-schedule' }),
    ],
    upcomingLimit: 20,
    summary: {
      todayCount: 1,
      tomorrowCount: 1,
      upcomingCount: 8,
      nextAssignment: {
        date: new Date('2026-07-14T00:00:00.000Z'),
        activitySummary: 'Fun Dive',
      },
    },
  });

  expect(mocks.findMany).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      where: expect.objectContaining({
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        date: {
          gte: new Date('2026-07-14T00:00:00.000Z'),
          lt: new Date('2026-07-15T00:00:00.000Z'),
        },
        assignments: {
          some: {
            userId: instructorUser.id,
          },
        },
      }),
    }),
  );
  expect(mocks.findMany).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      where: expect.objectContaining({
        date: {
          gte: new Date('2026-07-15T00:00:00.000Z'),
          lt: new Date('2026-07-16T00:00:00.000Z'),
        },
      }),
    }),
  );
  expect(mocks.findMany).toHaveBeenNthCalledWith(
    3,
    expect.objectContaining({
      take: 20,
      where: expect.objectContaining({
        date: {
          gte: new Date('2026-07-16T00:00:00.000Z'),
        },
      }),
    }),
  );
  expect(mocks.count).toHaveBeenCalledWith({
    where: expect.objectContaining({
      bookingRequest: {
        status: BookingStatus.SCHEDULED,
      },
      date: {
        gte: new Date('2026-07-16T00:00:00.000Z'),
      },
      assignments: {
        some: {
          userId: instructorUser.id,
        },
      },
    }),
  });
});

test('does not query my assignment briefing for unauthorized users', async () => {
  await expect(
    getMyScheduleAssignmentBriefing(customerServiceUser),
  ).resolves.toEqual({
    todayAssignments: [],
    tomorrowAssignments: [],
    upcomingAssignments: [],
    upcomingLimit: 20,
    summary: {
      todayCount: 0,
      tomorrowCount: 0,
      upcomingCount: 0,
      nextAssignment: null,
    },
  });

  expect(mocks.findMany).not.toHaveBeenCalled();
  expect(mocks.count).not.toHaveBeenCalled();
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
      dayNumber: 1,
      totalDays: 1,
      scheduleNotes: 'Bring cash for marine park fees.',
      createdAt: new Date('2026-06-25T00:00:00.000Z'),
      bookingActivity: null,
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
        activities: [],
        customers: [
	          {
	            role: BookingCustomerRole.PARTICIPANT,
	            participationStatus: BookingParticipantStatus.ACTIVE,
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
	            participationStatus: BookingParticipantStatus.ACTIVE,
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
      activityLabel: 'Fun Dive',
      activitySummary: 'Fun Dive',
      dayNumber: 1,
      totalDays: 1,
      dayLabel: null,
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

test('maps schedule page participant count from active booking participants', async () => {
  const scheduleDate = new Date('2026-07-14T00:00:00.000Z');

  mocks.findMany.mockResolvedValue([
    scheduleCalendarQueryItem({
      date: scheduleDate,
      bookingRequest: {
        numberOfPeople: 5,
        customers: [
          {
            role: BookingCustomerRole.PRIMARY_CONTACT,
            participationStatus: BookingParticipantStatus.ACTIVE,
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
          {
            role: BookingCustomerRole.PARTICIPANT,
            participationStatus: BookingParticipantStatus.NO_SHOW,
            hotelAtBooking: null,
            createdAt: new Date('2026-06-24T00:01:00.000Z'),
            customer: {
              fullName: 'No Show Diver',
              chineseName: null,
              firstName: null,
              lastName: null,
              hotel: null,
            },
          },
        ],
      },
    }),
  ]);

  await expect(getScheduledBookingsForSchedulePage(adminUser)).resolves.toEqual([
    expect.objectContaining({
      numberOfPeople: 1,
      primaryCustomerName: 'Maria Santos',
    }),
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
      dayNumber: 1,
      totalDays: 1,
      scheduleNotes: null,
      createdAt: new Date('2026-06-25T00:00:00.000Z'),
      bookingActivity: null,
      assignments: [],
      bookingRequest: {
        id: 'booking-2',
        status: BookingStatus.SCHEDULED,
        createdById: 'customer-service-1',
        numberOfPeople: 1,
        source: BookingSource.EMAIL,
        referrerName: null,
        internalNotes: 'Use the pool first.',
        activities: [],
        customers: [
	          {
	            role: BookingCustomerRole.PRIMARY_CONTACT,
	            participationStatus: BookingParticipantStatus.ACTIVE,
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
        dayNumber: 1,
        totalDays: 1,
        scheduleNotes: 'Bring cash for marine park fees.',
        createdAt: new Date('2026-06-25T00:00:00.000Z'),
        bookingActivity: null,
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
	              participationStatus: BookingParticipantStatus.ACTIVE,
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
            {
              role: BookingCustomerRole.PARTICIPANT,
              participationStatus: BookingParticipantStatus.CANCELLED,
              hotelAtBooking: 'Inactive Booking Hotel',
              createdAt: new Date('2026-06-24T00:02:00.000Z'),
              customer: {
                fullName: 'Inactive Diver',
                chineseName: null,
                firstName: null,
                lastName: null,
                hotel: 'Inactive Hotel',
              },
            },
          ],
        },
      },
    ]),
  ).toEqual([
    {
      id: 'schedule-1',
	      title: '[Dina] Fun Dive x1 Anchie',
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
      dayNumber: 1,
      totalDays: 1,
      dayLabel: null,
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
	      numberOfPeople: 1,
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
        dayNumber: 1,
        totalDays: 1,
        scheduleNotes: null,
        createdAt: new Date('2026-06-25T00:00:00.000Z'),
        bookingActivity: null,
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
	              participationStatus: BookingParticipantStatus.ACTIVE,
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
      dayNumber: 1,
      totalDays: 1,
      dayLabel: null,
      isTimeTbd: true,
    }),
  ]);
});

test('maps linked activity and course day labels into calendar titles', () => {
  const [event] = mapScheduleItemsToCalendarEvents([
    scheduleCalendarQueryItem({
      activityType: ActivityType.OPEN_WATER_COURSE,
      dayNumber: 2,
      totalDays: 3,
      bookingActivity: {
        id: 'activity-2',
        activityType: ActivityType.SPECIALTY_COURSE,
        specialtyCourse: 'Nitrox',
        requestedDate: new Date('2026-07-15T00:00:00.000Z'),
        requestedTime: '08:00',
        notes: null,
      },
      bookingRequest: {
        activities: [
          {
            id: 'activity-1',
            activityType: ActivityType.OPEN_WATER_COURSE,
            specialtyCourse: null,
            requestedDate: new Date('2026-07-14T00:00:00.000Z'),
            requestedTime: '08:00',
            notes: null,
            sortOrder: 0,
          },
          {
            id: 'activity-2',
            activityType: ActivityType.SPECIALTY_COURSE,
            specialtyCourse: 'Nitrox',
            requestedDate: new Date('2026-07-15T00:00:00.000Z'),
            requestedTime: '08:00',
            notes: null,
            sortOrder: 1,
          },
        ],
      },
    }),
  ]);

  expect(event?.activitySummary).toBe('Nitrox');
  expect(event?.dayLabel).toBe('Day 2/3');
  expect(event?.title).toBe('[Unassigned] Nitrox x1 Maria Santos (Day 2/3)');
  expect(event?.title).not.toContain('Specialty Course');
});

test('maps multi-day schedule rows into day-specific calendar titles', () => {
  const events = mapScheduleItemsToCalendarEvents(
    [1, 2, 3].map((dayNumber) =>
      scheduleCalendarQueryItem({
        id: `schedule-day-${dayNumber}`,
        date: new Date(`2026-07-${13 + dayNumber}T00:00:00.000Z`),
        activityType: ActivityType.OPEN_WATER_COURSE,
        dayNumber,
        totalDays: 3,
        bookingActivity: {
          id: 'activity-1',
          activityType: ActivityType.OPEN_WATER_COURSE,
          specialtyCourse: null,
          requestedDate: new Date('2026-07-14T00:00:00.000Z'),
          requestedTime: '08:00',
          notes: null,
        },
        bookingRequest: {
          numberOfPeople: 4,
          activities: [
            {
              id: 'activity-1',
              activityType: ActivityType.OPEN_WATER_COURSE,
              specialtyCourse: null,
              requestedDate: new Date('2026-07-14T00:00:00.000Z'),
              requestedTime: '08:00',
              notes: null,
              sortOrder: 0,
            },
          ],
        },
      }),
    ),
  );

  expect(
    events.map(({ dayLabel, dayNumber, totalDays, activitySummary, title }) => ({
      activitySummary,
      dayLabel,
      dayNumber,
      title,
      totalDays,
    })),
  ).toEqual([
    {
      activitySummary: 'Open Water',
      dayLabel: 'Day 1/3',
      dayNumber: 1,
      title: '[Unassigned] Open Water x1 Maria Santos (Day 1/3)',
      totalDays: 3,
    },
    {
      activitySummary: 'Open Water',
      dayLabel: 'Day 2/3',
      dayNumber: 2,
      title: '[Unassigned] Open Water x1 Maria Santos (Day 2/3)',
      totalDays: 3,
    },
    {
      activitySummary: 'Open Water',
      dayLabel: 'Day 3/3',
      dayNumber: 3,
      title: '[Unassigned] Open Water x1 Maria Santos (Day 3/3)',
      totalDays: 3,
    },
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
            participationStatus: BookingParticipantStatus.ACTIVE,
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
          {
            role: BookingCustomerRole.PARTICIPANT,
            participationStatus: BookingParticipantStatus.DROPPED_OUT,
            hotelAtBooking: null,
            createdAt: new Date('2026-06-24T00:01:00.000Z'),
            customer: {
              fullName: 'Dropped Diver',
              chineseName: null,
              firstName: null,
              lastName: null,
              hotel: null,
            },
          },
        ],
        numberOfPeople: 7,
      },
    }),
  ]);

  expect(event?.title).toBe('[Mark/Erik] Rescue Diver Course x1 John Doe');
  expect(event?.title).not.toContain('x7');
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

  expect(event?.title).toBe('[Lead Instructor] Fun Dive x0 Customer TBD');
  expect(event?.title).not.toContain('instructor@example.test');
});
