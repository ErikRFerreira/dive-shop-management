import { beforeEach, expect, test, vi } from 'vitest';

import { BookingStatus, UserRole } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  bookingRequestFindMany: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  db: {
    bookingRequest: {
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
  mocks.bookingRequestFindMany.mockReset();
});

/**
 * Verifies that the unassigned operational queue uses schedule assignments,
 * not a BookingStatus value.
 */
test('queries scheduled bookings with schedule items that have no assignments', async () => {
  mocks.bookingRequestFindMany.mockResolvedValue([]);

  await expect(
    getBookingRequests(adminUser, undefined, 'unassigned'),
  ).resolves.toEqual([]);

  expect(mocks.bookingRequestFindMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        status: BookingStatus.SCHEDULED,
        scheduleItem: {
          is: {
            assignments: {
              none: {},
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
  );
});
