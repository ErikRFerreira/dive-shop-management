/**
 * Purpose: This file contains server-only queries for fetching customer data from the database.
 * It applies role-based visibility rules and returns the necessary relations for the customer-list UI.
 *
 * @module features/customers/queries
 */

import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import { BookingCustomerRole } from '@/generated/prisma/enums';
import { db } from '@/lib/db';
import type {
  CustomerBookingHistoryItem,
  CustomerDetail,
  CustomerDiveInfo,
  CustomerSearchResult,
} from './types';

export const customerSearchArgs = {
  select: {
    id: true,
    fullName: true,
    firstName: true,
    lastName: true,
    chineseName: true,
    weChatId: true,
    whatsAppNumber: true,
    email: true,
    phone: true,
    hotel: true,
    preferredLanguage: true,
    bookings: {
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
      select: {
        certificationLevel: true,
        certificationAgency: true,
        lastDiveAt: true,
        divesLogged: true,
        bookingRequest: {
          select: {
            requestedDate: true,
            startAt: true,
            createdAt: true,
          },
        },
      },
    },
  },
} satisfies Prisma.CustomerDefaultArgs;

export type CustomerSearchRecord = Prisma.CustomerGetPayload<
  typeof customerSearchArgs
>;

const customerDetailArgs = {
  select: {
    id: true,
    fullName: true,
    firstName: true,
    lastName: true,
    chineseName: true,
    weChatId: true,
    whatsAppNumber: true,
    email: true,
    phone: true,
    hotel: true,
    preferredLanguage: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    bookings: {
      select: {
        bookingRequestId: true,
        customerId: true,
        role: true,
        hotelAtBooking: true,
        equipmentNeeded: true,
        certificationAgency: true,
        certificationLevel: true,
        lastDiveAt: true,
        heightCm: true,
        weightKg: true,
        shoeSize: true,
        divesLogged: true,
        createdAt: true,
        updatedAt: true,
        bookingRequest: {
          select: {
            id: true,
            status: true,
            activityType: true,
            requestedDate: true,
            startAt: true,
            numberOfPeople: true,
            source: true,
            referrerName: true,
            createdAt: true,
            activities: {
              orderBy: {
                sortOrder: 'asc',
              },
              select: {
                activityType: true,
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CustomerDefaultArgs;

export type CustomerDetailRecord = Prisma.CustomerGetPayload<
  typeof customerDetailArgs
>;

type CustomerBookingRecord = CustomerDetailRecord['bookings'][number];

/**
 * Builds the staff-facing display name for a customer search result.
 *
 * @param customer - Customer name fields selected from Prisma.
 * @returns The full name, first/last name combination, or a fallback label.
 */
function displayCustomerName(
  customer: Pick<CustomerSearchRecord, 'fullName' | 'firstName' | 'lastName'>,
) {
  const fullName = customer.fullName?.trim();
  if (fullName) return fullName;

  return (
    [customer.firstName, customer.lastName]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part))
      .join(' ') || 'Unnamed customer'
  );
}

/**
 * Returns the primary display date for a booking history row.
 *
 * @param booking - Booking request date fields selected for customer detail.
 * @returns Scheduled start date, requested date, or created date in priority order.
 */
function getBookingHistoryDate(
  booking: CustomerBookingRecord['bookingRequest'],
) {
  return booking.startAt ?? booking.requestedDate ?? booking.createdAt ?? null;
}

/**
 * Sorts booking-customer rows by their operational booking date, newest first.
 *
 * @param bookings - Customer booking rows selected for customer detail.
 * @returns A copied array sorted by scheduled/requested/created date descending.
 */
function sortCustomerBookingsByHistoryDate(
  bookings: CustomerBookingRecord[],
) {
  return [...bookings].sort((left, right) => {
    const leftDate = getBookingHistoryDate(left.bookingRequest)?.getTime() ?? 0;
    const rightDate =
      getBookingHistoryDate(right.bookingRequest)?.getTime() ?? 0;

    return rightDate - leftDate;
  });
}

/**
 * Finds the newest non-empty value for one booking-customer field.
 *
 * @typeParam TValue - The nullable value type to resolve.
 * @param bookings - Customer booking rows ordered newest first.
 * @param selectValue - Field selector for the value to resolve.
 * @returns The newest non-null and non-empty value, or null.
 */
function findLatestKnownValue<TValue>(
  bookings: CustomerBookingRecord[],
  selectValue: (booking: CustomerBookingRecord) => TValue | null,
): TValue | null {
  for (const booking of bookings) {
    const value = selectValue(booking);

    if (value !== null && value !== '') {
      return value;
    }
  }

  return null;
}

/**
 * Computes display-only latest known dive and equipment values for a customer.
 *
 * @param bookings - Customer booking rows selected for customer detail.
 * @returns Latest known dive/equipment values derived from booking-specific data.
 */
export function getLatestCustomerDiveInfo(
  bookings: CustomerBookingRecord[],
): CustomerDiveInfo {
  const sortedBookings = sortCustomerBookingsByHistoryDate(bookings);
  const weightKg = findLatestKnownValue(
    sortedBookings,
    (booking) => booking.weightKg,
  );
  const shoeSize = findLatestKnownValue(
    sortedBookings,
    (booking) => booking.shoeSize,
  );

  return {
    certificationLevel: findLatestKnownValue(
      sortedBookings,
      (booking) => booking.certificationLevel,
    ),
    certificationAgency: findLatestKnownValue(
      sortedBookings,
      (booking) => booking.certificationAgency,
    ),
    lastDiveDate: findLatestKnownValue(
      sortedBookings,
      (booking) => booking.lastDiveAt,
    ),
    divesLogged: findLatestKnownValue(
      sortedBookings,
      (booking) => booking.divesLogged,
    ),
    heightCm: findLatestKnownValue(
      sortedBookings,
      (booking) => booking.heightCm,
    ),
    weightKg: weightKg?.toString() ?? null,
    shoeSize: shoeSize?.toString() ?? null,
    equipmentNotes: findLatestKnownValue(
      sortedBookings,
      (booking) => booking.equipmentNeeded,
    ),
  };
}

/**
 * Maps customer booking rows into newest-first booking history items.
 *
 * @param customer - Customer detail record loaded with {@link customerDetailArgs}.
 * @returns Booking-specific history rows suitable for the customer detail UI.
 */
export function getCustomerBookingHistory(
  customer: CustomerDetailRecord,
): CustomerBookingHistoryItem[] {
  return sortCustomerBookingsByHistoryDate(customer.bookings).map(
    (bookingCustomer) => {
      const booking = bookingCustomer.bookingRequest;

      return {
        bookingId: booking.id,
        status: booking.status,
        date: getBookingHistoryDate(booking),
        activityType: booking.activityType,
        activities: booking.activities,
        role: bookingCustomer.role,
        isPrimaryContact:
          bookingCustomer.role === BookingCustomerRole.PRIMARY_CONTACT,
        numberOfPeople: booking.numberOfPeople,
        source: booking.source,
        referrerName: booking.referrerName,
        hotelAtBooking: bookingCustomer.hotelAtBooking,
        createdAt: booking.createdAt,
      };
    },
  );
}

/**
 * Maps a Prisma customer record into the stable customer search result shape.
 *
 * @param customer - Customer record loaded with {@link customerSearchArgs}.
 * @returns A UI-safe customer search result with latest booking details folded in.
 */
export function mapCustomerSearchResult(
  customer: CustomerSearchRecord,
): CustomerSearchResult {
  const latestBooking = customer.bookings[0];

  return {
    id: customer.id,
    name: displayCustomerName(customer),
    fullName: customer.fullName,
    firstName: customer.firstName,
    lastName: customer.lastName,
    chineseName: customer.chineseName,
    weChatId: customer.weChatId,
    whatsAppNumber: customer.whatsAppNumber,
    email: customer.email,
    phone: customer.phone,
    hotel: customer.hotel,
    preferredLanguage: customer.preferredLanguage,
    certificationLevel: latestBooking?.certificationLevel ?? null,
    certificationAgency: latestBooking?.certificationAgency ?? null,
    lastDiveDate: latestBooking?.lastDiveAt ?? null,
    divesLogged: latestBooking?.divesLogged ?? null,
    lastBookingDate:
      latestBooking?.bookingRequest.startAt ??
      latestBooking?.bookingRequest.requestedDate ??
      latestBooking?.bookingRequest.createdAt ??
      null,
  };
}

/**
 * Searches customers by the identifying fields staff use to avoid duplicates.
 *
 * @param query - Raw search text from the `/customers?q=` URL parameter.
 * @returns Matching customer records, newest updated first, or an empty array for blank input.
 */
export async function searchCustomers(
  query: string,
): Promise<CustomerSearchResult[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const customers = await db.customer.findMany({
    ...customerSearchArgs,
    where: {
      OR: [
        { fullName: { contains: normalizedQuery, mode: 'insensitive' } },
        { firstName: { contains: normalizedQuery, mode: 'insensitive' } },
        { lastName: { contains: normalizedQuery, mode: 'insensitive' } },
        { chineseName: { contains: normalizedQuery, mode: 'insensitive' } },
        { weChatId: { contains: normalizedQuery, mode: 'insensitive' } },
        { whatsAppNumber: { contains: normalizedQuery, mode: 'insensitive' } },
        { email: { contains: normalizedQuery, mode: 'insensitive' } },
        { phone: { contains: normalizedQuery, mode: 'insensitive' } },
      ],
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 20,
  });

  return customers.map(mapCustomerSearchResult);
}

/**
 * Returns a read-only customer detail payload with booking history.
 *
 * @param id - Customer ID from the `/customers/[id]` route.
 * @returns Customer detail data, or null when the customer does not exist.
 */
export async function getCustomerDetail(
  id: string,
): Promise<CustomerDetail | null> {
  const customer = await db.customer.findUnique({
    ...customerDetailArgs,
    where: { id },
  });

  if (!customer) {
    return null;
  }

  return {
    id: customer.id,
    name: displayCustomerName(customer),
    fullName: customer.fullName,
    firstName: customer.firstName,
    lastName: customer.lastName,
    chineseName: customer.chineseName,
    weChatId: customer.weChatId,
    whatsAppNumber: customer.whatsAppNumber,
    email: customer.email,
    phone: customer.phone,
    hotel: customer.hotel,
    preferredLanguage: customer.preferredLanguage,
    notes: customer.notes,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    diveInfo: getLatestCustomerDiveInfo(customer.bookings),
    bookingHistory: getCustomerBookingHistory(customer),
  };
}
