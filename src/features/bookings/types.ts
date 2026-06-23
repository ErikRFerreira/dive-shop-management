/**
 * Purpose: This file contains type definitions for booking-related entities in the application.
 * It provides types for booking statuses, filters, and other related constructs.
 *
 * @module features/bookings/types
 */

import {
  ActivityType,
  BookingSource,
  BookingStatus,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';

/**
 * Booking statuses that can be selected in the internal booking-list filter.
 *
 * @remarks Excludes `SCHEDULED` because the MVP schedule is not the source of
 * truth for booking requests.
 */
export const bookingStatusFilters = [
  BookingStatus.DRAFT,
  BookingStatus.PENDING_APPROVAL,
  BookingStatus.NEEDS_MORE_INFO,
  BookingStatus.APPROVED,
  BookingStatus.CANCELLED,
] as const;

/** A permitted value for the booking-list status filter. */
export type BookingStatusFilter = (typeof bookingStatusFilters)[number];

/**
 * Conditions used to scope an internal booking-list query.
 *
 * @remarks This is intentionally limited to the predicates produced by
 * `buildBookingRequestWhere`; it is not a general-purpose Prisma where input.
 */
export type BookingRequestFilter = {
  status?: BookingStatusFilter;
  createdById?: string;
  id?: { in: string[] };
};

/**
 * Values managed by the new-booking React Hook Form instance.
 *
 * @remarks Numeric and date values remain strings here because HTML form
 * controls emit strings. `normalizeBookingFormValues` converts them before
 * database persistence.
 */
export type BookingFormValues = {
  rawBookingText: string;
  activityType: ActivityType | '';
  specialtyCourse: string;
  requestedDate: string;
  requestedTime: string;
  numberOfPeople: string;
  source: BookingSource | '';
  referrerName: string;
  internalNotes: string;
  customerName: string;
  chineseName: string;
  weChatId: string;
  whatsAppNumber: string;
  email: string;
  phone: string;
  hotel: string;
  preferredLanguage: PreferredLanguage | '';
  heightCm: string;
  weightKg: string;
  shoeSize: string;
  depositStatus: DepositStatus;
  amount: string;
  currency: string;
  paidTo: string;
  paymentMethod: string;
  paymentNotes: string;
  certificationLevel: string;
  certificationAgency: string;
  lastDiveDate: string;
  divesLogged: string;
};

/**
 * Booking intake values after conversion to database-friendly nullable types.
 *
 * @remarks This is the contract between form normalization and the booking
 * creation Server Actions.
 */
export type NormalizedBookingFormValues = {
  rawBookingText: string | null;
  activityType: ActivityType | null;
  specialtyCourse: string | null;
  requestedDate: Date | null;
  requestedTime: string | null;
  numberOfPeople: number | null;
  source: BookingSource | null;
  referrerName: string | null;
  internalNotes: string | null;
  customerName: string | null;
  chineseName: string | null;
  weChatId: string | null;
  whatsAppNumber: string | null;
  email: string | null;
  phone: string | null;
  hotel: string | null;
  preferredLanguage: PreferredLanguage | null;
  heightCm: number | null;
  weightKg: number | null;
  shoeSize: number | null;
  depositStatus: DepositStatus;
  amount: number | null;
  currency: string | null;
  paidTo: string | null;
  paymentMethod: string | null;
  paymentNotes: string | null;
  certificationLevel: string | null;
  certificationAgency: string | null;
  lastDiveDate: Date | null;
  divesLogged: number | null;
};
