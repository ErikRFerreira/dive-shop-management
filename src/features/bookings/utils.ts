import {
  BookingCustomerRole,
  UserRole,
} from '@/generated/prisma/enums';
import {
  bookingStatusFilters,
  type BookingRequestFilter,
  type BookingStatusFilter,
} from './types';

type BookingQueryUser = {
  id: string;
  role: UserRole;
};

export function parseBookingStatusFilter(
  value: string | string[] | undefined,
): BookingStatusFilter | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return bookingStatusFilters.find((status) => status === value);
}

export function buildBookingRequestWhere(
  currentUser: BookingQueryUser,
  status?: BookingStatusFilter,
): BookingRequestFilter {
  const where: BookingRequestFilter = {};

  if (status) {
    where.status = status;
  }

  if (currentUser.role === UserRole.CUSTOMER_SERVICE) {
    where.createdById = currentUser.id;
  } else if (
    currentUser.role !== UserRole.ADMIN &&
    currentUser.role !== UserRole.MANAGER
  ) {
    where.id = { in: [] };
  }

  return where;
}

type BookingCustomerForDisplay<TCustomer> = {
  role: BookingCustomerRole;
  customer: TCustomer;
};

export function resolveDisplayCustomer<TCustomer>(
  customers: BookingCustomerForDisplay<TCustomer>[],
) {
  return (
    customers.find(
      (customer) => customer.role === BookingCustomerRole.PRIMARY_CONTACT,
    )?.customer ??
    customers[0]?.customer ??
    null
  );
}
