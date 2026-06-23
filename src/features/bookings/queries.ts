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
