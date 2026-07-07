/**
 * Purpose: Implements the mutations for creating and updating booking requests,
 * including handling related entities such as customers, activities, and deposits.
 *
 * @module features/bookings/mutations
 */

import { BookingStatus } from '@/generated/prisma/enums';
import {
  filterPersistableBookingCustomers,
  hasMeaningfulDeposit,
  normalizeBookingFormValues,
} from '@/features/bookings/form-mappers';
import { db } from '@/lib/db';

import {
  mapBookingActivityCreateData,
  mapBookingActivityCreateManyData,
  mapBookingCustomerCreateManyData,
  mapBookingRequestIntakeData,
  mapCustomerData,
  mapDepositData,
} from './persistence-mappers';
import type { NormalizedBookingFormValues } from './types';

type BookingMutationTransaction = Pick<
  typeof db,
  | 'bookingRequest'
  | 'bookingActivity'
  | 'customer'
  | 'bookingCustomer'
  | 'deposit'
>;

/**
 * Loads a booking request along with its related customers and deposits for editing purposes.
 *
 * @param bookingId - The ID of the booking request to load.
 * @returns A promise that resolves to the editable booking request, or null if not found.
 */
export async function loadEditableBooking(bookingId: string) {
  return db.bookingRequest.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      createdById: true,
      customers: {
        select: {
          customerId: true,
        },
      },
      deposits: {
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
        },
      },
    },
  });
}

export type EditableBooking = NonNullable<
  Awaited<ReturnType<typeof loadEditableBooking>>
>;

/**
 * Resolves the Customer IDs that should be linked to the booking.
 *
 * @param transaction - The database transaction object.
 * @param bookingValues - The normalized booking form values.
 * @returns Customer IDs in the same order as the submitted booking customers.
 */
async function resolveBookingCustomerIds(
  transaction: BookingMutationTransaction,
  bookingValues: NormalizedBookingFormValues,
) {
  const customerIds: string[] = [];

  for (const bookingCustomer of bookingValues.customers) {
    if (bookingCustomer.customerId) {
      customerIds.push(bookingCustomer.customerId);
      continue;
    }

    const customer = await transaction.customer.create({
      data: mapCustomerData(bookingCustomer),
    });
    customerIds.push(customer.id);
  }

  return customerIds;
}

/**
 * Replaces the activities for a booking request.
 *
 * @param transaction - The database transaction object.
 * @param bookingRequestId - The ID of the booking request.
 * @param bookingValues - The normalized booking form values.
 */
async function replaceActivities(
  transaction: BookingMutationTransaction,
  bookingRequestId: string,
  bookingValues: NormalizedBookingFormValues,
) {
  await transaction.bookingActivity.deleteMany({
    where: { bookingRequestId },
  });

  if (bookingValues.activities.length > 0) {
    await transaction.bookingActivity.createMany({
      data: mapBookingActivityCreateManyData(
        bookingRequestId,
        bookingValues.activities,
      ),
    });
  }
}

/**
 * Replaces the booking customer links for a booking request.
 * Blank/default rows are ignored so draft saves do not create anonymous
 * customer records or placeholder booking links.
 *
 * @param transaction - The database transaction object.
 * @param bookingRequestId - The ID of the booking request.
 * @param bookingValues - The normalized booking form values.
 */
async function replaceBookingCustomers(
  transaction: BookingMutationTransaction,
  bookingRequestId: string,
  bookingValues: NormalizedBookingFormValues,
) {
  const persistableBookingValues =
    filterPersistableBookingCustomers(bookingValues);
  const customerIds = await resolveBookingCustomerIds(
    transaction,
    persistableBookingValues,
  );

  await transaction.bookingCustomer.deleteMany({
    where: { bookingRequestId },
  });

  if (persistableBookingValues.customers.length > 0) {
    await transaction.bookingCustomer.createMany({
      data: mapBookingCustomerCreateManyData(
        bookingRequestId,
        persistableBookingValues.customers,
        customerIds,
      ),
    });
  }
}

/**
 * Synchronizes the newest deposit for a booking request.
 *
 * @param transaction - The database transaction object.
 * @param bookingRequestId - The ID of the booking request.
 * @param newestDepositId - The ID of the newest deposit, if any.
 * @param bookingValues - The normalized booking form values.
 */
async function syncNewestDeposit(
  transaction: BookingMutationTransaction,
  bookingRequestId: string,
  newestDepositId: string | undefined,
  bookingValues: NormalizedBookingFormValues,
) {
  if (hasMeaningfulDeposit(bookingValues)) {
    const depositData = mapDepositData(bookingValues);

    if (newestDepositId) {
      await transaction.deposit.update({
        where: { id: newestDepositId },
        data: depositData,
      });
    } else {
      await transaction.deposit.create({
        data: {
          bookingRequestId,
          ...depositData,
        },
      });
    }
  } else if (newestDepositId) {
    await transaction.deposit.delete({
      where: { id: newestDepositId },
    });
  }
}

/**
 * Creates a booking request with intake data.
 *
 * @param bookingValues - The normalized booking form values.
 * @param status - The status of the booking request.
 * @param createdById - The ID of the user who created the booking request.
 */
export async function createBookingRequestWithIntake(
  bookingValues: ReturnType<typeof normalizeBookingFormValues>,
  status: typeof BookingStatus.DRAFT | typeof BookingStatus.PENDING_APPROVAL,
  createdById: string,
) {
  await db.$transaction(async (transaction) => {
    const bookingRequest = await transaction.bookingRequest.create({
      data: {
        status,
        ...mapBookingRequestIntakeData(bookingValues),
        createdById,
        activities: {
          create: bookingValues.activities.map(mapBookingActivityCreateData),
        },
      },
    });

    await replaceBookingCustomers(transaction, bookingRequest.id, bookingValues);

    if (hasMeaningfulDeposit(bookingValues)) {
      await transaction.deposit.create({
        data: {
          bookingRequestId: bookingRequest.id,
          ...mapDepositData(bookingValues),
        },
      });
    }
  });
}

/**
 * Updates a booking request with intake data.
 *
 * @param booking - The editable booking request.
 * @param bookingValues - The normalized booking form values.
 * @param nextStatus - The next status of the booking request, if any.
 * @returns A promise that resolves to true if the update was successful, or false otherwise.
 */
export async function updateBookingRequestWithIntake(
  booking: EditableBooking,
  bookingValues: ReturnType<typeof normalizeBookingFormValues>,
  nextStatus?: BookingStatus,
) {
  return db.$transaction(async (transaction) => {
    const updateResult = await transaction.bookingRequest.updateMany({
      where: {
        id: booking.id,
        status: booking.status,
      },
      data: {
        status: nextStatus,
        ...mapBookingRequestIntakeData(bookingValues),
      },
    });

    if (updateResult.count !== 1) {
      return false;
    }

    await replaceActivities(transaction, booking.id, bookingValues);
    await replaceBookingCustomers(transaction, booking.id, bookingValues);
    await syncNewestDeposit(
      transaction,
      booking.id,
      booking.deposits[0]?.id,
      bookingValues,
    );

    return true;
  });
}
