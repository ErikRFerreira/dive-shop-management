import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  ActivityType,
  BookingCustomerRole,
  BookingParticipantStatus,
  BookingStatus,
  ScheduleAssignmentRole,
  ScheduleTimeSlot,
  UserRole,
} from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  bookingRequestCount: vi.fn(),
  bookingRequestFindMany: vi.fn(),
  scheduleItemCount: vi.fn(),
  scheduleItemFindMany: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  db: {
    bookingRequest: {
      count: mocks.bookingRequestCount,
      findMany: mocks.bookingRequestFindMany,
    },
    scheduleItem: {
      count: mocks.scheduleItemCount,
      findMany: mocks.scheduleItemFindMany,
    },
  },
}));

import {
  getAdminDashboardSummary,
  getCustomerServiceDashboardSummary,
  getDashboardOverviewForCurrentUser,
  getDashboardSummaryForCurrentUser,
  getInstructorDashboardSummary,
  getNeedsAttentionItems,
  getRecentDashboardActivity,
  getTodaysScheduleItems,
} from '@/features/dashboard/queries';

const adminUser = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@example.test',
  role: UserRole.ADMIN,
};

const managerUser = {
  ...adminUser,
  id: 'manager-1',
  role: UserRole.MANAGER,
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

const baseDate = new Date('2026-07-14T00:00:00.000Z');
const updatedAt = new Date('2026-07-14T08:30:00.000Z');

beforeEach(() => {
  mocks.bookingRequestCount.mockReset();
  mocks.bookingRequestFindMany.mockReset();
  mocks.scheduleItemCount.mockReset();
  mocks.scheduleItemFindMany.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-14T10:30:00.000Z'));
});

describe('admin dashboard summary', () => {
  test('queries global counts for admin users', async () => {
    mocks.bookingRequestCount.mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    mocks.scheduleItemCount
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(6);

    await expect(getAdminDashboardSummary(adminUser)).resolves.toEqual({
      kind: 'admin',
      pendingApprovalCount: 2,
      needsMoreInfoCount: 3,
      todayScheduleCount: 4,
      tomorrowScheduleCount: 5,
      unassignedActivitiesCount: 6,
    });

    expect(mocks.bookingRequestCount).toHaveBeenNthCalledWith(1, {
      where: {
        status: BookingStatus.PENDING_APPROVAL,
      },
    });
    expect(mocks.bookingRequestCount).toHaveBeenNthCalledWith(2, {
      where: {
        status: BookingStatus.NEEDS_MORE_INFO,
      },
    });
    expect(mocks.scheduleItemCount).toHaveBeenNthCalledWith(1, {
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        date: {
          gte: expect.any(Date),
          lt: expect.any(Date),
        },
      },
    });
    expect(mocks.scheduleItemCount).toHaveBeenNthCalledWith(2, {
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        date: {
          gte: expect.any(Date),
          lt: expect.any(Date),
        },
      },
    });
    expect(mocks.scheduleItemCount).toHaveBeenNthCalledWith(3, {
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        assignments: {
          none: {},
        },
      },
    });
  });

  test('uses today and tomorrow date range predicates for manager users', async () => {
    mocks.bookingRequestCount.mockResolvedValue(0);
    mocks.scheduleItemCount.mockResolvedValue(0);

    await getAdminDashboardSummary(managerUser);

    const todayRange = mocks.scheduleItemCount.mock.calls[0]?.[0]?.where.date;
    const tomorrowRange =
      mocks.scheduleItemCount.mock.calls[1]?.[0]?.where.date;

    expect(todayRange.gte).toEqual(new Date('2026-07-14T00:00:00.000Z'));
    expect(todayRange.lt).toEqual(new Date('2026-07-15T00:00:00.000Z'));
    expect(tomorrowRange.gte).toEqual(new Date('2026-07-15T00:00:00.000Z'));
    expect(tomorrowRange.lt).toEqual(new Date('2026-07-16T00:00:00.000Z'));
  });

  test('uses the shop timezone for dashboard date range predicates', async () => {
    vi.setSystemTime(new Date('2026-07-02T18:30:00.000Z'));
    mocks.bookingRequestCount.mockResolvedValue(0);
    mocks.scheduleItemCount.mockResolvedValue(0);

    await getAdminDashboardSummary(managerUser);

    const todayRange = mocks.scheduleItemCount.mock.calls[0]?.[0]?.where.date;
    const tomorrowRange =
      mocks.scheduleItemCount.mock.calls[1]?.[0]?.where.date;

    expect(todayRange.gte).toEqual(new Date('2026-07-03T00:00:00.000Z'));
    expect(todayRange.lt).toEqual(new Date('2026-07-04T00:00:00.000Z'));
    expect(tomorrowRange.gte).toEqual(new Date('2026-07-04T00:00:00.000Z'));
    expect(tomorrowRange.lt).toEqual(new Date('2026-07-05T00:00:00.000Z'));
  });
});

describe('customer service dashboard summary', () => {
  test('queries only bookings owned by the current customer service user', async () => {
    mocks.bookingRequestCount
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4);

    await expect(
      getCustomerServiceDashboardSummary(customerServiceUser),
    ).resolves.toEqual({
      kind: 'customer-service',
      myDraftsCount: 1,
      myPendingApprovalCount: 2,
      myNeedsMoreInfoCount: 3,
      myApprovedScheduledBookingsCount: 4,
    });

    expect(mocks.bookingRequestCount).toHaveBeenNthCalledWith(1, {
      where: {
        createdById: customerServiceUser.id,
        status: BookingStatus.DRAFT,
      },
    });
    expect(mocks.bookingRequestCount).toHaveBeenNthCalledWith(2, {
      where: {
        createdById: customerServiceUser.id,
        status: BookingStatus.PENDING_APPROVAL,
      },
    });
    expect(mocks.bookingRequestCount).toHaveBeenNthCalledWith(3, {
      where: {
        createdById: customerServiceUser.id,
        status: BookingStatus.NEEDS_MORE_INFO,
      },
    });
    expect(mocks.bookingRequestCount).toHaveBeenNthCalledWith(4, {
      where: {
        createdById: customerServiceUser.id,
        status: {
          in: [BookingStatus.APPROVED, BookingStatus.SCHEDULED],
        },
      },
    });
  });
});

describe('instructor dashboard summary', () => {
  test('queries only scheduled items assigned to the current instructor', async () => {
    mocks.scheduleItemCount
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);

    await expect(
      getInstructorDashboardSummary(instructorUser),
    ).resolves.toEqual({
      kind: 'instructor',
      todayAssignmentsCount: 1,
      tomorrowAssignmentsCount: 2,
      myAssignmentsCount: 3,
    });

    expect(mocks.scheduleItemCount).toHaveBeenNthCalledWith(1, {
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        assignments: {
          some: {
            userId: instructorUser.id,
          },
        },
        date: {
          gte: expect.any(Date),
          lt: expect.any(Date),
        },
      },
    });
    expect(mocks.scheduleItemCount).toHaveBeenNthCalledWith(2, {
      where: {
        bookingRequest: {
          status: BookingStatus.SCHEDULED,
        },
        assignments: {
          some: {
            userId: instructorUser.id,
          },
        },
        date: {
          gte: expect.any(Date),
          lt: expect.any(Date),
        },
      },
    });
    expect(mocks.scheduleItemCount).toHaveBeenNthCalledWith(3, {
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
    });
  });
});

describe('dashboard needs attention', () => {
  test('queries global booking queues and unassigned scheduled items for operations users', async () => {
    mocks.bookingRequestFindMany.mockResolvedValueOnce([
      bookingRecord({ status: BookingStatus.PENDING_APPROVAL }),
    ]);
    mocks.scheduleItemFindMany.mockResolvedValueOnce([
      scheduleRecord({ assignments: [] }),
    ]);

    await expect(getNeedsAttentionItems(adminUser)).resolves.toEqual([
      expect.objectContaining({
        kind: 'booking',
        label: 'Booking pending approval',
        bookingId: 'booking-1',
      }),
      expect.objectContaining({
        kind: 'schedule',
        label: 'Scheduled activity needs staff assignment',
        scheduleItemId: 'schedule-1',
      }),
    ]);

    expect(mocks.bookingRequestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: {
            in: [BookingStatus.PENDING_APPROVAL, BookingStatus.NEEDS_MORE_INFO],
          },
        },
        take: expect.any(Number),
      }),
    );
    expect(mocks.scheduleItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          bookingRequest: {
            status: BookingStatus.SCHEDULED,
          },
          date: {
            gte: expect.any(Date),
          },
          assignments: {
            none: {},
          },
        },
        take: expect.any(Number),
      }),
    );
  });

  test('queries only owned draft, pending, and needs-more-info bookings for customer service', async () => {
    mocks.bookingRequestFindMany.mockResolvedValueOnce([
      bookingRecord({ status: BookingStatus.NEEDS_MORE_INFO }),
    ]);

    await getNeedsAttentionItems(customerServiceUser);

    expect(mocks.bookingRequestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdById: customerServiceUser.id,
          status: {
            in: [
              BookingStatus.NEEDS_MORE_INFO,
              BookingStatus.DRAFT,
              BookingStatus.PENDING_APPROVAL,
            ],
          },
        },
      }),
    );
    expect(mocks.scheduleItemFindMany).not.toHaveBeenCalled();
  });

  test('normalizes dashboard needs-more-info detail copy for display', async () => {
    mocks.bookingRequestFindMany.mockResolvedValueOnce([
      bookingRecord({
        status: BookingStatus.NEEDS_MORE_INFO,
        needsMoreInfoReason: '  Needs more information!!!! Marks house  ',
      }),
    ]);
    mocks.scheduleItemFindMany.mockResolvedValueOnce([]);

    await expect(getNeedsAttentionItems(adminUser)).resolves.toEqual([
      expect.objectContaining({
        label: 'Booking needs more information',
        detail: "Needs more information. Mark's house",
      }),
    ]);
  });

  test('returns no needs-attention items for instructors', async () => {
    await expect(getNeedsAttentionItems(instructorUser)).resolves.toEqual([]);

    expect(mocks.bookingRequestFindMany).not.toHaveBeenCalled();
    expect(mocks.scheduleItemFindMany).not.toHaveBeenCalled();
  });
});

describe("today's dashboard schedule", () => {
  test('queries global official scheduled items for operations users', async () => {
    mocks.scheduleItemFindMany.mockResolvedValueOnce([
      scheduleRecord({ assignments: [] }),
    ]);

    await expect(getTodaysScheduleItems(managerUser)).resolves.toEqual([
      expect.objectContaining({
        scheduleItemId: 'schedule-1',
        bookingId: 'booking-1',
        activityLabel: 'Open Water',
        activitySummary: 'Open Water',
        primaryCustomerName: 'Ada Lovelace',
        hotel: 'Sea View',
        timeSlot: ScheduleTimeSlot.TBD,
        startTime: null,
        isTimeTbd: true,
        isUnassigned: true,
      }),
    ]);

    expect(mocks.scheduleItemFindMany).toHaveBeenCalledWith(
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

  test('derives today schedule headcount and participants from active rows', async () => {
    const activePrimaryCustomer =
      scheduleRecordBase().bookingRequest.customers[0];
    const activeParticipant = {
      ...activePrimaryCustomer,
      role: BookingCustomerRole.PARTICIPANT,
      hotelAtBooking: null,
      createdAt: new Date('2026-07-01T08:01:00.000Z'),
      customer: {
        ...activePrimaryCustomer.customer,
        fullName: 'Kai Chen',
        hotel: 'Kai Hotel',
      },
    };
    const droppedOutParticipant = {
      ...activePrimaryCustomer,
      role: BookingCustomerRole.PARTICIPANT,
      participationStatus: BookingParticipantStatus.DROPPED_OUT,
      hotelAtBooking: 'Dropped Out Hotel',
      createdAt: new Date('2026-07-01T08:02:00.000Z'),
      customer: {
        ...activePrimaryCustomer.customer,
        fullName: 'Dropped Diver',
        hotel: 'Dropped Customer Hotel',
      },
    };
    const cancelledParticipant = {
      ...activePrimaryCustomer,
      role: BookingCustomerRole.PARTICIPANT,
      participationStatus: BookingParticipantStatus.CANCELLED,
      hotelAtBooking: 'Cancelled Hotel',
      createdAt: new Date('2026-07-01T08:03:00.000Z'),
      customer: {
        ...activePrimaryCustomer.customer,
        fullName: 'Cancelled Diver',
        hotel: 'Cancelled Customer Hotel',
      },
    };
    const noShowParticipant = {
      ...activePrimaryCustomer,
      role: BookingCustomerRole.PARTICIPANT,
      participationStatus: BookingParticipantStatus.NO_SHOW,
      hotelAtBooking: 'No Show Hotel',
      createdAt: new Date('2026-07-01T08:04:00.000Z'),
      customer: {
        ...activePrimaryCustomer.customer,
        fullName: 'No Show Diver',
        hotel: 'No Show Customer Hotel',
      },
    };

    mocks.scheduleItemFindMany.mockResolvedValueOnce([
      scheduleRecord({
        bookingRequest: {
          ...scheduleRecordBase().bookingRequest,
          numberOfPeople: 9,
          customers: [
            activePrimaryCustomer,
            activeParticipant,
            droppedOutParticipant,
            cancelledParticipant,
            noShowParticipant,
          ],
        },
      }),
    ]);

    const [item] = await getTodaysScheduleItems(managerUser);

    expect(item).toMatchObject({
      numberOfPeople: 2,
      hotel: 'Sea View',
      customers: [
        expect.objectContaining({ name: 'Ada Lovelace' }),
        expect.objectContaining({ name: 'Kai Chen' }),
      ],
    });
    expect(item?.customers).toHaveLength(2);
    expect(item?.customers.map((customer) => customer.name)).not.toContain(
      'Dropped Diver',
    );
    expect(item?.customers.map((customer) => customer.name)).not.toContain(
      'Cancelled Diver',
    );
    expect(item?.customers.map((customer) => customer.name)).not.toContain(
      'No Show Diver',
    );
    expect(item?.hotel).not.toBe('Dropped Out Hotel');
    expect(item?.hotel).not.toBe('Cancelled Hotel');
    expect(item?.hotel).not.toBe('No Show Hotel');
  });

  test('uses the shop timezone for today schedule rows', async () => {
    vi.setSystemTime(new Date('2026-07-02T18:30:00.000Z'));
    mocks.scheduleItemFindMany.mockResolvedValueOnce([]);

    await getTodaysScheduleItems(managerUser);

    const todayRange =
      mocks.scheduleItemFindMany.mock.calls[0]?.[0]?.where.date;

    expect(todayRange.gte).toEqual(new Date('2026-07-03T00:00:00.000Z'));
    expect(todayRange.lt).toEqual(new Date('2026-07-04T00:00:00.000Z'));
  });

  test('scopes customer service schedule rows to owned scheduled bookings', async () => {
    mocks.scheduleItemFindMany.mockResolvedValueOnce([]);

    await getTodaysScheduleItems(customerServiceUser);

    expect(mocks.scheduleItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          bookingRequest: {
            status: BookingStatus.SCHEDULED,
            createdById: customerServiceUser.id,
          },
          date: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
        },
      }),
    );
  });

  test('scopes instructor schedule rows to current-user assignments', async () => {
    mocks.scheduleItemFindMany.mockResolvedValueOnce([
      scheduleRecord({ assignments: [assignmentRecord()] }),
    ]);

    await getTodaysScheduleItems(instructorUser);

    expect(mocks.scheduleItemFindMany).toHaveBeenCalledWith(
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
          date: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
        },
      }),
    );
  });
});

describe('recent dashboard activity', () => {
  test('uses recently updated bookings globally for operations users', async () => {
    mocks.bookingRequestFindMany.mockResolvedValueOnce([
      bookingRecord({ status: BookingStatus.SCHEDULED }),
    ]);

    await expect(getRecentDashboardActivity(adminUser)).resolves.toEqual([
      expect.objectContaining({
        bookingId: 'booking-1',
        label: 'Booking approved and scheduled',
        occurredAt: updatedAt,
      }),
    ]);

    expect(mocks.bookingRequestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: [{ updatedAt: 'desc' }],
        take: 3,
      }),
    );
  });

  test('scopes customer service activity to owned bookings', async () => {
    mocks.bookingRequestFindMany.mockResolvedValueOnce([]);

    await getRecentDashboardActivity(customerServiceUser);

    expect(mocks.bookingRequestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdById: customerServiceUser.id,
        },
      }),
    );
  });

  test('scopes instructor activity to assigned scheduled bookings', async () => {
    mocks.bookingRequestFindMany.mockResolvedValueOnce([]);

    await getRecentDashboardActivity(instructorUser);

    expect(mocks.bookingRequestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: BookingStatus.SCHEDULED,
          scheduleItems: {
            some: {
              assignments: {
                some: {
                  userId: instructorUser.id,
                },
              },
            },
          },
        },
      }),
    );
  });
});

test('overview query returns summary plus operational sections', async () => {
  mocks.bookingRequestCount.mockResolvedValueOnce(2).mockResolvedValueOnce(3);
  mocks.scheduleItemCount
    .mockResolvedValueOnce(4)
    .mockResolvedValueOnce(5)
    .mockResolvedValueOnce(6);
  mocks.bookingRequestFindMany
    .mockResolvedValueOnce([
      bookingRecord({ status: BookingStatus.PENDING_APPROVAL }),
    ])
    .mockResolvedValueOnce([
      bookingRecord({ id: 'recent-booking', status: BookingStatus.SCHEDULED }),
    ]);
  mocks.scheduleItemFindMany
    .mockResolvedValueOnce([scheduleRecord({ id: 'unassigned-schedule' })])
    .mockResolvedValueOnce([scheduleRecord({ id: 'today-schedule' })]);

  await expect(getDashboardOverviewForCurrentUser(adminUser)).resolves.toEqual({
    summary: {
      kind: 'admin',
      pendingApprovalCount: 2,
      needsMoreInfoCount: 3,
      todayScheduleCount: 4,
      tomorrowScheduleCount: 5,
      unassignedActivitiesCount: 6,
    },
    needsAttention: expect.arrayContaining([
      expect.objectContaining({ kind: 'booking' }),
      expect.objectContaining({ kind: 'schedule' }),
    ]),
    todaysSchedule: [
      expect.objectContaining({ scheduleItemId: 'today-schedule' }),
    ],
    recentActivity: [expect.objectContaining({ bookingId: 'recent-booking' })],
  });
});

test('rejects divemaster dashboard overview queries before Prisma access', async () => {
  await expect(
    getDashboardOverviewForCurrentUser(divemasterUser),
  ).rejects.toMatchObject({ name: 'AuthorizationError' });

  expect(mocks.bookingRequestCount).not.toHaveBeenCalled();
  expect(mocks.bookingRequestFindMany).not.toHaveBeenCalled();
  expect(mocks.scheduleItemCount).not.toHaveBeenCalled();
  expect(mocks.scheduleItemFindMany).not.toHaveBeenCalled();
});

test('does not query protected sections for unsupported roles', async () => {
  await expect(getAdminDashboardSummary(instructorUser)).resolves.toEqual({
    kind: 'empty',
  });
  await expect(
    getCustomerServiceDashboardSummary(instructorUser),
  ).resolves.toEqual({
    kind: 'empty',
  });
  await expect(
    getDashboardSummaryForCurrentUser(divemasterUser),
  ).resolves.toEqual({
    kind: 'empty',
  });
  await expect(getNeedsAttentionItems(divemasterUser)).resolves.toEqual([]);
  await expect(getTodaysScheduleItems(divemasterUser)).resolves.toEqual([]);
  await expect(getRecentDashboardActivity(divemasterUser)).resolves.toEqual([]);

  expect(mocks.bookingRequestCount).not.toHaveBeenCalled();
  expect(mocks.scheduleItemCount).not.toHaveBeenCalled();
  expect(mocks.bookingRequestFindMany).not.toHaveBeenCalled();
  expect(mocks.scheduleItemFindMany).not.toHaveBeenCalled();
});

/**
 * Creates a mocked booking row matching the compact dashboard query selection.
 *
 * @param overrides - Field overrides for test-specific booking states.
 * @returns A booking-like object returned by the mocked Prisma client.
 */
function bookingRecord(
  overrides: Partial<ReturnType<typeof bookingRecordBase>> = {},
) {
  return {
    ...bookingRecordBase(),
    ...overrides,
  };
}

/**
 * Creates the default mocked booking row before test-specific overrides.
 *
 * @returns A booking-like object with compact customer and activity relations.
 */
function bookingRecordBase() {
  return {
    id: 'booking-1',
    status: BookingStatus.PENDING_APPROVAL as BookingStatus,
    activityType: ActivityType.OPEN_WATER_COURSE as ActivityType,
    requestedDate: baseDate,
    requestedTime: '09:00',
    numberOfPeople: 2,
    needsMoreInfoReason: 'Confirm certification.',
    updatedAt,
    activities: [
      {
        activityType: ActivityType.OPEN_WATER_COURSE,
        sortOrder: 0,
      },
    ],
    customers: [
	      {
	        role: BookingCustomerRole.PRIMARY_CONTACT,
	        participationStatus: BookingParticipantStatus.ACTIVE,
	        createdAt: updatedAt,
        customer: {
          fullName: 'Ada Lovelace',
          firstName: null,
          lastName: null,
          chineseName: null,
        },
      },
    ],
  };
}

/**
 * Creates a mocked schedule row matching the compact dashboard query selection.
 *
 * @param overrides - Field overrides for test-specific schedule states.
 * @returns A schedule-like object returned by the mocked Prisma client.
 */
function scheduleRecord(
  overrides: Partial<ReturnType<typeof scheduleRecordBase>> = {},
) {
  return {
    ...scheduleRecordBase(),
    ...overrides,
  };
}

/**
 * Creates the default mocked schedule row before test-specific overrides.
 *
 * @returns A schedule-like object with compact booking, customer, and assignment relations.
 */
function scheduleRecordBase() {
  return {
    id: 'schedule-1',
    bookingRequestId: 'booking-1',
    date: baseDate,
    startTime: '09:00',
    activityType: ActivityType.OPEN_WATER_COURSE,
    updatedAt,
    assignments: [] as ReturnType<typeof assignmentRecord>[],
    bookingRequest: {
      id: 'booking-1',
      status: BookingStatus.SCHEDULED as BookingStatus,
      activityType: ActivityType.OPEN_WATER_COURSE as ActivityType,
      numberOfPeople: 2,
      updatedAt,
      activities: [
        {
          activityType: ActivityType.OPEN_WATER_COURSE,
          sortOrder: 0,
        },
      ],
      customers: [
	        {
	          role: BookingCustomerRole.PRIMARY_CONTACT,
	          participationStatus: BookingParticipantStatus.ACTIVE,
	          hotelAtBooking: 'Sea View',
          createdAt: updatedAt,
          customer: {
            fullName: 'Ada Lovelace',
            firstName: null,
            lastName: null,
            chineseName: null,
            hotel: 'Fallback Hotel',
          },
        },
      ],
    },
  };
}

/**
 * Creates a mocked schedule assignment row.
 *
 * @returns An assignment-like object returned by the mocked Prisma client.
 */
function assignmentRecord() {
  return {
    id: 'assignment-1',
    userId: instructorUser.id,
    role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
    user: {
      id: instructorUser.id,
      name: 'Instructor One',
      email: 'instructor@example.test',
      role: UserRole.INSTRUCTOR,
    },
  };
}
