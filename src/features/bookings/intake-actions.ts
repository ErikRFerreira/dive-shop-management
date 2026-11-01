/**
 * Purpose: Server actions for creating and editing booking intake records.
 *
 * @module features/bookings/intake-actions
 */

'use server';

import { BookingStatus } from '@/generated/prisma/enums';
import { normalizeBookingFormValues } from '@/features/bookings/form-mappers';
import { db } from '@/lib/db';
import { requireCurrentUser } from '@/lib/current-user';

import type {
  CreateBookingActionResult,
  UpdateBookingActionResult,
} from './action-results';
import {
  revalidateBookingListPath,
  revalidateBookingWorkflowPaths,
} from './cache';
import {
  createBookingRequestWithIntake,
  loadEditableBooking,
  updateBookingRequestWithIntake,
} from './mutations';
import {
  canCreateBookingRequest,
  canEditBooking,
  canPerformBookingStatusTransition,
  canResubmitBookingForApproval,
} from './permissions';
import { assertCanTransitionBookingStatus } from './status';
import type { BookingFormValues } from './types';
import { updateBookingSchema, validateBookingIntake } from './validation';

type UpdateEditableBookingOptions = {
  expectedStatus?: BookingStatus;
  nextStatus?: BookingStatus;
  validationIntent?: 'draft' | 'submit';
  invalidStatusError?: string;
  permissionError?: string;
  requireResubmitPermission?: boolean;
};

/**
 * Returns the validation strictness appropriate for an editable booking status.
 *
 * @param status - Current booking workflow status.
 * @returns Submit validation for pending bookings, otherwise draft validation.
 */
function getEditSaveValidationIntent(status: BookingStatus) {
  return status === BookingStatus.PENDING_APPROVAL ? 'submit' : 'draft';
}

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
 * @param options - Optional expected status, transition, validation, and error behavior.
 * @returns A validation, authorization, or stale-update failure result; otherwise the detail path.
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
    canResubmitBookingForApproval(
      currentUser,
      booking.createdById,
      booking.status,
    );

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
 * @param status - Workflow status assigned when the booking is created.
 * @returns A validation or authorization failure, or the booking-list path.
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
 * @returns A validation or authorization failure, or the booking-list path.
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
 * @returns A validation or authorization failure, or the booking-list path.
 */
export async function submitBookingForApproval(
  values: BookingFormValues,
): Promise<CreateBookingActionResult> {
  return createBooking(values, BookingStatus.PENDING_APPROVAL);
}

/**
 * Updates an editable booking without changing its workflow status.
 *
 * @param bookingId - Booking request to update.
 * @param values - Browser-safe booking intake values to validate and persist.
 * @returns A validation, authorization, or stale-update failure; otherwise the detail path.
 */
export async function updateBooking(
  bookingId: string,
  values: BookingFormValues,
): Promise<UpdateBookingActionResult> {
  return updateEditableBooking(bookingId, values);
}

/**
 * Saves edits to a draft booking and moves it into the pending approval queue.
 *
 * @param bookingId - Draft booking request to update and submit.
 * @param values - Browser-safe booking intake values to validate with submit rules.
 * @returns A validation, authorization, status, or stale-update failure; otherwise the detail path.
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
 * Saves edits to a Needs More Info booking and returns it to pending approval.
 *
 * @param bookingId - Needs More Info booking request to update and resubmit.
 * @param values - Browser-safe booking intake values to validate with submit rules.
 * @returns A validation, authorization, status, or stale-update failure; otherwise the detail path.
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
