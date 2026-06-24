/**
 * Purpose: This module provides server-side actions for CRUD operations on booking requests and their related intake records.
 *
 * @module features/bookings/actions
 */

'use server';

import { revalidatePath } from 'next/cache';

import { BookingStatus } from '@/generated/prisma/enums';
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
 * @remarks Successful actions revalidate the booking list and return its path
 * so the client can clear browser-only autosave before navigating.
 */
export type CreateBookingActionResult =
  | { success: true; redirectTo: '/bookings' }
  | {
      success: false;
      fieldErrors: BookingIntakeFieldErrors;
      formError?: string;
    };

/**
 * Persists one booking request and its related intake records atomically.
 *
 * @param values - Browser-safe booking intake values to normalize and persist.
 * @param status - The workflow status assigned when the booking is created.
 * @returns A validation or authorization failure result, or the booking-list
 * path for client-side navigation after a successful write.
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
      formError: 'You do not have permission to create booking requests.',
    };
  }

  const bookingValues = normalizeBookingFormValues(values);

  const validation = validateBookingIntake(
    bookingValues,
    status === BookingStatus.DRAFT ? 'draft' : 'submit',
  );

  if (!validation.success) {
    return {
      success: false,
      fieldErrors: validation.fieldErrors,
      formError: validation.formErrors[0],
    };
  }

  await db.$transaction(async (transaction) => {
    const firstActivity = bookingValues.activities[0];
    const bookingRequest = await transaction.bookingRequest.create({
      data: {
        status,
        activityType: firstActivity?.activityType ?? null,
        specialtyCourse: firstActivity?.specialtyCourse ?? null,
        source: bookingValues.source,
        requestedDate: firstActivity?.requestedDate ?? null,
        requestedTime: firstActivity?.requestedTime ?? null,
        numberOfPeople: bookingValues.numberOfPeople,
        referrerName: bookingValues.referrerName,
        notes: bookingValues.rawBookingText,
        internalNotes: bookingValues.internalNotes,
        createdById: currentUser.id,
        activities: {
          create: bookingValues.activities.map((activity, sortOrder) => ({
            activityType: activity.activityType,
            specialtyCourse: activity.specialtyCourse,
            requestedDate: activity.requestedDate,
            requestedTime: activity.requestedTime,
            notes: activity.notes,
            sortOrder,
          })),
        },
      },
    });

    await Promise.all(
      bookingValues.customers.map(async (bookingCustomer) => {
        const customer = await transaction.customer.create({
          data: {
            fullName: bookingCustomer.customerName,
            chineseName: bookingCustomer.chineseName,
            weChatId: bookingCustomer.weChatId,
            whatsAppNumber: bookingCustomer.whatsAppNumber,
            email: bookingCustomer.email,
            phone: bookingCustomer.phone,
            preferredLanguage: bookingCustomer.preferredLanguage,
          },
        });

        await transaction.bookingCustomer.create({
          data: {
            bookingRequestId: bookingRequest.id,
            customerId: customer.id,
            role: bookingCustomer.role,
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
          },
        });
      }),
    );

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
  });

  revalidatePath('/bookings');
  return { success: true, redirectTo: '/bookings' };
}

/**
 * Creates a draft booking request for the current Customer Service user.
 *
 * @param values - Intake form values to persist as a draft.
 * @returns A validation or authorization failure result, or the booking-list
 * path after a successful write.
 */
export async function createBookingDraft(
  values: BookingFormValues,
): Promise<CreateBookingActionResult> {
  return createBooking(values, BookingStatus.DRAFT);
}

/**
 * Creates a booking request that is ready for administrative review.
 *
 * @param values - Intake form values to persist as pending approval.
 * @returns A validation or authorization failure result, or the booking-list
 * path after a successful write.
 */
export async function submitBookingForApproval(
  values: BookingFormValues,
): Promise<CreateBookingActionResult> {
  return createBooking(values, BookingStatus.PENDING_APPROVAL);
}
