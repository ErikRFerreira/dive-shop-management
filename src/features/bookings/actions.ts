/**
 * Purpose: This module provides server-side actions for CRUD operations on booking requests and their related intake records.
 *
 * @module features/bookings/actions
 */

'use server';

import { redirect } from 'next/navigation';

import { BookingStatus } from '@/generated/prisma/enums';
import { normalizeBookingFormValues } from '@/features/bookings/form-mappers';
import { db } from '@/lib/db';
import { requireCurrentUser } from '@/lib/current-user';

import {
  getValidationErrors,
  type BookingWorkflowActionState,
  type CreateBookingActionResult,
  type UpdateBookingActionResult,
} from './action-results';
import {
  revalidateBookingListPath,
  revalidateBookingWorkflowPaths,
  revalidateSchedulePath,
} from './cache';
import {
  createBookingRequestWithIntake,
  loadEditableBooking,
  updateBookingRequestWithIntake,
} from './mutations';
import {
  canApproveBookingRequest,
  canCreateBookingRequest,
  canEditBooking,
  canPerformBookingStatusTransition,
  canResubmitBookingForApproval,
  canReviewBookingRequest,
} from './permissions';
import { assertCanTransitionBookingStatus } from './status';
import { validateStoredBookingForSubmission } from './submission-validation';
import type { BookingFormValues } from './types';
import {
  approveBookingSchema,
  cancelBookingSchema,
  markBookingNeedsMoreInfoSchema,
  resubmitBookingForApprovalSchema,
  updateBookingSchema,
  validateBookingIntake,
} from './validation';

export type {
  BookingWorkflowActionState,
  CreateBookingActionResult,
  UpdateBookingActionResult,
} from './action-results';

/**
 * Persists one booking request and its related intake records atomically.
 *
 * @param status - The workflow status assigned when the booking is created.
 * @returns The validation intent based on the booking status.
 */
function getEditSaveValidationIntent(status: BookingStatus) {
  return status === BookingStatus.PENDING_APPROVAL ? 'submit' : 'draft';
}

type UpdateEditableBookingOptions = {
  expectedStatus?: BookingStatus;
  nextStatus?: BookingStatus;
  validationIntent?: 'draft' | 'submit';
  invalidStatusError?: string;
  permissionError?: string;
  requireResubmitPermission?: boolean;
};

/**
 * Returns existing Customer IDs selected in the submitted booking form.
 *
 * @param bookingValues - Normalized booking form values from the client.
 * @returns Submitted customer IDs, preserving row order and duplicates.
 */
function getSubmittedExistingCustomerIds(
  bookingValues: ReturnType<typeof normalizeBookingFormValues>,
) {
  return bookingValues.customers.flatMap((customer) =>
    customer.customerId ? [customer.customerId] : [],
  );
}

/**
 * Validates that selected existing customers are unique and still exist.
 *
 * @param bookingValues - Normalized booking form values from the client.
 * @returns A form-level error message, or `null` when selected IDs are valid.
 */
async function getSubmittedExistingCustomerIdError(
  bookingValues: ReturnType<typeof normalizeBookingFormValues>,
) {
  const submittedCustomerIds = getSubmittedExistingCustomerIds(bookingValues);
  const hasDuplicateCustomerId =
    new Set(submittedCustomerIds).size !== submittedCustomerIds.length;

  if (hasDuplicateCustomerId) {
    return 'Select each existing customer only once.';
  }

  if (submittedCustomerIds.length === 0) {
    return null;
  }

  const customers = await db.customer.findMany({
    where: {
      id: {
        in: submittedCustomerIds,
      },
    },
    select: {
      id: true,
    },
  });
  const foundCustomerIds = new Set(customers.map((customer) => customer.id));

  return submittedCustomerIds.every((customerId) =>
    foundCustomerIds.has(customerId),
  )
    ? null
    : 'One or more selected customers no longer exist. Refresh and try again.';
}

/**
 * Updates an editable booking and the intake records managed by the booking form.
 *
 * @param bookingId - The ID of the booking request to update.
 * @param values - The browser-safe booking intake values to normalize, validate, and persist.
 * @param options - Optional parameters for expected status, next status, validation intent, and error messages.
 * @returns - A validation, authorization, or stale-update failure result;
 * otherwise the booking detail path for client-side navigation.
 */
async function updateEditableBooking(
  bookingId: string,
  values: BookingFormValues,
  options: UpdateEditableBookingOptions = {},
): Promise<UpdateBookingActionResult> {
  const bookingIdValidation = updateBookingSchema.safeParse({ bookingId });

  if (!bookingIdValidation.success) {
    return {
      success: false,
      fieldErrors: {},
      formError: bookingIdValidation.error.flatten().formErrors[0],
    };
  }

  const currentUser = await requireCurrentUser();
  const booking = await loadEditableBooking(bookingIdValidation.data.bookingId);

  if (!booking) {
    return {
      success: false,
      fieldErrors: {},
      formError: 'Booking request not found.',
    };
  }

  if (options.expectedStatus && booking.status !== options.expectedStatus) {
    return {
      success: false,
      fieldErrors: {},
      formError:
        options.invalidStatusError ??
        'This booking was updated by another user. Refresh and try again.',
    };
  }

  const canEdit = canEditBooking(
    currentUser,
    booking.createdById,
    booking.status,
  );
  const canTransition =
    !options.nextStatus ||
    canPerformBookingStatusTransition(
      currentUser,
      booking.status,
      options.nextStatus,
    ) ||
    (booking.status === BookingStatus.DRAFT && canEdit);
  const canResubmit =
    !options.requireResubmitPermission ||
    canResubmitBookingForApproval(currentUser, booking.createdById);

  if (!canEdit || !canTransition || !canResubmit) {
    return {
      success: false,
      fieldErrors: {},
      formError:
        options.permissionError ??
        'You do not have permission to edit this booking.',
    };
  }

  if (options.nextStatus) {
    assertCanTransitionBookingStatus(booking.status, options.nextStatus);
  }

  const bookingValues = normalizeBookingFormValues(values);
  const validation = validateBookingIntake(
    bookingValues,
    options.validationIntent ?? getEditSaveValidationIntent(booking.status),
  );

  if (!validation.success) {
    return {
      success: false,
      fieldErrors: validation.fieldErrors,
      formError: validation.formErrors[0],
    };
  }

  const customerIdError =
    await getSubmittedExistingCustomerIdError(bookingValues);
  if (customerIdError) {
    return {
      success: false,
      fieldErrors: {},
      formError: customerIdError,
    };
  }

  const didUpdate = await updateBookingRequestWithIntake(
    booking,
    bookingValues,
    options.nextStatus,
  );

  if (!didUpdate) {
    return {
      success: false,
      fieldErrors: {},
      formError:
        'This booking was updated by another user. Refresh and try again.',
    };
  }

  revalidateBookingWorkflowPaths(booking.id);
  return { success: true, redirectTo: `/bookings/${booking.id}` };
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

  const customerIdError =
    await getSubmittedExistingCustomerIdError(bookingValues);
  if (customerIdError) {
    return {
      success: false,
      fieldErrors: {},
      formError: customerIdError,
    };
  }

  await createBookingRequestWithIntake(bookingValues, status, currentUser.id);

  revalidateBookingListPath();
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
 * Updates an editable booking and the intake records managed by the booking form.
 * The action deliberately leaves the booking status and Needs More Info reason
 * unchanged; returning a booking for approval remains a separate workflow step.
 *
 * @param bookingId - Booking request to update.
 * @param values - Browser-safe booking intake values to normalize, validate, and persist.
 * @returns A validation, authorization, or stale-update failure result; otherwise
 * the booking detail path for client-side navigation.
 */
export async function updateBooking(
  bookingId: string,
  values: BookingFormValues,
): Promise<UpdateBookingActionResult> {
  return updateEditableBooking(bookingId, values);
}

/**
 * Saves edits to a draft booking and atomically moves it into the pending
 * approval queue.
 *
 * @param bookingId - Draft booking request to update and submit.
 * @param values - Browser-safe booking intake values to validate with submit rules.
 * @returns A validation, authorization, invalid-status, or stale-update failure
 * result; otherwise the booking detail path for client-side navigation.
 */
export async function submitEditedBookingForApproval(
  bookingId: string,
  values: BookingFormValues,
): Promise<UpdateBookingActionResult> {
  return updateEditableBooking(bookingId, values, {
    expectedStatus: BookingStatus.DRAFT,
    nextStatus: BookingStatus.PENDING_APPROVAL,
    validationIntent: 'submit',
    invalidStatusError: 'Only draft bookings can be submitted for approval.',
    permissionError: 'You do not have permission to submit this booking.',
  });
}

/**
 * Saves edits to a Needs More Info booking and atomically returns it to pending
 * approval.
 *
 * The stored Needs More Info reason is preserved for reviewer context.
 *
 * @param bookingId - Needs More Info booking request to update and resubmit.
 * @param values - Browser-safe booking intake values to validate with submit rules.
 * @returns A validation, authorization, invalid-status, or stale-update failure
 * result; otherwise the booking detail path for client-side navigation.
 */
export async function resubmitEditedBookingForApproval(
  bookingId: string,
  values: BookingFormValues,
): Promise<UpdateBookingActionResult> {
  return updateEditableBooking(bookingId, values, {
    expectedStatus: BookingStatus.NEEDS_MORE_INFO,
    nextStatus: BookingStatus.PENDING_APPROVAL,
    validationIntent: 'submit',
    invalidStatusError:
      'Only bookings needing more information can be resubmitted.',
    permissionError: 'You do not have permission to resubmit this booking.',
    requireResubmitPermission: true,
  });
}

/**
 * Publishes a pending booking to the internal schedule.
 *
 * Approval is the admin review decision that moves a booking directly from
 * Pending Approval to Scheduled for MVP 0.1. The booking status update and
 * ScheduleItem creation must succeed in the same transaction so the system
 * never stores a scheduled booking without a schedule row, or a schedule row
 * for a booking that failed to leave the review queue.
 *
 * @param _previousState - Previous form action state supplied by React.
 * @param formData - Form payload containing the `bookingId` to approve.
 * @returns Field or form errors when validation, permission, status, duplicate
 * schedule, or stale update checks fail. On success, revalidates booking and
 * schedule paths and redirects to the booking detail page.
 */
export async function approveBooking(
  _previousState: BookingWorkflowActionState,
  formData: FormData,
): Promise<BookingWorkflowActionState> {
  const validation = approveBookingSchema.safeParse({
    bookingId: formData.get('bookingId'),
    adminNotes: formData.get('adminNotes'),
  });

  if (!validation.success) {
    return getValidationErrors(validation.error);
  }

  const currentUser = await requireCurrentUser();

  if (!canApproveBookingRequest(currentUser)) {
    return {
      formError: 'You do not have permission to approve this booking.',
    };
  }

  const booking = await db.bookingRequest.findUnique({
    where: { id: validation.data.bookingId },
    select: {
      id: true,
      status: true,
      requestedDate: true,
      requestedTime: true,
      activityType: true,
      internalNotes: true,
      adminNotes: true,
      scheduleItem: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!booking) {
    return { formError: 'Booking request not found.' };
  }

  if (booking.status !== BookingStatus.PENDING_APPROVAL) {
    return {
      formError: 'Only pending approval bookings can be approved.',
    };
  }

  if (booking.scheduleItem) {
    return {
      formError: 'This booking already has a schedule item.',
    };
  }

  if (booking.requestedDate === null) {
    return {
      formError: 'Requested date is required before approving a booking.',
    };
  }

  if (booking.activityType === null) {
    return {
      formError: 'Activity type is required before approving a booking.',
    };
  }

  const requestedDate = booking.requestedDate;
  const activityType = booking.activityType;
  const adminNotes = validation.data.adminNotes;
  const scheduleNotes = adminNotes ?? booking.internalNotes;

  if (
    !canPerformBookingStatusTransition(
      currentUser,
      booking.status,
      BookingStatus.SCHEDULED,
    )
  ) {
    return {
      formError: 'You do not have permission to approve this booking.',
    };
  }

  assertCanTransitionBookingStatus(booking.status, BookingStatus.SCHEDULED);

  const transactionError = await db.$transaction(async (transaction) => {
    const existingScheduleItem = await transaction.scheduleItem.findUnique({
      where: {
        bookingRequestId: booking.id,
      },
      select: {
        id: true,
      },
    });

    if (existingScheduleItem) {
      return {
        formError: 'This booking already has a schedule item.',
      };
    }

    const updateResult = await transaction.bookingRequest.updateMany({
      where: {
        id: booking.id,
        status: BookingStatus.PENDING_APPROVAL,
      },
      data: {
        status: BookingStatus.SCHEDULED,
        adminNotes,
      },
    });

    if (updateResult.count !== 1) {
      return {
        formError:
          'This booking was updated by another user. Refresh and try again.',
      };
    }

    await transaction.scheduleItem.create({
      data: {
        bookingRequestId: booking.id,
        date: requestedDate,
        startTime: booking.requestedTime,
        activityType,
        scheduleNotes,
      },
    });

    return null;
  });

  if (transactionError) {
    return transactionError;
  }

  revalidateBookingWorkflowPaths(booking.id);
  revalidateSchedulePath();
  redirect(`/bookings/${booking.id}`);
}

/**
 * Records the administrator's reason for returning a pending booking request.
 *
 * The expected status is included in both the read and write path so a stale
 * form cannot overwrite a decision made by another reviewer.
 *
 * @param _previousState - Previous form action state supplied by React.
 * @param formData - Form payload containing `bookingId` and `needsMoreInfoReason`.
 * @returns Field or form errors when validation, permission, status, or stale
 * update checks fail. On success, revalidates booking workflow paths and redirects
 * to the booking detail page.
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
      formError:
        'Only pending approval bookings can be marked as needing more information.',
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
      formError:
        'This booking was updated by another user. Refresh and try again.',
    };
  }

  revalidateBookingWorkflowPaths(booking.id);
  redirect(`/bookings/${booking.id}`);
}

/**
 * Cancels a booking request without deleting any related booking, customer,
 * diver, or deposit records.
 *
 * Pending Approval and Needs More Info bookings are removed from the review
 * workflow with a status update. Scheduled bookings are unpublished from the
 * internal schedule in the same transaction as the status change, so a booking
 * cannot remain scheduled after its ScheduleItem is removed.
 *
 * @param _previousState - Previous form action state supplied by React.
 * @param formData - Form payload containing the `bookingId` to cancel.
 * @returns Field or form errors when validation, permission, status, or stale
 * update checks fail. On success, revalidates booking and schedule paths and
 * redirects to the booking detail page.
 */
export async function cancelBooking(
  _previousState: BookingWorkflowActionState,
  formData: FormData,
): Promise<BookingWorkflowActionState> {
  const validation = cancelBookingSchema.safeParse({
    bookingId: formData.get('bookingId'),
    adminNotes: formData.get('adminNotes'),
  });

  if (!validation.success) {
    return getValidationErrors(validation.error);
  }

  const currentUser = await requireCurrentUser();

  if (!canReviewBookingRequest(currentUser)) {
    return {
      formError: 'You do not have permission to cancel this booking.',
    };
  }

  const booking = await db.bookingRequest.findUnique({
    where: { id: validation.data.bookingId },
    select: {
      id: true,
      status: true,
      adminNotes: true,
      scheduleItem: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!booking) {
    return { formError: 'Booking request not found.' };
  }

  if (
    booking.status !== BookingStatus.PENDING_APPROVAL &&
    booking.status !== BookingStatus.NEEDS_MORE_INFO &&
    booking.status !== BookingStatus.SCHEDULED
  ) {
    return {
      formError:
        'Only pending approval, needs more info, or scheduled bookings can be cancelled.',
    };
  }

  if (
    !canPerformBookingStatusTransition(
      currentUser,
      booking.status,
      BookingStatus.CANCELLED,
    )
  ) {
    return {
      formError: 'You do not have permission to cancel this booking.',
    };
  }

  assertCanTransitionBookingStatus(booking.status, BookingStatus.CANCELLED);

  const adminNotes = validation.data.adminNotes;
  const updateData = {
    status: BookingStatus.CANCELLED,
    ...(adminNotes !== null ? { adminNotes } : {}),
  };

  if (booking.status === BookingStatus.SCHEDULED) {
    const transactionError = await db.$transaction(async (transaction) => {
      const result = await transaction.bookingRequest.updateMany({
        where: {
          id: booking.id,
          status: BookingStatus.SCHEDULED,
        },
        data: updateData,
      });

      if (result.count !== 1) {
        return {
          formError:
            'This booking was updated by another user. Refresh and try again.',
        };
      }

      await transaction.scheduleItem.deleteMany({
        where: {
          bookingRequestId: booking.id,
        },
      });

      return null;
    });

    if (transactionError) {
      return transactionError;
    }

    revalidateBookingWorkflowPaths(booking.id);
    revalidateSchedulePath();
    redirect(`/bookings/${booking.id}`);
  }

  const result = await db.bookingRequest.updateMany({
    where: {
      id: booking.id,
      status: booking.status,
    },
    data: updateData,
  });

  if (result.count !== 1) {
    return {
      formError:
        'This booking was updated by another user. Refresh and try again.',
    };
  }

  revalidateBookingWorkflowPaths(booking.id);
  revalidateSchedulePath();
  redirect(`/bookings/${booking.id}`);
}

/**
 * Returns a booking to the pending approval queue after the requested details
 * have been addressed. The existing reason remains available for context.
 *
 * This standalone resubmit action validates the persisted booking data before
 * changing status, so incomplete records cannot re-enter review.
 *
 * @param _previousState - Previous form action state supplied by React.
 * @param formData - Form payload containing the `bookingId` to resubmit.
 * @returns Field or form errors when validation, permission, status, stored
 * booking completeness, or stale-update checks fail. On success, revalidates
 * booking workflow paths and redirects to the booking detail page.
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
    include: {
      activities: {
        orderBy: {
          sortOrder: 'asc',
        },
      },
      customers: {
        include: {
          customer: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      deposits: {
        orderBy: {
          createdAt: 'desc',
        },
      },
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
    return {
      formError: 'You do not have permission to resubmit this booking.',
    };
  }

  assertCanTransitionBookingStatus(
    booking.status,
    BookingStatus.PENDING_APPROVAL,
  );

  const bookingValidation = validateStoredBookingForSubmission(booking);
  if (!bookingValidation.success) {
    return {
      fieldErrors: bookingValidation.fieldErrors,
      formError: 'Booking is missing required information before resubmission.',
    };
  }

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
      formError:
        'This booking was updated by another user. Refresh and try again.',
    };
  }

  revalidateBookingWorkflowPaths(booking.id);
  redirect(`/bookings/${booking.id}`);
}
