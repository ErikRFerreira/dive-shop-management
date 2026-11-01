/**
 * Purpose: Server actions for standalone booking workflow transitions.
 *
 * @module features/bookings/workflow-actions
 */

'use server';

import { redirect } from 'next/navigation';

import { BookingStatus } from '@/generated/prisma/enums';
import { db } from '@/lib/db';
import { requireCurrentUser } from '@/lib/current-user';

import {
  getValidationErrors,
  type BookingWorkflowActionState,
} from './action-results';
import {
  revalidateBookingWorkflowPaths,
  revalidateSchedulePath,
} from './cache';
import {
  canPerformBookingStatusTransition,
  canResubmitBookingForApproval,
  canReviewBookingRequest,
} from './permissions';
import { assertCanTransitionBookingStatus } from './status';
import { validateStoredBookingForSubmission } from './submission-validation';
import {
  cancelBookingSchema,
  markBookingNeedsMoreInfoSchema,
  resubmitBookingForApprovalSchema,
} from './validation';

/**
 * Records the administrator's reason for returning a pending booking request.
 *
 * The expected status is checked during both read and write operations so a
 * stale form cannot overwrite a decision made by another reviewer.
 *
 * @param _previousState - Previous form action state supplied by React.
 * @param formData - Payload containing `bookingId` and `needsMoreInfoReason`.
 * @returns Workflow errors; on success, revalidates routes and redirects.
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
 * Cancels a booking without deleting related operational or historical records.
 *
 * Scheduled bookings leave active schedule views through their status change;
 * existing schedule and assignment rows remain available as historical data.
 *
 * @param _previousState - Previous form action state supplied by React.
 * @param formData - Payload containing the booking ID and optional admin notes.
 * @returns Workflow errors; on success, revalidates routes and redirects.
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
      scheduleItems: {
        select: {
          id: true,
        },
        take: 1,
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
 * Returns a Needs More Info booking to the pending approval queue.
 *
 * Persisted booking data is validated before the status change, and the
 * existing Needs More Info reason remains available for reviewer context.
 *
 * @param _previousState - Previous form action state supplied by React.
 * @param formData - Payload containing the booking ID to resubmit.
 * @returns Workflow errors; on success, revalidates routes and redirects.
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
    !canResubmitBookingForApproval(
      currentUser,
      booking.createdById,
      booking.status,
    )
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
