/**
 * Purpose: This module contains functions for mapping between booking form values and normalized booking data structures.
 *
 * @module features/bookings/form-mappers
 *
 */

import {
  ActivityType,
  BookingCustomerRole,
  BookingParticipantStatus,
  BookingSource,
  Currency,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';
import { formatDateInputValue } from '@/lib/format';
import { bookingCustomerDefaultValues } from './form-values';
import type {
  BookingCustomerFormValues,
  BookingFormValues,
  NormalizedBookingFormValues,
} from './types';
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
 * Normalizes equipment-needed form values into the current controlled choices.
 *
 * The persisted field used to accept free text. Any non-empty legacy value is
 * treated as `YES` so editing and resaving old bookings does not retain
 * arbitrary equipment notes in the controlled field.
 *
 * @param value - Current browser form value for equipment needed.
 * @returns `YES`, `NO`, or null for unknown/unset.
 */
function normalizedEquipmentNeeded(value: string) {
  const normalized = nullableText(value);
  if (normalized === null) return null;
  return normalized === 'NO' ? 'NO' : 'YES';
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
 * Checks whether a normalized customer row identifies a real customer record.
 *
 * Draft forms always contain one blank customer row for UI convenience. Only
 * existing customer links or rows with customer identity/contact fields should
 * be persisted as Customer records.
 *
 * @param customer - Normalized booking customer row from the intake form.
 * @returns `true` when the row should be persisted and linked to the booking.
 */
export function hasPersistableBookingCustomer(
  customer: NormalizedBookingFormValues['customers'][number],
) {
  return Boolean(
    customer.customerId ||
      customer.customerName ||
      customer.chineseName ||
      customer.weChatId ||
      customer.whatsAppNumber ||
      customer.email ||
      customer.phone,
  );
}

/**
 * Removes blank or booking-specific-only customer rows before persistence.
 *
 * @param values - Normalized booking intake values.
 * @returns Booking values with only customer rows that can map to real Customer records.
 */
export function filterPersistableBookingCustomers(
  values: NormalizedBookingFormValues,
): NormalizedBookingFormValues {
  return {
    ...values,
    customers: values.customers.filter(hasPersistableBookingCustomer),
  };
}

/**
 * Counts normalized customer rows that will be persisted as active participants.
 *
 * @param customers - Normalized booking customer rows from the intake form.
 * @returns Number of persistable rows whose participation status is active.
 */
function getDerivedActiveParticipantCount(
  customers: NormalizedBookingFormValues['customers'],
) {
  return customers.filter(
    (customer) =>
      customer.participationStatus === BookingParticipantStatus.ACTIVE &&
      hasPersistableBookingCustomer(customer),
  ).length;
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
  const customers = values.customers.map((customer) => ({
    customerId: nullableText(customer.customerId ?? '') ?? undefined,
    role:
      enumValue(BookingCustomerRole, customer.role) ??
      BookingCustomerRole.PARTICIPANT,
    participationStatus: BookingParticipantStatus.ACTIVE,
    customerName: nullableText(customer.customerName),
    chineseName: nullableText(customer.chineseName),
    weChatId: nullableText(customer.weChatId),
    whatsAppNumber: nullableText(customer.whatsAppNumber),
    email: nullableText(customer.email),
    phone: nullableText(customer.phone),
    hotelAtBooking: nullableText(customer.hotelAtBooking),
    equipmentNeeded: normalizedEquipmentNeeded(customer.equipmentNeeded),
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
  }));

  return {
    rawBookingText: nullableText(values.rawBookingText),
    activities: values.activities.map((activity) => ({
      activityType: enumValue(ActivityType, activity.activityType),
      specialtyCourse: nullableText(activity.specialtyCourse),
      requestedDate: nullableDate(activity.requestedDate),
      requestedTime: nullableText(activity.requestedTime),
      notes: nullableText(activity.notes),
    })),
    numberOfPeople: getDerivedActiveParticipantCount(customers),
    source: enumValue(BookingSource, values.source),
    referrerName: nullableText(values.referrerName),
    internalNotes: nullableText(values.internalNotes),
    customers,
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
 * Checks whether a persisted linked customer is an empty placeholder row.
 *
 * Blank placeholder customers were created by earlier draft saves. They should
 * not be shown as linked existing customers when reopening a booking for edit.
 *
 * @param bookingCustomer - Persisted booking/customer relation from the details query.
 * @returns `true` when neither the customer profile nor booking-specific row has data.
 */
function isBlankLinkedBookingCustomer(
  bookingCustomer: BookingDetailsItem['customers'][number],
) {
  return [
    bookingCustomer.customer.fullName,
    bookingCustomer.customer.chineseName,
    bookingCustomer.customer.weChatId,
    bookingCustomer.customer.whatsAppNumber,
    bookingCustomer.customer.email,
    bookingCustomer.customer.phone,
    bookingCustomer.customer.preferredLanguage,
    bookingCustomer.hotelAtBooking,
    bookingCustomer.equipmentNeeded,
    bookingCustomer.notes,
    bookingCustomer.certificationAgency,
    bookingCustomer.certificationLevel,
    bookingCustomer.lastDiveAt,
    bookingCustomer.heightCm,
    bookingCustomer.weightKg,
    bookingCustomer.shoeSize,
    bookingCustomer.divesLogged,
  ].every((value) => value === null || value === '');
}

/**
 * Converts one persisted booking/customer relation into editable form values.
 *
 * @param bookingCustomer - Persisted booking/customer relation from the details query.
 * @returns Browser-safe customer form values for one row.
 */
function mapBookingCustomerToFormValues(
  bookingCustomer: BookingDetailsItem['customers'][number],
): BookingCustomerFormValues {
  return {
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
  };
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
  const customerValues = booking.customers
    .filter((bookingCustomer) => !isBlankLinkedBookingCustomer(bookingCustomer))
    .map(mapBookingCustomerToFormValues);

  return {
    rawBookingText: booking.notes ?? '',
    activities: activities.map((activity) => ({
      activityType: activity.activityType ?? '',
      specialtyCourse: activity.specialtyCourse ?? '',
      requestedDate: formDate(activity.requestedDate),
      requestedTime: activity.requestedTime ?? '',
      notes: activity.notes ?? '',
    })),
    source: booking.source ?? '',
    referrerName: booking.referrerName ?? '',
    internalNotes: booking.internalNotes ?? '',
    customers:
      customerValues.length > 0
        ? customerValues
        : [
            {
              ...bookingCustomerDefaultValues,
              role: BookingCustomerRole.PRIMARY_CONTACT,
            },
          ],
    depositStatus: deposit?.status ?? DepositStatus.UNKNOWN,
    amount: formNumber(deposit?.amount ?? null),
    currency: formEnumValue(Currency, deposit?.currency ?? null),
    paidTo: deposit?.paidTo ?? '',
    paymentMethod: deposit?.paymentMethod ?? '',
    paymentNotes: deposit?.notes ?? '',
  };
}
