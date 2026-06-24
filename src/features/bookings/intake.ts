/** Normalization and display helpers for booking intake. */

import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  Currency,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';
import type {
  BookingActivityFormValues,
  BookingCustomerFormValues,
  BookingFormValues,
  NormalizedBookingFormValues,
} from './types';

export type {
  BookingActivityFormValues,
  BookingCustomerFormValues,
  BookingFormValues,
  NormalizedBookingFormValues,
} from './types';

export const bookingActivityDefaultValues: BookingActivityFormValues = {
  activityType: '',
  specialtyCourse: '',
  requestedDate: '',
  requestedTime: '',
  notes: '',
};

export const bookingCustomerDefaultValues: BookingCustomerFormValues = {
  role: BookingCustomerRole.PARTICIPANT,
  customerName: '',
  chineseName: '',
  weChatId: '',
  whatsAppNumber: '',
  email: '',
  phone: '',
  hotelAtBooking: '',
  equipmentNeeded: '',
  customerNotes: '',
  preferredLanguage: '',
  heightCm: '',
  weightKg: '',
  shoeSize: '',
  certificationLevel: '',
  certificationAgency: '',
  lastDiveDate: '',
  divesLogged: '',
};

export const bookingFormDefaultValues: BookingFormValues = {
  rawBookingText: '',
  activities: [{ ...bookingActivityDefaultValues }],
  numberOfPeople: '',
  source: '',
  referrerName: '',
  internalNotes: '',
  customers: [
    {
      ...bookingCustomerDefaultValues,
      role: BookingCustomerRole.PRIMARY_CONTACT,
    },
  ],
  depositStatus: DepositStatus.UNKNOWN,
  amount: '',
  currency: '',
  paidTo: '',
  paymentMethod: '',
  paymentNotes: '',
};

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

export function formatEnumLabel(value: string | null | undefined) {
  if (!value) return '—';

  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
