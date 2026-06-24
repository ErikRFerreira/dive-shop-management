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

import {
  canCreateBookingRequest,
  canPerformBookingStatusTransition,
  canResubmitBookingForApproval,
  canReviewBookingRequest,
} from './permissions';
import { assertCanTransitionBookingStatus } from './status';
import type { BookingFormValues } from './types';
import {
  markBookingNeedsMoreInfoSchema,
  resubmitBookingForApprovalSchema,
  validateBookingIntake,
  type BookingIntakeFieldErrors,
} from './validation';
import { redirect } from 'next/navigation';

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

/** Result shape consumed by the focused booking workflow forms. */
export type BookingWorkflowActionState = {
  fieldErrors?: Record<string, string[]>;
  formError?: string;
};

export const initialBookingWorkflowActionState: BookingWorkflowActionState = {};

function getValidationErrors(error: {
  flatten: () => {
    fieldErrors: Record<string, string[] | undefined>;
    formErrors: string[];
  };
}): BookingWorkflowActionState {
  const flattened = error.flatten();
  const fieldErrors = Object.fromEntries(
    Object.entries(flattened.fieldErrors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );

  return {
    fieldErrors,
    formError: flattened.formErrors[0],
  };
}

function revalidateBookingWorkflowPaths(bookingId: string) {
  revalidatePath('/bookings');
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath(`/bookings/${bookingId}/review`);
}

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

/**
 * Records the administrator's reason for returning a pending booking request.
 *
 * The expected status is included in both the read and write path so a stale
 * form cannot overwrite a decision made by another reviewer.
 */
export async function markBookingNeedsMoreInfo(
  _previousState: BookingWorkflowActionState,
  formData: FormData,
): Promise<BookingWorkflowActionState> {
  const validation = markBookingNeedsMoreInfoSchema.safeParse({
    bookingId: formData.get('bookingId'),
    needsMoreInfoReason: formData.get('needsMoreInfoReason'),
  });

  if (!validation.success) {
    return getValidationErrors(validation.error);
  }

  const currentUser = await requireCurrentUser();

  if (!canReviewBookingRequest(currentUser)) {
    return {
      formError: 'You do not have permission to request more information.',
    };
  }

  const booking = await db.bookingRequest.findUnique({
    where: { id: validation.data.bookingId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!booking) {
    return { formError: 'Booking request not found.' };
  }

  if (booking.status !== BookingStatus.PENDING_APPROVAL) {
    return {
      formError: 'Only pending approval bookings can be marked as needing more information.',
    };
  }

  if (
    !canPerformBookingStatusTransition(
      currentUser,
      booking.status,
      BookingStatus.NEEDS_MORE_INFO,
    )
  ) {
    return {
      formError: 'You do not have permission to request more information.',
    };
  }

  assertCanTransitionBookingStatus(
    booking.status,
    BookingStatus.NEEDS_MORE_INFO,
  );

  const result = await db.bookingRequest.updateMany({
    where: {
      id: booking.id,
      status: BookingStatus.PENDING_APPROVAL,
    },
    data: {
      status: BookingStatus.NEEDS_MORE_INFO,
      needsMoreInfoReason: validation.data.needsMoreInfoReason,
    },
  });

  if (result.count !== 1) {
    return {
      formError: 'This booking was updated by another user. Refresh and try again.',
    };
  }

  revalidateBookingWorkflowPaths(booking.id);
  redirect(`/bookings/${booking.id}`);
}

/**
 * Returns a booking to the pending approval queue after the requested details
 * have been addressed. The existing reason remains available for context.
 */
export async function resubmitBookingForApproval(
  _previousState: BookingWorkflowActionState,
  formData: FormData,
): Promise<BookingWorkflowActionState> {
  const validation = resubmitBookingForApprovalSchema.safeParse({
    bookingId: formData.get('bookingId'),
  });

  if (!validation.success) {
    return getValidationErrors(validation.error);
  }

  const currentUser = await requireCurrentUser();
  const booking = await db.bookingRequest.findUnique({
    where: { id: validation.data.bookingId },
    select: {
      id: true,
      status: true,
      createdById: true,
    },
  });

  if (!booking) {
    return { formError: 'Booking request not found.' };
  }

  if (booking.status !== BookingStatus.NEEDS_MORE_INFO) {
    return {
      formError: 'Only bookings needing more information can be resubmitted.',
    };
  }

  if (
    !canPerformBookingStatusTransition(
      currentUser,
      booking.status,
      BookingStatus.PENDING_APPROVAL,
    ) ||
    !canResubmitBookingForApproval(currentUser, booking.createdById)
  ) {
    return { formError: 'You do not have permission to resubmit this booking.' };
  }

  assertCanTransitionBookingStatus(
    booking.status,
    BookingStatus.PENDING_APPROVAL,
  );

  const result = await db.bookingRequest.updateMany({
    where: {
      id: booking.id,
      status: BookingStatus.NEEDS_MORE_INFO,
    },
    data: {
      status: BookingStatus.PENDING_APPROVAL,
    },
  });

  if (result.count !== 1) {
    return {
      formError: 'This booking was updated by another user. Refresh and try again.',
    };
  }

  revalidateBookingWorkflowPaths(booking.id);
  redirect(`/bookings/${booking.id}`);
}
