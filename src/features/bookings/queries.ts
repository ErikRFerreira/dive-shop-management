/**
 * Purpose: This file contains server-only queries for fetching booking requests from the database.
 * It applies role-based visibility rules and returns the necessary relations for the booking-list UI.
 *
 * @module features/bookings/queries
 */

import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import type { CurrentUser } from '@/lib/current-user';
import {
  bookingDefaultPageSize,
  type BookingQueueFilter,
  type BookingStatusFilter,
} from './types';
import { getActiveParticipantCount } from './participants';
import { buildBookingRequestWhere, resolveDisplayCustomer } from './utils';

/**
 * Server-only booking list queries.
 *
 * These queries apply the current user's role-based visibility rules and return
 * the relations required by the booking-list UI.
 *
 * @remarks Do not import database access from a Client Component. The
 * `server-only` marker makes incorrect imports fail during the build.
 */
export {
  buildBookingRequestWhere,
  parseBookingPageParam,
  parseBookingPageSizeParam,
  parseBookingQueueFilter,
  parseBookingStatusFilter,
  resolveDisplayCustomer,
} from './utils';
export {
  bookingDefaultPageSize,
  bookingQueueFilters,
  bookingStatusFilters,
} from './types';
export type { BookingQueueFilter, BookingStatusFilter } from './types';

/**
 * Relations fetched for each row in the internal booking list.
 *
 * @internal
 */
const bookingRequestListArgs = {
  include: {
    createdBy: {
      select: {
        id: true,
        name: true,
      },
    },
    customers: {
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
    activities: {
      orderBy: {
        sortOrder: 'asc',
      },
    },
    deposits: {
      orderBy: {
        createdAt: 'desc',
      },
    },
    scheduleItems: {
      select: {
        id: true,
        date: true,
        startTime: true,
        dayNumber: true,
        totalDays: true,
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
      orderBy: [{ date: 'asc' }, { dayNumber: 'asc' }, { createdAt: 'asc' }],
    },
  },
} satisfies Prisma.BookingRequestDefaultArgs;

/**
 * Relations fetched for a single internal booking detail view.
 *
 * @internal
 */
const bookingRequestDetailArgs = {
  include: {
    ...bookingRequestListArgs.include,
    scheduleItems: {
      select: {
        id: true,
        date: true,
        startTime: true,
        dayNumber: true,
        totalDays: true,
        activityType: true,
        scheduleNotes: true,
        assignments: {
          select: {
            id: true,
            userId: true,
            role: true,
            notes: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: [{ date: 'asc' }, { dayNumber: 'asc' }, { createdAt: 'asc' }],
    },
  },
} satisfies Prisma.BookingRequestDefaultArgs;

type BookingRequestWithRelations = Prisma.BookingRequestGetPayload<
  typeof bookingRequestListArgs
>;
type BookingRequestDetailWithRelations = Prisma.BookingRequestGetPayload<
  typeof bookingRequestDetailArgs
>;

/**
 * A booking-list row with the preferred customer selected for display.
 *
 * @remarks `displayCustomer` and `activeParticipantCount` are derived from
 * active booking/customer join rows. Historical participants remain attached in
 * `customers` but do not drive operational headcount.
 */
export type BookingListItem = BookingRequestWithRelations & {
  activeParticipantCount: number;
  displayCustomer:
    | BookingRequestWithRelations['customers'][number]['customer']
    | null;
  scheduleItem: BookingRequestWithRelations['scheduleItems'][number] | null;
};

/** Pagination metadata returned with the internal booking list. */
export type BookingListPagination = {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Page and page-size inputs accepted by the booking list query. */
export type BookingListPaginationInput = {
  page: number;
  pageSize: number;
};

/** Paginated booking rows and metadata for the internal booking list. */
export type PaginatedBookingList = {
  bookings: BookingListItem[];
  pagination: BookingListPagination;
};

/** A visible booking request with all relations required by the detail view. */
export type BookingDetailsItem = BookingRequestDetailWithRelations & {
  activeParticipantCount: number;
  displayCustomer:
    | BookingRequestDetailWithRelations['customers'][number]['customer']
    | null;
  scheduleItem: BookingRequestDetailWithRelations['scheduleItems'][number] | null;
};

/**
 * Returns a paginated page of visible bookings for the current user, newest first.
 *
 * Customer Service users only receive bookings they created; Admin and Manager
 * users receive all bookings. Unsupported roles receive no bookings.
 *
 * @param currentUser - The authenticated user whose role scopes visibility.
 * @param status - Optional status filter validated from the request URL.
 * @param queue - Optional operational queue filter validated from the request URL.
 * @param paginationInput - Requested page and fixed page size parsed from the URL.
 * @returns Booking-list rows for the resolved page plus total-count metadata.
 */
export async function getBookingRequests(
  currentUser: CurrentUser,
  status?: BookingStatusFilter,
  queue?: BookingQueueFilter,
  paginationInput: BookingListPaginationInput = {
    page: 1,
    pageSize: bookingDefaultPageSize,
  },
): Promise<PaginatedBookingList> {
  const where = buildBookingRequestWhere(currentUser, status, queue);
  const totalCount = await db.bookingRequest.count({ where });
  const totalPages = Math.ceil(totalCount / paginationInput.pageSize);
  const page = totalPages > 0 ? Math.min(paginationInput.page, totalPages) : 1;

  if (totalCount === 0) {
    return {
      bookings: [],
      pagination: {
        totalCount,
        page,
        pageSize: paginationInput.pageSize,
        totalPages,
      },
    };
  }

  const bookingRequests = await db.bookingRequest.findMany({
    ...bookingRequestListArgs,
    where,
    orderBy: {
      createdAt: 'desc',
    },
    skip: (page - 1) * paginationInput.pageSize,
    take: paginationInput.pageSize,
  });

  return {
    bookings: bookingRequests.map((bookingRequest) => ({
      ...bookingRequest,
      activeParticipantCount: getActiveParticipantCount(
        bookingRequest.customers,
      ),
      displayCustomer: resolveDisplayCustomer(bookingRequest.customers),
      scheduleItem: bookingRequest.scheduleItems[0] ?? null,
    })),
    pagination: {
      totalCount,
      page,
      pageSize: paginationInput.pageSize,
      totalPages,
    },
  };
}

/**
 * Returns a single booking request by its ID, if visible to the current user.
 *
 * @param currentUser - The authenticated user whose role scopes visibility.
 * @param id - The ID of the booking request to retrieve.
 * @returns The booking request with its relations and display customer, or null if not found or not visible.
 */
export async function getBookingRequestById(
  currentUser: CurrentUser,
  id: string,
): Promise<BookingDetailsItem | null> {
  const bookingRequest = await db.bookingRequest.findFirst({
    ...bookingRequestDetailArgs,
    where: {
      AND: [{ id }, buildBookingRequestWhere(currentUser)],
    },
  });

  if (!bookingRequest) {
    return null;
  }

  return {
    ...bookingRequest,
    activeParticipantCount: getActiveParticipantCount(bookingRequest.customers),
    displayCustomer: resolveDisplayCustomer(bookingRequest.customers),
    scheduleItem: bookingRequest.scheduleItems[0] ?? null,
  };
}
