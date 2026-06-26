/**
 * Purpose: This file contains server-only queries for fetching customer data from the database.
 * It applies role-based visibility rules and returns the necessary relations for the customer-list UI.
 *
 * @module features/customers/queries
 */

import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import type { CustomerSearchResult } from './types';

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
