/**
 * Purpose: Server-only booking data readers used by the dashboard query layer.
 *
 * @module features/bookings/dashboard-queries
 */

import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import { BookingStatus } from '@/generated/prisma/enums';
import { db } from '@/lib/db';

const dashboardNeedsAttentionBookingArgs = {
  select: {
    id: true,
    status: true,
    activityType: true,
    requestedDate: true,
    requestedTime: true,
    requestedTimeSlot: true,
    needsMoreInfoReason: true,
    updatedAt: true,
    activities: {
      select: {
        activityType: true,
        specialtyCourse: true,
        sortOrder: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    },
	    customers: {
	      select: {
	        role: true,
	        participationStatus: true,
	        createdAt: true,
	        customer: {
          select: {
            fullName: true,
            firstName: true,
            lastName: true,
            chineseName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
  },
} satisfies Prisma.BookingRequestDefaultArgs;

const dashboardRecentActivityBookingArgs = {
  select: {
    id: true,
    status: true,
    activityType: true,
    updatedAt: true,
    activities: {
      select: {
        activityType: true,
        specialtyCourse: true,
        sortOrder: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    },
	    customers: {
	      select: {
	        role: true,
	        participationStatus: true,
	        createdAt: true,
	        customer: {
          select: {
            fullName: true,
            firstName: true,
            lastName: true,
            chineseName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
  },
} satisfies Prisma.BookingRequestDefaultArgs;

export type DashboardNeedsAttentionBookingRecord = Prisma.BookingRequestGetPayload<
  typeof dashboardNeedsAttentionBookingArgs
>;

export type DashboardRecentActivityBookingRecord =
  Prisma.BookingRequestGetPayload<typeof dashboardRecentActivityBookingArgs>;

/**
 * Counts booking requests waiting for admin or manager approval.
 *
 * @returns The number of globally pending approval bookings.
 */
export async function getPendingApprovalBookingCount() {
  return db.bookingRequest.count({
    where: {
      status: BookingStatus.PENDING_APPROVAL,
    },
  });
}

/**
 * Counts booking requests currently marked as needing more information.
 *
 * @returns The number of globally needs-more-info bookings.
 */
export async function getNeedsMoreInfoBookingCount() {
  return db.bookingRequest.count({
    where: {
      status: BookingStatus.NEEDS_MORE_INFO,
    },
  });
}

/**
 * Counts one Customer Service user's draft booking requests.
 *
 * @param userId - The Customer Service user who created the bookings.
 * @returns The number of owner-scoped draft bookings.
 */
export async function getCustomerServiceDraftBookingCount(userId: string) {
  return db.bookingRequest.count({
    where: {
      createdById: userId,
      status: BookingStatus.DRAFT,
    },
  });
}

/**
 * Counts one Customer Service user's bookings waiting for approval.
 *
 * @param userId - The Customer Service user who created the bookings.
 * @returns The number of owner-scoped pending approval bookings.
 */
export async function getCustomerServicePendingApprovalBookingCount(
  userId: string,
) {
  return db.bookingRequest.count({
    where: {
      createdById: userId,
      status: BookingStatus.PENDING_APPROVAL,
    },
  });
}

/**
 * Counts one Customer Service user's bookings needing more information.
 *
 * @param userId - The Customer Service user who created the bookings.
 * @returns The number of owner-scoped needs-more-info bookings.
 */
export async function getCustomerServiceNeedsMoreInfoBookingCount(
  userId: string,
) {
  return db.bookingRequest.count({
    where: {
      createdById: userId,
      status: BookingStatus.NEEDS_MORE_INFO,
    },
  });
}

/**
 * Counts one Customer Service user's approved or scheduled bookings.
 *
 * @param userId - The Customer Service user who created the bookings.
 * @returns The number of owner-scoped approved or scheduled bookings.
 */
export async function getCustomerServiceApprovedScheduledBookingCount(
  userId: string,
) {
  return db.bookingRequest.count({
    where: {
      createdById: userId,
      status: {
        in: [BookingStatus.APPROVED, BookingStatus.SCHEDULED],
      },
    },
  });
}

/**
 * Returns global booking rows that need dashboard attention.
 *
 * @param limit - Maximum number of booking rows to return.
 * @returns Pending approval and needs-more-info bookings ordered by latest update.
 */
export async function getDashboardNeedsAttentionBookings(
  limit: number,
): Promise<DashboardNeedsAttentionBookingRecord[]> {
  return db.bookingRequest.findMany({
    ...dashboardNeedsAttentionBookingArgs,
    where: {
      status: {
        in: [BookingStatus.PENDING_APPROVAL, BookingStatus.NEEDS_MORE_INFO],
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
    take: limit,
  });
}

/**
 * Returns owner-scoped booking rows that need Customer Service attention.
 *
 * @param userId - The Customer Service user who created the bookings.
 * @param limit - Maximum number of booking rows to return.
 * @returns Draft, pending approval, and needs-more-info bookings ordered by latest update.
 */
export async function getCustomerServiceDashboardNeedsAttentionBookings(
  userId: string,
  limit: number,
): Promise<DashboardNeedsAttentionBookingRecord[]> {
  return db.bookingRequest.findMany({
    ...dashboardNeedsAttentionBookingArgs,
    where: {
      createdById: userId,
      status: {
        in: [
          BookingStatus.NEEDS_MORE_INFO,
          BookingStatus.DRAFT,
          BookingStatus.PENDING_APPROVAL,
        ],
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
    take: limit,
  });
}

/**
 * Returns recent booking rows for Admin and Manager dashboard activity.
 *
 * @param limit - Maximum number of activity source rows to return.
 * @returns Recently updated bookings ordered newest first.
 */
export async function getRecentDashboardBookingsForOperations(
  limit: number,
): Promise<DashboardRecentActivityBookingRecord[]> {
  return db.bookingRequest.findMany({
    ...dashboardRecentActivityBookingArgs,
    where: {},
    orderBy: [{ updatedAt: 'desc' }],
    take: limit,
  });
}

/**
 * Returns recent owner-scoped booking rows for Customer Service dashboard activity.
 *
 * @param userId - The Customer Service user who created the bookings.
 * @param limit - Maximum number of activity source rows to return.
 * @returns Recently updated owner-scoped bookings ordered newest first.
 */
export async function getRecentDashboardBookingsForCustomerService(
  userId: string,
  limit: number,
): Promise<DashboardRecentActivityBookingRecord[]> {
  return db.bookingRequest.findMany({
    ...dashboardRecentActivityBookingArgs,
    where: {
      createdById: userId,
    },
    orderBy: [{ updatedAt: 'desc' }],
    take: limit,
  });
}

/**
 * Returns recent assigned scheduled booking rows for Instructor dashboard activity.
 *
 * @param userId - The instructor user whose assignments scope activity.
 * @param limit - Maximum number of activity source rows to return.
 * @returns Recently updated scheduled bookings assigned to the instructor.
 */
export async function getRecentDashboardBookingsForInstructor(
  userId: string,
  limit: number,
): Promise<DashboardRecentActivityBookingRecord[]> {
  return db.bookingRequest.findMany({
    ...dashboardRecentActivityBookingArgs,
    where: {
      status: BookingStatus.SCHEDULED,
      scheduleItems: {
        some: {
          assignments: {
            some: {
              userId,
            },
          },
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
    take: limit,
  });
}
