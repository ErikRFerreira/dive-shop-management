import { beforeEach, describe, expect, test, vi } from 'vitest';

import { BookingStatus, UserRole } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  bookingRequestCount: vi.fn(),
  scheduleItemCount: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  db: {
    bookingRequest: {
      count: mocks.bookingRequestCount,
    },
    scheduleItem: {
      count: mocks.scheduleItemCount,
    },
  },
}));

import {
  getAdminDashboardSummary,
  getCustomerServiceDashboardSummary,
  getDashboardSummaryForCurrentUser,
  getInstructorDashboardSummary,
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

beforeEach(() => {
  mocks.bookingRequestCount.mockReset();
  mocks.scheduleItemCount.mockReset();
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
    const tomorrowRange = mocks.scheduleItemCount.mock.calls[1]?.[0]?.where.date;

    expect(todayRange.gte).toEqual(new Date(2026, 6, 14));
    expect(todayRange.lt).toEqual(new Date(2026, 6, 15));
    expect(tomorrowRange.gte).toEqual(new Date(2026, 6, 15));
    expect(tomorrowRange.lt).toEqual(new Date(2026, 6, 16));
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

    await expect(getInstructorDashboardSummary(instructorUser)).resolves.toEqual({
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

test('does not query admin or customer-service summaries for unsupported roles', async () => {
  await expect(getAdminDashboardSummary(instructorUser)).resolves.toEqual({
    kind: 'empty',
  });
  await expect(
    getCustomerServiceDashboardSummary(instructorUser),
  ).resolves.toEqual({
    kind: 'empty',
  });
  await expect(getDashboardSummaryForCurrentUser(divemasterUser)).resolves.toEqual(
    {
      kind: 'empty',
    },
  );

  expect(mocks.bookingRequestCount).not.toHaveBeenCalled();
  expect(mocks.scheduleItemCount).not.toHaveBeenCalled();
});
