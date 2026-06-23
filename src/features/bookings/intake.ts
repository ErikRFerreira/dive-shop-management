import {
  ActivityType,
  BookingSource,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';
import type {
  BookingFormValues,
  NormalizedBookingFormValues,
} from './types';

export type { BookingFormValues, NormalizedBookingFormValues } from './types';

/**
 * Default values for the booking intake form.
 *
 * @remarks Shared by the React Hook Form instance and localStorage restore
 * flow so missing saved fields always receive safe defaults.
 */
export const bookingFormDefaultValues: BookingFormValues = {
  rawBookingText: '',
  activityType: '',
  requestedDate: '',
  requestedTime: '',
  numberOfPeople: '',
  source: '',
  referrerName: '',
  internalNotes: '',
  customerName: '',
  chineseName: '',
  weChatId: '',
  whatsAppNumber: '',
  email: '',
  phone: '',
  hotel: '',
  preferredLanguage: '',
  equipmentNeeded: false,
  heightCm: '',
  weightKg: '',
  shoeSize: '',
  maskNotes: '',
  depositStatus: DepositStatus.UNKNOWN,
  amount: '',
  currency: '',
  paidTo: '',
  paymentMethod: '',
  paymentNotes: '',
  certificationLevel: '',
  certificationAgency: '',
  lastDiveDate: '',
  divesLogged: '',
};

function nullableText(value: string) {
  const normalized = value.trim();

  return normalized || null;
}

function nullableNumber(value: string) {
  const normalized = nullableText(value);

  if (!normalized) {
    return null;
  }

  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function nullableInteger(value: string) {
  const number = nullableNumber(value);

  return number !== null && Number.isInteger(number) ? number : null;
}

function nullableDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function enumValue<T extends Record<string, string>>(
  values: T,
  value: string,
): T[keyof T] | null {
  return Object.values(values).includes(value) ? (value as T[keyof T]) : null;
}

/**
 * Converts browser form values to nullable database-friendly values.
 *
 * @param values - Raw values maintained by the booking intake form.
 * @returns Values with empty strings and invalid numeric/date input normalized.
 */
export function normalizeBookingFormValues(
  values: BookingFormValues,
): NormalizedBookingFormValues {
  return {
    rawBookingText: nullableText(values.rawBookingText),
    activityType: enumValue(ActivityType, values.activityType),
    requestedDate: nullableDate(values.requestedDate),
    requestedTime: nullableText(values.requestedTime),
    numberOfPeople: nullableInteger(values.numberOfPeople),
    source: enumValue(BookingSource, values.source),
    referrerName: nullableText(values.referrerName),
    internalNotes: nullableText(values.internalNotes),
    customerName: nullableText(values.customerName),
    chineseName: nullableText(values.chineseName),
    weChatId: nullableText(values.weChatId),
    whatsAppNumber: nullableText(values.whatsAppNumber),
    email: nullableText(values.email),
    phone: nullableText(values.phone),
    hotel: nullableText(values.hotel),
    preferredLanguage: enumValue(
      PreferredLanguage,
      values.preferredLanguage,
    ),
    equipmentNeeded: values.equipmentNeeded,
    heightCm: nullableInteger(values.heightCm),
    weightKg: nullableNumber(values.weightKg),
    shoeSize: nullableNumber(values.shoeSize),
    maskNotes: nullableText(values.maskNotes),
    depositStatus:
      enumValue(DepositStatus, values.depositStatus) ?? DepositStatus.UNKNOWN,
    amount: nullableNumber(values.amount),
    currency: nullableText(values.currency),
    paidTo: nullableText(values.paidTo),
    paymentMethod: nullableText(values.paymentMethod),
    paymentNotes: nullableText(values.paymentNotes),
    certificationLevel: nullableText(values.certificationLevel),
    certificationAgency: nullableText(values.certificationAgency),
    lastDiveDate: nullableDate(values.lastDiveDate),
    divesLogged: nullableInteger(values.divesLogged),
  };
}

/**
 * Returns whether a deposit record contains information worth persisting.
 *
 * @param values - Normalized deposit fields from the intake form.
 * @returns `true` if a non-default status or any deposit detail is present.
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
 * Formats an enum value for a human-readable form label.
 *
 * @param value - The underscore-separated enum value to format.
 * @returns A title-cased label, or an em dash when the value is absent.
 */
export function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
