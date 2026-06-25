import { BookingStatus } from '@/generated/prisma/enums';
import {
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
  'bookingRequest' | 'bookingActivity' | 'customer' | 'bookingCustomer' | 'deposit'
>;

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

async function createCustomersForBooking(
  transaction: BookingMutationTransaction,
  bookingRequestId: string,
  bookingValues: NormalizedBookingFormValues,
) {
  await Promise.all(
    bookingValues.customers.map(async (bookingCustomer) => {
      const customer = await transaction.customer.create({
        data: mapCustomerData(bookingCustomer),
      });

      await transaction.bookingCustomer.create({
        data: mapBookingCustomerCreateManyData(
          bookingRequestId,
          [bookingCustomer],
          [customer.id],
        )[0],
      });
    }),
  );
}

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

async function replaceCustomers(
  transaction: BookingMutationTransaction,
  bookingRequestId: string,
  bookingValues: NormalizedBookingFormValues,
) {
  const customerIds = await Promise.all(
    bookingValues.customers.map(async (bookingCustomer) => {
      const customerData = mapCustomerData(bookingCustomer);

      if (bookingCustomer.customerId) {
        await transaction.customer.update({
          where: { id: bookingCustomer.customerId },
          data: customerData,
        });
        return bookingCustomer.customerId;
      }

      const customer = await transaction.customer.create({
        data: customerData,
      });
      return customer.id;
    }),
  );

  await transaction.bookingCustomer.deleteMany({
    where: { bookingRequestId },
  });

  if (bookingValues.customers.length > 0) {
    await transaction.bookingCustomer.createMany({
      data: mapBookingCustomerCreateManyData(
        bookingRequestId,
        bookingValues.customers,
        customerIds,
      ),
    });
  }
}

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

    await createCustomersForBooking(transaction, bookingRequest.id, bookingValues);

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
    await replaceCustomers(transaction, booking.id, bookingValues);
    await syncNewestDeposit(
      transaction,
      booking.id,
      booking.deposits[0]?.id,
      bookingValues,
    );

    return true;
  });
}
