import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import type { CurrentUser } from '@/lib/current-user';
import {
  buildBookingRequestWhere,
  resolveDisplayCustomer,
  type BookingStatusFilter,
} from './utils';

export {
  buildBookingRequestWhere,
  bookingStatusFilters,
  parseBookingStatusFilter,
  resolveDisplayCustomer,
} from './utils';
export type { BookingStatusFilter } from './utils';

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

export type BookingListItem = BookingRequestWithRelations & {
  displayCustomer:
    | BookingRequestWithRelations['customers'][number]['customer']
    | null;
};

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
