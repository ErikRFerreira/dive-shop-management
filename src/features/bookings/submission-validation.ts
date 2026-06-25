/**
 * Purpose: This module provides functions to validate stored booking data before submission.
 * It includes mapping stored booking data to normalized form values and validating the booking intake for any missing,
 * or invalid information.
 *
 * @module features/bookings/submission-validation
 */

import { Currency, DepositStatus } from '@/generated/prisma/enums';

import type { NormalizedBookingFormValues } from './types';
import { validateBookingIntake } from './validation';

type StoredBookingForSubmission = {
  activityType: NormalizedBookingFormValues['activities'][number]['activityType'];
  specialtyCourse: string | null;
  requestedDate: Date | null;
  requestedTime: string | null;
  numberOfPeople: number | null;
  source: NormalizedBookingFormValues['source'];
  referrerName: string | null;
  notes: string | null;
  internalNotes: string | null;
  activities: Array<{
    activityType: NormalizedBookingFormValues['activities'][number]['activityType'];
    specialtyCourse: string | null;
    requestedDate: Date | null;
    requestedTime: string | null;
    notes: string | null;
  }>;
  customers: Array<{
    customerId: string;
    role: NormalizedBookingFormValues['customers'][number]['role'];
    hotelAtBooking: string | null;
    equipmentNeeded: string | null;
    notes: string | null;
    certificationAgency: string | null;
    certificationLevel: string | null;
    lastDiveAt: Date | null;
    heightCm: number | null;
    weightKg: { toString: () => string } | number | null;
    shoeSize: { toString: () => string } | number | null;
    divesLogged: number | null;
    customer: {
      fullName: string | null;
      chineseName: string | null;
      weChatId: string | null;
      whatsAppNumber: string | null;
      email: string | null;
      phone: string | null;
      preferredLanguage: NormalizedBookingFormValues['customers'][number]['preferredLanguage'];
    };
  }>;
  deposits: Array<{
    amount: { toString: () => string } | number | null;
    status: DepositStatus;
    currency: string | null;
    paidTo: string | null;
    paymentMethod: string | null;
    notes: string | null;
  }>;
};

/**
 * Maps a string value to a Currency enum value or returns null if the value is not a valid currency.
 *
 * @param value - The string value to map to a Currency enum value.
 * @returns A Currency enum value if the input is valid, otherwise null.
 */
function currencyOrNull(value: string | null): Currency | null {
  return value !== null && Object.values(Currency).includes(value as Currency)
    ? (value as Currency)
    : null;
}

/**
 * Converts a decimal-like value to a number or returns null if the value is not a valid number.
 *
 * @param value - The value to convert to a number.
 * @returns A number if the input is valid, otherwise null.
 */
function decimalToNumber(value: { toString: () => string } | number | null) {
  if (value === null) return null;

  const number = Number(value.toString());
  return Number.isFinite(number) ? number : null;
}

/**
 * Maps stored booking data to normalized form values for validation and submission.
 *
 * @param booking - The stored booking data to map.
 * @returns The normalized booking form values.
 */
function mapStoredBookingToNormalizedValues(
  booking: StoredBookingForSubmission,
): NormalizedBookingFormValues {
  const activities =
    booking.activities.length > 0
      ? booking.activities
      : [
          {
            activityType: booking.activityType,
            specialtyCourse: booking.specialtyCourse,
            requestedDate: booking.requestedDate,
            requestedTime: booking.requestedTime,
            notes: null,
          },
        ];
  const deposit = booking.deposits[0];

  return {
    rawBookingText: booking.notes,
    activities: activities.map((activity) => ({
      activityType: activity.activityType,
      specialtyCourse: activity.specialtyCourse,
      requestedDate: activity.requestedDate,
      requestedTime: activity.requestedTime,
      notes: activity.notes,
    })),
    numberOfPeople: booking.numberOfPeople,
    source: booking.source,
    referrerName: booking.referrerName,
    internalNotes: booking.internalNotes,
    customers: booking.customers.map((bookingCustomer) => ({
      customerId: bookingCustomer.customerId,
      role: bookingCustomer.role,
      customerName: bookingCustomer.customer.fullName,
      chineseName: bookingCustomer.customer.chineseName,
      weChatId: bookingCustomer.customer.weChatId,
      whatsAppNumber: bookingCustomer.customer.whatsAppNumber,
      email: bookingCustomer.customer.email,
      phone: bookingCustomer.customer.phone,
      hotelAtBooking: bookingCustomer.hotelAtBooking,
      equipmentNeeded: bookingCustomer.equipmentNeeded,
      customerNotes: bookingCustomer.notes,
      preferredLanguage: bookingCustomer.customer.preferredLanguage,
      heightCm: bookingCustomer.heightCm,
      weightKg: decimalToNumber(bookingCustomer.weightKg),
      shoeSize: decimalToNumber(bookingCustomer.shoeSize),
      certificationLevel: bookingCustomer.certificationLevel,
      certificationAgency: bookingCustomer.certificationAgency,
      lastDiveDate: bookingCustomer.lastDiveAt,
      divesLogged: bookingCustomer.divesLogged,
    })),
    depositStatus: deposit?.status ?? DepositStatus.UNKNOWN,
    amount: decimalToNumber(deposit?.amount ?? null),
    currency: currencyOrNull(deposit?.currency ?? null),
    paidTo: deposit?.paidTo ?? null,
    paymentMethod: deposit?.paymentMethod ?? null,
    paymentNotes: deposit?.notes ?? null,
  };
}

/**
 * Validates a stored booking for submission by mapping it to normalized form values and checking for any missing or invalid information.
 *
 * @param booking - The stored booking data to validate.
 * @returns An array of warning messages for any missing or invalid information.
 */
export function validateStoredBookingForSubmission(
  booking: StoredBookingForSubmission,
) {
  return validateBookingIntake(
    mapStoredBookingToNormalizedValues(booking),
    'submit',
  );
}
