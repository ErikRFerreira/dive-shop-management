import { beforeEach, expect, test, vi } from 'vitest';

import {
  ActivityType,
  BookingCustomerRole,
  BookingParticipantStatus,
  BookingSource,
  BookingStatus,
  ScheduleAssignmentRole,
  ScheduleTimeSlot,
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
  getScheduleStaffFilterOptions,
  getScheduledBookingsForSchedulePage,
  mapScheduleItemsToCalendarEvents,
} from '@/features/schedule/queries';
import { serializeScheduleCalendarEvents } from '@/features/schedule/utils';

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
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }, { createdAt: 'asc' }],
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
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }, { createdAt: 'asc' }],
    }),
  );
  expect(
    mocks.findMany.mock.calls[0]?.[0]?.select.bookingRequest.select.customers
      .select.customer.select.chineseName,
  ).toBe(true);
  expect(mocks.findMany.mock.calls[0]?.[0]?.select.bookingRequest.select).toEqual(
    expect.objectContaining({
      id: true,
      source: true,
      referrerName: true,
      internalNotes: true,
    }),
  );
  expect(
    mocks.findMany.mock.calls[0]?.[0]?.select.assignments.select.user.select,
  ).toEqual(
    expect.objectContaining({
      id: true,
      name: true,
      email: true,
      role: true,
    }),
  );
});

test('keeps customer service schedule visibility global without management staff data', async () => {
  mocks.findMany.mockResolvedValue([]);

  await getScheduleItemsForCalendar(customerServiceUser);

  const query = mocks.findMany.mock.calls[0]?.[0];
  expect(query.where).toEqual({
    bookingRequest: { status: BookingStatus.SCHEDULED },
  });
  expect(query.select.bookingRequest.select).toEqual(
    expect.objectContaining({
      id: true,
      source: true,
      referrerName: true,
      internalNotes: true,
    }),
  );
  expect(query.select.assignments.select.user.select).toEqual({ name: true });
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

  await getAssignableStaff(adminUser);

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

test('selects and serializes only instructor-safe schedule fields', async () => {
  mocks.findMany.mockResolvedValue([
    {
      id: 'schedule-instructor-1',
      date: new Date('2026-07-14T00:00:00.000Z'),
      timeSlot: ScheduleTimeSlot.AM,
      activityType: ActivityType.FUN_DIVE,
      dayNumber: 1,
      totalDays: 1,
      scheduleNotes: 'Meet at the shop.',
      bookingActivity: {
        activityType: ActivityType.FUN_DIVE,
        specialtyCourse: null,
      },
      assignments: [
        {
          role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
          user: { name: 'Inez Instructor' },
        },
      ],
      bookingRequest: {
        activities: [
          {
            activityType: ActivityType.FUN_DIVE,
            specialtyCourse: null,
          },
        ],
        customers: [
          {
            role: BookingCustomerRole.PRIMARY_CONTACT,
            participationStatus: BookingParticipantStatus.ACTIVE,
            hotelAtBooking: 'Ocean View',
            customer: {
              fullName: 'Maria Santos',
              chineseName: null,
              firstName: null,
              lastName: null,
              hotel: null,
            },
          },
        ],
      },
    },
  ]);

  const events = await getScheduleItemsForCalendar(instructorUser);
  const select = mocks.findMany.mock.calls[0]?.[0]?.select;
  const serialized = serializeScheduleCalendarEvents(events);
  const selectedFields = JSON.stringify(select);
  const serializedPayload = JSON.stringify(serialized);

  for (const prohibitedField of [
    'internalNotes',
    'source',
    'referrerName',
    'email',
    'notes',
    'userId',
    'bookingRequestId',
    'requestedDate',
    'requestedTime',
    'requestedTimeSlot',
  ]) {
    expect(selectedFields).not.toContain(`\"${prohibitedField}\"`);
    expect(serializedPayload).not.toContain(`\"${prohibitedField}\"`);
  }

  expect(serialized).toEqual([
    expect.objectContaining({
      id: 'schedule-instructor-1',
      scheduleItemId: 'schedule-instructor-1',
      date: '2026-07-14T00:00:00.000Z',
      scheduleNotes: 'Meet at the shop.',
      assignments: [
        {
          name: 'Inez Instructor',
          role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
        },
      ],
    }),
  ]);
  expect(serialized[0]).not.toHaveProperty('bookingId');
  expect(serialized[0]).not.toHaveProperty('managementAssignments');
  expect(Object.keys(serialized[0] ?? {}).sort()).toEqual(
    [
      'activityLabel',
      'activitySummary',
      'activityType',
      'allDay',
      'assignments',
      'customers',
      'date',
      'dayLabel',
      'dayNumber',
      'end',
      'hotel',
      'id',
      'isTimeTbd',
      'numberOfPeople',
      'primaryCustomerName',
      'scheduleItemId',
      'scheduleNotes',
      'start',
      'timeSlot',
      'title',
      'totalDays',
    ].sort(),
  );
  expect(Object.keys(serialized[0]?.assignments[0] ?? {}).sort()).toEqual([
    'name',
    'role',
  ]);
});

test('enforces management authorization for rich assignable staff data', async () => {
  await expect(getAssignableStaff(customerServiceUser)).rejects.toMatchObject({
    name: 'AuthorizationError',
  });
  await expect(getAssignableStaff(instructorUser)).rejects.toMatchObject({
    name: 'AuthorizationError',
  });

  expect(mocks.findManyUsers).not.toHaveBeenCalled();
});

test('returns minimal schedule staff filters to instructors without email', async () => {
  mocks.findManyUsers.mockResolvedValue([]);

  await getScheduleStaffFilterOptions(instructorUser);

  expect(mocks.findManyUsers).toHaveBeenCalledWith(
    expect.objectContaining({
      select: {
        id: true,
        name: true,
        role: true,
      },
    }),
  );
  expect(mocks.findManyUsers.mock.calls[0]?.[0]?.select).not.toHaveProperty(
    'email',
  );
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
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }, { createdAt: 'asc' }],
    }),
  );
  expect(
    mocks.findMany.mock.calls[0]?.[0]?.select.bookingRequest.select.customers
      .select.customer.select.chineseName,
  ).toBe(true);
  expect(mocks.findMany.mock.calls[0]?.[0]?.select.assignments).toEqual({
    where: { userId: instructorUser.id },
    select: { role: true },
    take: 1,
  });
  const personalSelect = JSON.stringify(mocks.findMany.mock.calls[0]?.[0]?.select);
  for (const unusedField of [
    'bookingRequestId',
    'startTime',
    'endAt',
    'requestedDate',
    'requestedTime',
    'requestedTimeSlot',
    'internalNotes',
    'email',
  ]) {
    expect(personalSelect).not.toContain(`\"${unusedField}\"`);
  }
  expect(mocks.findMany.mock.calls[0]?.[0]?.select).not.toHaveProperty(
    'createdAt',
  );
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

test('rejects divemaster personal assignment queries', async () => {
  await expect(getMyScheduleAssignments(divemasterUser)).rejects.toMatchObject({
    name: 'AuthorizationError',
  });

  expect(mocks.findMany).not.toHaveBeenCalled();
});

test('does not query my assignments for unauthorized customer service users', async () => {
  await expect(
    getMyScheduleAssignments(customerServiceUser),
  ).rejects.toMatchObject({ name: 'AuthorizationError' });

  expect(mocks.findMany).not.toHaveBeenCalled();
});

test('does not query my assignments for admin or manager users', async () => {
  await expect(getMyScheduleAssignments(adminUser)).rejects.toMatchObject({
    name: 'AuthorizationError',
  });
  await expect(
    getMyScheduleAssignments({ ...adminUser, role: UserRole.MANAGER }),
  ).rejects.toMatchObject({ name: 'AuthorizationError' });

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
      date: scheduleDate,
      timeSlot: ScheduleTimeSlot.TBD,
      isTimeTbd: true,
      activityType: ActivityType.FUN_DIVE,
      activityLabel: 'Fun Dive',
      activitySummary: 'Fun Dive + Snorkeling',
      dayNumber: 1,
      totalDays: 1,
      dayLabel: null,
      activities: [
        {
          activityType: ActivityType.FUN_DIVE,
          activityLabel: 'Fun Dive',
          specialtyCourse: null,
        },
        {
          activityType: ActivityType.SNORKELING,
          activityLabel: 'Snorkeling',
          specialtyCourse: null,
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
  ).rejects.toMatchObject({ name: 'AuthorizationError' });

  expect(mocks.findMany).not.toHaveBeenCalled();
  expect(mocks.count).not.toHaveBeenCalled();
});

test('gives customer service the global scheduled booking scope', () => {
  expect(buildSchedulePageWhere(customerServiceUser)).toEqual({
    bookingRequest: {
      status: BookingStatus.SCHEDULED,
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
      timeSlot: ScheduleTimeSlot.TBD,
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
      start: '2026-07-14',
      end: null,
      allDay: true,
      bookingId: 'booking-1',
      scheduleItemId: 'schedule-1',
      date: scheduleDate,
      timeSlot: ScheduleTimeSlot.TBD,
      activityType: ActivityType.FUN_DIVE,
      activityLabel: 'Fun Dive',
      activitySummary: 'Fun Dive',
      dayNumber: 1,
      totalDays: 1,
      dayLabel: null,
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
      scheduleNotes: 'Bring cash for marine park fees.',
      assignments: [
        {
          name: 'Dina Divemaster',
          role: ScheduleAssignmentRole.DIVEMASTER,
        },
      ],
      managementAssignments: [
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
      isTimeTbd: true,
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
