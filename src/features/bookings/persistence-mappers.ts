/**
 * Purpose: This file contains functions to map booking-related form values to
 * the corresponding data structures used for persistence in the database.
 *
 * @module features/bookings/persistence-mappers
 */

import { ScheduleTimeSlot } from '@/generated/prisma/enums';

import type { NormalizedBookingFormValues } from './types';

/**
 * Maps normalized booking form values to the data structure used for creating a booking request.
 *
 * @param bookingValues - The normalized booking form values.
 * @returns An object containing the mapped booking request data.
 */
export function mapBookingRequestIntakeData(
  bookingValues: NormalizedBookingFormValues,
) {
  const firstActivity = bookingValues.activities[0];

  return {
    activityType: firstActivity?.activityType ?? null,
    specialtyCourse: firstActivity?.specialtyCourse ?? null,
    source: bookingValues.source,
    requestedDate: firstActivity?.requestedDate ?? null,
    requestedTime: firstActivity?.requestedTime ?? null,
    requestedTimeSlot: firstActivity?.requestedTimeSlot ?? ScheduleTimeSlot.TBD,
    numberOfPeople: bookingValues.numberOfPeople,
    referrerName: bookingValues.referrerName,
    notes: bookingValues.rawBookingText,
    internalNotes: bookingValues.internalNotes,
  };
}

/**
 * Maps a single booking activity to the data structure used for creating a booking activity.
 *
 * @param activity - The normalized booking activity form values.
 * @param sortOrder - The sort order of the activity within the booking request.
 * @returns An object containing the mapped booking activity data.
 */
export function mapBookingActivityCreateData(
  activity: NormalizedBookingFormValues['activities'][number],
  sortOrder: number,
) {
  return {
    activityType: activity.activityType,
    specialtyCourse: activity.specialtyCourse,
    durationDays: activity.durationDays,
    requestedDate: activity.requestedDate,
    requestedTime: activity.requestedTime,
    requestedTimeSlot: activity.requestedTimeSlot,
    notes: activity.notes,
    sortOrder,
  };
}

/**
 * Maps multiple booking activities to the data structure used for creating booking activities.
 *
 * @param bookingRequestId - The ID of the booking request.
 * @param activities - The normalized booking activity form values.
 * @returns An array of objects containing the mapped booking activity data.
 */
export function mapBookingActivityCreateManyData(
  bookingRequestId: string,
  activities: NormalizedBookingFormValues['activities'],
) {
  return activities.map((activity, sortOrder) => ({
    bookingRequestId,
    ...mapBookingActivityCreateData(activity, sortOrder),
  }));
}

/**
 * Maps a single booking customer to the data structure used for creating a booking customer.
 * The participation status is supplied by form normalization so the denormalized
 * booking participant count and join rows stay consistent.
 *
 * @param bookingCustomer - The normalized booking customer form values.
 * @returns An object containing the mapped booking customer data.
 */
export function mapCustomerData(
  bookingCustomer: NormalizedBookingFormValues['customers'][number],
) {
  return {
    fullName: bookingCustomer.customerName,
    chineseName: bookingCustomer.chineseName,
    weChatId: bookingCustomer.weChatId,
    whatsAppNumber: bookingCustomer.whatsAppNumber,
    email: bookingCustomer.email,
    phone: bookingCustomer.phone,
    preferredLanguage: bookingCustomer.preferredLanguage,
  };
}

/**
 * Maps multiple booking customers to the data structure used for creating booking customers.
 *
 * @param bookingRequestId - The ID of the booking request.
 * @param bookingCustomers - The normalized booking customer form values.
 * @param customerIds - An array of customer IDs corresponding to the booking customers.
 * @returns An array of objects containing the mapped booking customer data.
 */
export function mapBookingCustomerCreateManyData(
  bookingRequestId: string,
  bookingCustomers: NormalizedBookingFormValues['customers'],
  customerIds: string[],
) {
  return bookingCustomers.map((bookingCustomer, index) => ({
    bookingRequestId,
    customerId: customerIds[index],
    role: bookingCustomer.role,
    participationStatus: bookingCustomer.participationStatus,
    hotelAtBooking: bookingCustomer.hotelAtBooking,
    equipmentNeeded: bookingCustomer.equipmentNeeded,
    notes: bookingCustomer.customerNotes,
    certificationAgency: bookingCustomer.certificationAgency,
    certificationLevel: bookingCustomer.certificationLevel,
    lastDiveAt: bookingCustomer.lastDiveDate,
    heightCm: bookingCustomer.heightCm,
    weightKg: bookingCustomer.weightKg,
    shoeSize: bookingCustomer.shoeSize,
    divesLogged: bookingCustomer.divesLogged,
  }));
}

/**
 * Maps deposit-related booking values to the data structure used for creating a deposit.
 *
 * @param bookingValues - The normalized booking form values.
 * @returns An object containing the mapped deposit data.
 */
export function mapDepositData(
  bookingValues: Pick<
    NormalizedBookingFormValues,
    | 'amount'
    | 'depositStatus'
    | 'currency'
    | 'paidTo'
    | 'paymentMethod'
    | 'paymentNotes'
  >,
) {
  return {
    amount: bookingValues.amount,
    status: bookingValues.depositStatus,
    currency: bookingValues.currency,
    paidTo: bookingValues.paidTo,
    paymentMethod: bookingValues.paymentMethod,
    notes: bookingValues.paymentNotes,
  };
}
