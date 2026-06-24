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
import type { BookingStatusFilter } from './types';
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
  parseBookingStatusFilter,
  resolveDisplayCustomer,
} from './utils';
export { bookingStatusFilters } from './types';
export type { BookingStatusFilter } from './types';

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
  },
} satisfies Prisma.BookingRequestDefaultArgs;

type BookingRequestWithRelations = Prisma.BookingRequestGetPayload<
  typeof bookingRequestListArgs
>;

/**
 * A booking-list row with the preferred customer selected for display.
 *
 * @remarks `displayCustomer` is derived from `customers`; it prefers the
 * primary contact and falls back to the first linked customer.
 */
export type BookingListItem = BookingRequestWithRelations & {
  displayCustomer:
    | BookingRequestWithRelations['customers'][number]['customer']
    | null;
};

/** A visible booking request with all relations required by the detail view. */
export type BookingDetailsItem = BookingListItem;

/**
 * Returns the visible bookings for the current user, newest first.
 *
 * Customer Service users only receive bookings they created; Admin and Manager
 * users receive all bookings. Unsupported roles receive no bookings.
 *
 * @param currentUser - The authenticated user whose role scopes visibility.
 * @param status - Optional status filter validated from the request URL.
 * @returns Booking-list rows, including their creator, customers, and derived
 * display customer.
 */
export async function getBookingRequests(
  currentUser: CurrentUser,
  status?: BookingStatusFilter,
): Promise<BookingListItem[]> {
  const bookingRequests = await db.bookingRequest.findMany({
    ...bookingRequestListArgs,
    where: buildBookingRequestWhere(currentUser, status),
    orderBy: {
      createdAt: 'desc',
    },
  });

  return bookingRequests.map((bookingRequest) => ({
    ...bookingRequest,
    displayCustomer: resolveDisplayCustomer(bookingRequest.customers),
  }));
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
    ...bookingRequestListArgs,
    where: {
      AND: [{ id }, buildBookingRequestWhere(currentUser)],
    },
  });

  if (!bookingRequest) {
    return null;
  }

  return {
    ...bookingRequest,
    displayCustomer: resolveDisplayCustomer(bookingRequest.customers),
  };
}
