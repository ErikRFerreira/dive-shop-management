/**
 * Purpose: This module contains functions for mapping between booking form values and normalized booking data structures.
 *
 * @module features/bookings/form-mappers
 *
 */

import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  Currency,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';
import { formatDateInputValue } from '@/lib/format';
import type { BookingFormValues, NormalizedBookingFormValues } from './types';
import type { BookingDetailsItem } from './queries';

/**
 * Normalizes a string value to either a trimmed string or null if the string is empty.
 *
 * @param value - The string value to normalize.
 * @returns The normalized string or null if the string is empty.
 */
function nullableText(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

/**
 * Normalizes a string value to either a number or null if the string is empty or not a valid number.
 *
 * @param value - The string value to normalize.
 * @returns The normalized number or null if the string is empty or not a valid number.
 */
function nullableNumber(value: string) {
  const normalized = nullableText(value);
  if (!normalized) return null;

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

/**
 * Normalizes a string value to either an integer or null if the string is empty or not a valid integer.
 *
 * @param value - The string value to normalize.
 * @returns The normalized integer or null if the string is empty or not a valid integer.
 */
function nullableInteger(value: string) {
  const number = nullableNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

/**
 * Normalizes a string value to either a Date object or null if the string is empty or not a valid date.
 *
 * @param value - The string value to normalize.
 * @returns The normalized Date object or null if the string is empty or not a valid date.
 */
function nullableDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Returns the corresponding enum value if it exists, otherwise null.
 *
 * @param values - The enum values to check against.
 * @param value - The string value to normalize.
 * @returns The corresponding enum value or null if it doesn't exist.
 */
function enumValue<T extends Record<string, string>>(
  values: T,
  value: string,
): T[keyof T] | null {
  return Object.values(values).includes(value) ? (value as T[keyof T]) : null;
}

/**
 * Formats a Date object to a string in the format YYYY-MM-DD.
 *
 * @param value - The Date object to format.
 * @returns The formatted date string or an empty string if the value is null.
 */
function formDate(value: Date | null) {
  return formatDateInputValue(value) ?? '';
}

/**
 * Formats a number or an object with a toString method to a string.
 *
 * @param value - The number or object to format.
 * @returns The formatted string or an empty string if the value is null.
 */
function formNumber(value: { toString: () => string } | number | null) {
  return value === null ? '' : value.toString();
}

/**
 * Returns the corresponding enum value if it exists, otherwise an empty string.
 *
 * @param values - The enum values to check against.
 * @param value - The string value to normalize.
 * @returns The corresponding enum value or an empty string if it doesn't exist.
 */
function formEnumValue<T extends Record<string, string>>(
  values: T,
  value: string | null,
): T[keyof T] | '' {
  return value !== null && Object.values(values).includes(value)
    ? (value as T[keyof T])
    : '';
}

/**
 * Normalizes the booking form values into a shape suitable for backend processing.
 *
 * @param values - The booking form values to normalize.
 * @returns The normalized booking form values.
 */
export function normalizeBookingFormValues(
  values: BookingFormValues,
): NormalizedBookingFormValues {
  return {
    rawBookingText: nullableText(values.rawBookingText),
    activities: values.activities.map((activity) => ({
      activityType: enumValue(ActivityType, activity.activityType),
      specialtyCourse: nullableText(activity.specialtyCourse),
      requestedDate: nullableDate(activity.requestedDate),
      requestedTime: nullableText(activity.requestedTime),
      notes: nullableText(activity.notes),
    })),
    numberOfPeople: nullableInteger(values.numberOfPeople),
    source: enumValue(BookingSource, values.source),
    referrerName: nullableText(values.referrerName),
    internalNotes: nullableText(values.internalNotes),
    customers: values.customers.map((customer) => ({
      customerId: nullableText(customer.customerId ?? '') ?? undefined,
      role:
        enumValue(BookingCustomerRole, customer.role) ??
        BookingCustomerRole.PARTICIPANT,
      customerName: nullableText(customer.customerName),
      chineseName: nullableText(customer.chineseName),
      weChatId: nullableText(customer.weChatId),
      whatsAppNumber: nullableText(customer.whatsAppNumber),
      email: nullableText(customer.email),
      phone: nullableText(customer.phone),
      hotelAtBooking: nullableText(customer.hotelAtBooking),
      equipmentNeeded: nullableText(customer.equipmentNeeded),
      customerNotes: nullableText(customer.customerNotes),
      preferredLanguage: enumValue(
        PreferredLanguage,
        customer.preferredLanguage,
      ),
      heightCm: nullableInteger(customer.heightCm),
      weightKg: nullableNumber(customer.weightKg),
      shoeSize: nullableNumber(customer.shoeSize),
      certificationLevel: nullableText(customer.certificationLevel),
      certificationAgency: nullableText(customer.certificationAgency),
      lastDiveDate: nullableDate(customer.lastDiveDate),
      divesLogged: nullableInteger(customer.divesLogged),
    })),
    depositStatus:
      enumValue(DepositStatus, values.depositStatus) ?? DepositStatus.UNKNOWN,
    amount: nullableNumber(values.amount),
    currency: enumValue(Currency, values.currency),
    paidTo: nullableText(values.paidTo),
    paymentMethod: nullableText(values.paymentMethod),
    paymentNotes: nullableText(values.paymentNotes),
  };
}

/**
 * Checks if the booking form values contain a meaningful deposit.
 *
 * @param values - The booking form values to check.
 * @returns True if the deposit is meaningful, false otherwise.
 */
export function hasMeaningfulDeposit(
  values: Pick<
    NormalizedBookingFormValues,
    | 'depositStatus'
    | 'amount'
    | 'currency'
    | 'paidTo'
    | 'paymentMethod'
    | 'paymentNotes'
  >,
) {
  return (
    values.depositStatus !== DepositStatus.UNKNOWN ||
    values.amount !== null ||
    values.currency !== null ||
    values.paidTo !== null ||
    values.paymentMethod !== null ||
    values.paymentNotes !== null
  );
}

/**
 * Converts a persisted booking and its relations into browser-safe form values.
 *
 * @param booking - The booking details to convert.
 * @returns The form values suitable for browser usage.
 */
export function mapBookingToFormValues(
  booking: BookingDetailsItem,
): BookingFormValues {
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
    rawBookingText: booking.notes ?? '',
    activities: activities.map((activity) => ({
      activityType: activity.activityType ?? '',
      specialtyCourse: activity.specialtyCourse ?? '',
      requestedDate: formDate(activity.requestedDate),
      requestedTime: activity.requestedTime ?? '',
      notes: activity.notes ?? '',
    })),
    numberOfPeople: formNumber(booking.numberOfPeople),
    source: booking.source ?? '',
    referrerName: booking.referrerName ?? '',
    internalNotes: booking.internalNotes ?? '',
    customers: booking.customers.map((bookingCustomer) => ({
      customerId: bookingCustomer.customerId,
      role: bookingCustomer.role,
      customerName: bookingCustomer.customer.fullName ?? '',
      chineseName: bookingCustomer.customer.chineseName ?? '',
      weChatId: bookingCustomer.customer.weChatId ?? '',
      whatsAppNumber: bookingCustomer.customer.whatsAppNumber ?? '',
      email: bookingCustomer.customer.email ?? '',
      phone: bookingCustomer.customer.phone ?? '',
      hotelAtBooking: bookingCustomer.hotelAtBooking ?? '',
      equipmentNeeded: bookingCustomer.equipmentNeeded ?? '',
      customerNotes: bookingCustomer.notes ?? '',
      preferredLanguage: bookingCustomer.customer.preferredLanguage ?? '',
      heightCm: formNumber(bookingCustomer.heightCm),
      weightKg: formNumber(bookingCustomer.weightKg),
      shoeSize: formNumber(bookingCustomer.shoeSize),
      certificationLevel: bookingCustomer.certificationLevel ?? '',
      certificationAgency: bookingCustomer.certificationAgency ?? '',
      lastDiveDate: formDate(bookingCustomer.lastDiveAt),
      divesLogged: formNumber(bookingCustomer.divesLogged),
    })),
    depositStatus: deposit?.status ?? DepositStatus.UNKNOWN,
    amount: formNumber(deposit?.amount ?? null),
    currency: formEnumValue(Currency, deposit?.currency ?? null),
    paidTo: deposit?.paidTo ?? '',
    paymentMethod: deposit?.paymentMethod ?? '',
    paymentNotes: deposit?.notes ?? '',
  };
}
