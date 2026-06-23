import {
  BookingCustomerRole,
  BookingStatus,
  UserRole,
} from '@/generated/prisma/enums';

export const bookingStatusFilters = [
  BookingStatus.DRAFT,
  BookingStatus.PENDING_APPROVAL,
  BookingStatus.NEEDS_MORE_INFO,
  BookingStatus.APPROVED,
  BookingStatus.CANCELLED,
] as const;

export type BookingStatusFilter = (typeof bookingStatusFilters)[number];

type BookingQueryUser = {
  id: string;
  role: UserRole;
};

export type BookingRequestFilter = {
  status?: BookingStatusFilter;
  createdById?: string;
  id?: { in: string[] };
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
