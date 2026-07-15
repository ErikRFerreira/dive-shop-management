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
import { getShopTodayDate, startOfUtcDateOnly } from '@/lib/operational-date';
import {
  bookingDefaultSort,
  bookingDefaultPageSize,
  type BookingQueueFilter,
  type BookingSort,
  type BookingStatusFilter,
} from './types';
import { getActiveParticipantCount } from './participants';
import { buildBookingRequestWhere, resolveDisplayCustomer } from './utils';
import {
  assertAuthorizedCapability,
  canAccessBookings,
} from '@/features/auth/permissions';

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
  parseBookingSortParam,
  parseBookingStatusFilter,
  resolveDisplayCustomer,
} from './utils';
export {
  bookingDefaultSort,
  bookingDefaultPageSize,
  bookingQueueFilters,
  bookingSortOptions,
  bookingStatusFilters,
} from './types';
export type { BookingQueueFilter, BookingSort, BookingStatusFilter } from './types';

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
        bookingActivityId: true,
        date: true,
        startTime: true,
        timeSlot: true,
        dayNumber: true,
        totalDays: true,
        activityType: true,
        assignments: {
          select: {
            id: true,
            userId: true,
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
        bookingActivityId: true,
        date: true,
        startTime: true,
        timeSlot: true,
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

/** Minimal fields needed to sort matching bookings by operational activity date. */
type BookingRequestActivityDateSortRow = {
  id: string;
  requestedDate: Date | null;
  scheduleItems: { date: Date }[];
  activities: { requestedDate: Date | null }[];
};

/** Sort buckets for the operational activity-date booking list order. */
type BookingActivityDateSortBucket = 'upcoming' | 'undated' | 'past';

/** Sort precedence for operational activity-date buckets. */
const bookingActivityDateSortBucketOrder: Record<
  BookingActivityDateSortBucket,
  number
> = {
  upcoming: 0,
  undated: 1,
  past: 2,
};

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
 * Maps a booking request record into the booking-list presentation shape.
 *
 * @param bookingRequest - Booking request and relations selected for the list UI.
 * @returns A booking-list row with derived display fields.
 */
function mapBookingRequestToListItem(
  bookingRequest: BookingRequestWithRelations,
): BookingListItem {
  return {
    ...bookingRequest,
    activeParticipantCount: getActiveParticipantCount(bookingRequest.customers),
    displayCustomer: resolveDisplayCustomer(bookingRequest.customers),
    scheduleItem: bookingRequest.scheduleItems[0] ?? null,
  };
}

/**
 * Resolves the earliest operational activity date for activity-date sorting.
 *
 * @param bookingRequest - Minimal booking date fields selected for sorting.
 * @returns The earliest schedule date, requested activity date, legacy requested
 * date, or null when the booking has no date.
 */
function getBookingActivitySortDate(
  bookingRequest: BookingRequestActivityDateSortRow,
) {
  const scheduleDate = bookingRequest.scheduleItems[0]?.date;

  if (scheduleDate) {
    return scheduleDate;
  }

  const activityDates = bookingRequest.activities
    .map((activity) => activity.requestedDate)
    .filter((date): date is Date => date !== null)
    .sort((first, second) => first.getTime() - second.getTime());

  return activityDates[0] ?? bookingRequest.requestedDate;
}

/**
 * Classifies a booking activity date into the operational list bucket.
 *
 * @param date - Resolved activity or schedule date for a booking.
 * @param today - Shop-local today represented in the app's UTC date-only format.
 * @returns Upcoming for today/future dates, past for dates before today, or undated.
 */
function getBookingActivityDateSortBucket(
  date: Date | null,
  today: Date,
): BookingActivityDateSortBucket {
  if (!date) {
    return 'undated';
  }

  return startOfUtcDateOnly(date) < today ? 'past' : 'upcoming';
}

/**
 * Compares two minimally selected bookings by operational upcoming activity date.
 *
 * @param first - First booking sort row.
 * @param second - Second booking sort row.
 * @param today - Shop-local today represented in the app's UTC date-only format.
 * @returns Standard Array.sort comparison result with upcoming dates first,
 * undated bookings next, and past dates last.
 */
function compareBookingActivitySortRows(
  first: BookingRequestActivityDateSortRow,
  second: BookingRequestActivityDateSortRow,
  today: Date,
) {
  const firstDate = getBookingActivitySortDate(first);
  const secondDate = getBookingActivitySortDate(second);
  const firstBucket = getBookingActivityDateSortBucket(firstDate, today);
  const secondBucket = getBookingActivityDateSortBucket(secondDate, today);
  const bucketComparison =
    bookingActivityDateSortBucketOrder[firstBucket] -
    bookingActivityDateSortBucketOrder[secondBucket];

  if (bucketComparison !== 0) {
    return bucketComparison;
  }

  if (firstDate && secondDate) {
    const firstTime = startOfUtcDateOnly(firstDate).getTime();
    const secondTime = startOfUtcDateOnly(secondDate).getTime();
    const dateComparison =
      firstBucket === 'past' ? secondTime - firstTime : firstTime - secondTime;

    if (dateComparison !== 0) {
      return dateComparison;
    }
  }

  return first.id.localeCompare(second.id);
}

/**
 * Returns the stable Prisma order used for database-backed booking list sorts.
 *
 * @param sort - Validated booking list sort.
 * @returns Prisma order clauses for sorts that can be expressed directly.
 */
function getBookingRequestOrderBy(
  sort: Exclude<BookingSort, 'activity-date'>,
): Prisma.BookingRequestOrderByWithRelationInput[] {
  if (sort === 'newest-created') {
    return [{ createdAt: 'desc' }, { id: 'asc' }];
  }

  return [{ updatedAt: 'desc' }, { id: 'asc' }];
}

/**
 * Hydrates a sorted page of booking IDs through the standard list include.
 *
 * @param ids - Booking IDs already sliced into the requested page order.
 * @param where - Visibility and filter constraints for the current request.
 * @returns Hydrated booking rows sorted in the same order as the provided IDs.
 */
async function getBookingRequestsBySortedIds(
  ids: string[],
  where: Prisma.BookingRequestWhereInput,
) {
  const bookingRequests = await db.bookingRequest.findMany({
    ...bookingRequestListArgs,
    where: {
      AND: [where, { id: { in: ids } }],
    },
  });
  const order = new Map(ids.map((id, index) => [id, index]));

  return bookingRequests.sort(
    (first, second) =>
      (order.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(second.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

/**
 * Returns a paginated page of visible bookings for the current user.
 *
 * Customer Service users only receive bookings they created; Admin and Manager
 * users receive all bookings. Unsupported roles receive no bookings.
 *
 * @param currentUser - The authenticated user whose role scopes visibility.
 * @param status - Optional status filter validated from the request URL.
 * @param queue - Optional operational queue filter validated from the request URL.
 * @param paginationInput - Requested page and fixed page size parsed from the URL.
 * @param sort - Validated URL-backed sort to apply to the booking list.
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
  sort: BookingSort = bookingDefaultSort,
): Promise<PaginatedBookingList> {
  assertAuthorizedCapability(canAccessBookings(currentUser));
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

  const skip = (page - 1) * paginationInput.pageSize;
  const bookingRequests =
    sort === 'activity-date'
      ? await getActivityDateSortedBookingRequests(where, skip, paginationInput.pageSize)
      : await db.bookingRequest.findMany({
          ...bookingRequestListArgs,
          where,
          orderBy: getBookingRequestOrderBy(sort),
          skip,
          take: paginationInput.pageSize,
        });

  return {
    bookings: bookingRequests.map(mapBookingRequestToListItem),
    pagination: {
      totalCount,
      page,
      pageSize: paginationInput.pageSize,
      totalPages,
    },
  };
}

/**
 * Returns one hydrated page of bookings sorted by operational activity date.
 *
 * @param where - Visibility and filter constraints for the current request.
 * @param skip - Number of sorted matching rows to skip for pagination.
 * @param take - Number of sorted matching rows to hydrate.
 * @returns Hydrated booking rows in shop-local upcoming activity-date order.
 */
async function getActivityDateSortedBookingRequests(
  where: Prisma.BookingRequestWhereInput,
  skip: number,
  take: number,
) {
  const sortedRows = await db.bookingRequest.findMany({
    where,
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
  });
  const today = getShopTodayDate();
  const ids = sortedRows
    .sort((first, second) => compareBookingActivitySortRows(first, second, today))
    .slice(skip, skip + take)
    .map((bookingRequest) => bookingRequest.id);

  return getBookingRequestsBySortedIds(ids, where);
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
  assertAuthorizedCapability(canAccessBookings(currentUser));
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
