/**
 * Purpose: This module provides server-side actions for CRUD operations on booking requests and their related intake records.
 *
 * @module features/bookings/actions
 */

'use server';

import { revalidatePath } from 'next/cache';

import { BookingCustomerRole, BookingStatus } from '@/generated/prisma/enums';
import {
  hasMeaningfulDeposit,
  normalizeBookingFormValues,
} from '@/features/bookings/intake';
import { db } from '@/lib/db';
import { requireCurrentUser } from '@/lib/current-user';

import { canCreateBookingRequest } from './permissions';
import type { BookingFormValues } from './types';
import {
  validateBookingIntake,
  type BookingIntakeFieldErrors,
} from './validation';

/**
 * Result returned to the intake form after a booking creation attempt.
 *
 * @remarks Actions return a result instead of redirecting so the client can
 * clear its browser-only autosave only after a successful write.
 */
export type CreateBookingActionResult =
  | { success: true; bookingId: string }
  | {
      success: false;
      fieldErrors: BookingIntakeFieldErrors;
      formErrors: string[];
    };

/**
 * Persists one booking request and its related intake records atomically.
 *
 * @param values - Browser-safe booking intake values to normalize and persist.
 * @param status - The workflow status assigned when the booking is created.
 * @returns A success result containing the booking ID, or an authorization
 * failure result.
 */
async function createBooking(
  values: BookingFormValues,
  status: typeof BookingStatus.DRAFT | typeof BookingStatus.PENDING_APPROVAL,
): Promise<CreateBookingActionResult> {
  const currentUser = await requireCurrentUser();

  if (!canCreateBookingRequest(currentUser)) {
    return {
      success: false,
      fieldErrors: {},
      formErrors: ['You do not have permission to create booking requests.'],
    };
  }

  const bookingValues = normalizeBookingFormValues(values);

  const validation = validateBookingIntake(
    bookingValues,
    status === BookingStatus.DRAFT ? 'draft' : 'submit',
  );

  if (!validation.success) {
    return validation;
  }

  const booking = await db.$transaction(async (transaction) => {
    const bookingRequest = await transaction.bookingRequest.create({
      data: {
        status,
        activityType: bookingValues.activityType,
        specialtyCourse: bookingValues.specialtyCourse,
        source: bookingValues.source,
        requestedDate: bookingValues.requestedDate,
        requestedTime: bookingValues.requestedTime,
        numberOfPeople: bookingValues.numberOfPeople,
        referrerName: bookingValues.referrerName,
        notes: bookingValues.rawBookingText,
        internalNotes: bookingValues.internalNotes,
        createdById: currentUser.id,
      },
    });

    const customer = await transaction.customer.create({
      data: {
        fullName: bookingValues.customerName,
        chineseName: bookingValues.chineseName,
        weChatId: bookingValues.weChatId,
        whatsAppNumber: bookingValues.whatsAppNumber,
        email: bookingValues.email,
        phone: bookingValues.phone,
        hotel: bookingValues.hotel,
        preferredLanguage: bookingValues.preferredLanguage,
      },
    });

    await transaction.bookingCustomer.create({
      data: {
        bookingRequestId: bookingRequest.id,
        customerId: customer.id,
        role: BookingCustomerRole.PRIMARY_CONTACT,
        certificationAgency: bookingValues.certificationAgency,
        certificationLevel: bookingValues.certificationLevel,
        lastDiveAt: bookingValues.lastDiveDate,
        heightCm: bookingValues.heightCm,
        weightKg: bookingValues.weightKg,
        shoeSize: bookingValues.shoeSize,
        divesLogged: bookingValues.divesLogged,
      },
    });

    if (hasMeaningfulDeposit(bookingValues)) {
      await transaction.deposit.create({
        data: {
          bookingRequestId: bookingRequest.id,
          amount: bookingValues.amount,
          status: bookingValues.depositStatus,
          currency: bookingValues.currency,
          paidTo: bookingValues.paidTo,
          paymentMethod: bookingValues.paymentMethod,
          notes: bookingValues.paymentNotes,
        },
      });
    }

    return bookingRequest;
  });

  revalidatePath('/bookings');

  return { success: true, bookingId: booking.id };
}

/**
 * Creates a draft booking request for the current Customer Service user.
 *
 * @param values - Intake form values to persist as a draft.
 * @returns The creation outcome and booking identifier on success.
 */
export async function createDraftBooking(
  values: BookingFormValues,
): Promise<CreateBookingActionResult> {
  return createBooking(values, BookingStatus.DRAFT);
}

/**
 * Creates a booking request that is ready for administrative review.
 *
 * @param values - Intake form values to persist as pending approval.
 * @returns The creation outcome and booking identifier on success.
 */
export async function submitBookingForApproval(
  values: BookingFormValues,
): Promise<CreateBookingActionResult> {
  return createBooking(values, BookingStatus.PENDING_APPROVAL);
}
