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
      orderBy: {
        createdAt: 'desc',
      },
      skip: 10,
      take: 10,
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
