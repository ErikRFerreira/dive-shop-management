import { beforeEach, expect, test, vi } from 'vitest';

import { BookingStatus, UserRole } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  bookingRequestCount: vi.fn(),
  bookingRequestFindMany: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  db: {
    bookingRequest: {
      count: mocks.bookingRequestCount,
      findMany: mocks.bookingRequestFindMany,
    },
  },
}));

import { getBookingRequests } from '@/features/bookings/queries';

const adminUser = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@example.test',
  role: UserRole.ADMIN,
};

beforeEach(() => {
  mocks.bookingRequestCount.mockReset();
  mocks.bookingRequestFindMany.mockReset();
});

/**
 * Verifies that the unassigned operational queue uses schedule assignments,
 * not a BookingStatus value.
 */
test('queries scheduled bookings with schedule items that have no assignments', async () => {
  mocks.bookingRequestCount.mockResolvedValue(26);
  mocks.bookingRequestFindMany.mockResolvedValue([]);

  await expect(
    getBookingRequests(adminUser, undefined, 'unassigned', {
      page: 2,
      pageSize: 10,
    }),
  ).resolves.toEqual({
    bookings: [],
    pagination: {
      totalCount: 26,
      page: 2,
      pageSize: 10,
      totalPages: 3,
    },
  });

  expect(mocks.bookingRequestCount).toHaveBeenCalledWith({
    where: {
      status: BookingStatus.SCHEDULED,
      scheduleItems: {
        some: {},
        none: {
          assignments: {
            some: {},
          },
        },
      },
    },
  });

  expect(mocks.bookingRequestFindMany).toHaveBeenCalledWith(
    expect.objectContaining({
      include: expect.objectContaining({
        scheduleItems: {
          select: {
            id: true,
            date: true,
            startTime: true,
            timeSlot: true,
            dayNumber: true,
            totalDays: true,
            bookingActivityId: true,
            activityType: true,
            assignments: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: [
            { date: 'asc' },
            { dayNumber: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      }),
      where: {
        status: BookingStatus.SCHEDULED,
        scheduleItems: {
          some: {},
          none: {
            assignments: {
              some: {},
            },
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      skip: 10,
      take: 10,
    }),
  );
});

/** Verifies that newest-created uses createdAt ordering with a stable tie breaker. */
test('sorts booking requests by newest created when requested', async () => {
  mocks.bookingRequestCount.mockResolvedValue(1);
  mocks.bookingRequestFindMany.mockResolvedValue([]);

  await getBookingRequests(
    adminUser,
    undefined,
    undefined,
    {
      page: 1,
      pageSize: 10,
    },
    'newest-created',
  );

  expect(mocks.bookingRequestFindMany).toHaveBeenCalledWith(
    expect.objectContaining({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: 0,
      take: 10,
    }),
  );
});

/** Verifies activity-date sorting across scheduled, requested, and undated bookings. */
test('sorts booking requests by operational activity date', async () => {
  mocks.bookingRequestCount.mockResolvedValue(4);
  mocks.bookingRequestFindMany
    .mockResolvedValueOnce([
      {
        id: 'undated-booking',
        requestedDate: null,
        scheduleItems: [],
        activities: [{ requestedDate: null }],
      },
      {
        id: 'scheduled-booking',
        requestedDate: new Date('2026-07-01T00:00:00.000Z'),
        scheduleItems: [{ date: new Date('2026-07-20T00:00:00.000Z') }],
        activities: [{ requestedDate: new Date('2026-07-10T00:00:00.000Z') }],
      },
      {
        id: 'activity-booking',
        requestedDate: null,
        scheduleItems: [],
        activities: [{ requestedDate: new Date('2026-07-12T00:00:00.000Z') }],
      },
      {
        id: 'legacy-booking',
        requestedDate: new Date('2026-07-13T00:00:00.000Z'),
        scheduleItems: [],
        activities: [{ requestedDate: null }],
      },
    ])
    .mockResolvedValueOnce([
      bookingListRecord('undated-booking'),
      bookingListRecord('scheduled-booking'),
      bookingListRecord('legacy-booking'),
      bookingListRecord('activity-booking'),
    ]);

  await expect(
    getBookingRequests(
      adminUser,
      undefined,
      undefined,
      {
        page: 1,
        pageSize: 10,
      },
      'activity-date',
    ),
  ).resolves.toMatchObject({
    bookings: [
      { id: 'activity-booking' },
      { id: 'legacy-booking' },
      { id: 'scheduled-booking' },
      { id: 'undated-booking' },
    ],
  });

  expect(mocks.bookingRequestFindMany).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      select: {
        id: true,
        requestedDate: true,
        scheduleItems: {
          select: {
            date: true,
          },
          orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        },
        activities: {
          select: {
            requestedDate: true,
          },
        },
      },
      where: {},
    }),
  );
  expect(mocks.bookingRequestFindMany).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      where: {
        AND: [
          {},
          {
            id: {
              in: [
                'activity-booking',
                'legacy-booking',
                'scheduled-booking',
                'undated-booking',
              ],
            },
          },
        ],
      },
    }),
  );
});

/** Verifies that out-of-range booking pages use the last available page. */
test('clamps requested booking pages to the last page', async () => {
  mocks.bookingRequestCount.mockResolvedValue(23);
  mocks.bookingRequestFindMany.mockResolvedValue([]);

  await expect(
    getBookingRequests(adminUser, BookingStatus.DRAFT, undefined, {
      page: 9,
      pageSize: 10,
    }),
  ).resolves.toEqual({
    bookings: [],
    pagination: {
      totalCount: 23,
      page: 3,
      pageSize: 10,
      totalPages: 3,
    },
  });

  expect(mocks.bookingRequestFindMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        status: BookingStatus.DRAFT,
      },
      skip: 20,
      take: 10,
    }),
  );
});

/** Verifies that empty booking lists do not perform an unnecessary row fetch. */
test('returns empty pagination metadata when no bookings match', async () => {
  mocks.bookingRequestCount.mockResolvedValue(0);

  await expect(
    getBookingRequests(adminUser, undefined, undefined, {
      page: 3,
      pageSize: 10,
    }),
  ).resolves.toEqual({
    bookings: [],
    pagination: {
      totalCount: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    },
  });

  expect(mocks.bookingRequestFindMany).not.toHaveBeenCalled();
});

/**
 * Builds the minimum hydrated booking row needed by booking list query tests.
 *
 * @param id - Booking request ID for the mocked hydrated record.
 * @returns Hydrated booking row with empty relation arrays.
 */
function bookingListRecord(id: string) {
  const timestamp = new Date('2026-07-01T00:00:00.000Z');

  return {
    id,
    customers: [],
    scheduleItems: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
