/** Maps browser booking form values to database-friendly values. */

import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  Currency,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';
import type { BookingFormValues, NormalizedBookingFormValues } from './types';
import type { BookingDetailsItem } from './queries';

function nullableText(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

function nullableNumber(value: string) {
  const normalized = nullableText(value);
  if (!normalized) return null;

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function nullableInteger(value: string) {
  const number = nullableNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

function nullableDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function enumValue<T extends Record<string, string>>(
  values: T,
  value: string,
): T[keyof T] | null {
  return Object.values(values).includes(value) ? (value as T[keyof T]) : null;
}

function formDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : '';
}

function formNumber(value: { toString: () => string } | number | null) {
  return value === null ? '' : value.toString();
}

function formEnumValue<T extends Record<string, string>>(
  values: T,
  value: string | null,
): T[keyof T] | '' {
  return value !== null && Object.values(values).includes(value)
    ? (value as T[keyof T])
    : '';
}

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

/** Converts a persisted booking and its relations into browser-safe form values. */
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
