import { BookingStatus } from '@/generated/prisma/enums';

/** Booking statuses that can be selected in the booking-list filter. */
export const bookingStatusFilters = [
  BookingStatus.DRAFT,
  BookingStatus.PENDING_APPROVAL,
  BookingStatus.NEEDS_MORE_INFO,
  BookingStatus.APPROVED,
  BookingStatus.CANCELLED,
] as const;

export type BookingStatusFilter = (typeof bookingStatusFilters)[number];

/** Prisma-compatible conditions used to scope booking-list queries. */
export type BookingRequestFilter = {
  status?: BookingStatusFilter;
  createdById?: string;
  id?: { in: string[] };
};
