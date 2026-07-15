/**
 * Purpose: This module provides server-side actions for CRUD operations on booking requests and their related intake records.
 *
 * @module features/bookings/actions
 */

'use server';

import { redirect } from 'next/navigation';
import type { z } from 'zod';

import {
  ActivityType,
  BookingCustomerRole,
  BookingParticipantStatus,
  BookingStatus,
  ScheduleTimeSlot,
} from '@/generated/prisma/enums';
import { getDefaultActivityDurationDays } from '@/features/bookings/activity-utils';
import { normalizeBookingFormValues } from '@/features/bookings/form-mappers';
import { db } from '@/lib/db';
import { requireCurrentUser } from '@/lib/current-user';
import { addUtcDateOnlyDays } from '@/lib/operational-date';

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
  canManageScheduledBookingParticipants,
  canPerformBookingStatusTransition,
  canResubmitBookingForApproval,
  canReviewBookingRequest,
} from './permissions';
import { assertCanTransitionBookingStatus } from './status';
import { validateStoredBookingForSubmission } from './submission-validation';
import type { BookingFormValues } from './types';
import {
  addScheduledBookingParticipantSchema,
  approveBookingSchema,
  cancelBookingSchema,
  markBookingNeedsMoreInfoSchema,
  resubmitBookingForApprovalSchema,
  updateBookingParticipantStatusSchema,
  updateBookingSchema,
  validateBookingIntake,
} from './validation';

export type {
  BookingWorkflowActionState,
  CreateBookingActionResult,
  UpdateBookingActionResult,
} from './action-results';

export type BookingParticipantStatusActionResult =
  | { success: true }
  | {
      success: false;
      fieldErrors?: Record<string, string[]>;
      formError?: string;
    };

export type AddScheduledBookingParticipantValues = {
  customerId?: string;
  customerName: string;
  chineseName: string;
  weChatId: string;
  whatsAppNumber: string;
  email: string;
  phone: string;
  hotelAtBooking: string;
  equipmentNeeded: string;
  customerNotes: string;
  preferredLanguage: string;
  heightCm: string;
  weightKg: string;
  shoeSize: string;
  certificationLevel: string;
  certificationAgency: string;
  lastDiveDate: string;
  divesLogged: string;
};

export type AddScheduledBookingParticipantActionResult =
  | { success: true }
  | {
      success: false;
      fieldErrors?: Record<string, string[]>;
      formError?: string;
    };

type ScheduledBookingParticipantValidationResult =
  | BookingParticipantStatusActionResult
  | AddScheduledBookingParticipantActionResult;
type ScheduledBookingParticipantData = z.infer<
  typeof addScheduledBookingParticipantSchema
>;

type ApprovableBookingActivity = {
  id: string;
  activityType: ActivityType | null;
  requestedDate: Date | null;
  requestedTime: string | null;
  requestedTimeSlot?: ScheduleTimeSlot | null;
  durationDays: number;
  notes: string | null;
  sortOrder: number;
};

type ScheduleItemCreateInput = {
  bookingRequestId: string;
  bookingActivityId: string | null;
  date: Date;
  startTime: string | null;
  timeSlot: ScheduleTimeSlot;
  activityType: ActivityType;
  dayNumber: number;
  totalDays: number;
  scheduleNotes: string | null;
};

type ApprovalScheduleTimeSlotsResult =
  | {
      success: true;
      timeSlots: Map<string, ScheduleTimeSlot>;
    }
  | {
      success: false;
      fieldErrors: Record<string, string[]>;
    };

const approvalScheduleTimeSlotFieldPrefix = 'scheduleTimeSlot:';
const legacyApprovalScheduleTimeSlotKey = 'legacy';

/**
 * Persists one booking request and its related intake records atomically.
 *
 * @param status - The workflow status assigned when the booking is created.
 * @returns The validation intent based on the booking status.
 */
function getEditSaveValidationIntent(status: BookingStatus) {
  return status === BookingStatus.PENDING_APPROVAL ? 'submit' : 'draft';
}

/**
 * Reads admin-selected schedule slots from the approval form.
 *
 * @param formData - Submitted approval form data with activity-keyed slot fields.
 * @returns Valid schedule slots by activity key, or field errors for invalid values.
 */
function getApprovalScheduleTimeSlots(
  formData: FormData,
): ApprovalScheduleTimeSlotsResult {
  const timeSlots = new Map<string, ScheduleTimeSlot>();
  const fieldErrors: Record<string, string[]> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith(approvalScheduleTimeSlotFieldPrefix)) {
      continue;
    }

    const activityKey = key.slice(approvalScheduleTimeSlotFieldPrefix.length);
    const parsedTimeSlot = Object.values(ScheduleTimeSlot).includes(
      value as ScheduleTimeSlot,
    )
      ? (value as ScheduleTimeSlot)
      : null;

    if (!activityKey || !parsedTimeSlot) {
      fieldErrors[key] = ['Select a valid schedule slot.'];
      continue;
    }

    timeSlots.set(activityKey, parsedTimeSlot);
  }

  return Object.keys(fieldErrors).length > 0
    ? { success: false, fieldErrors }
    : { success: true, timeSlots };
}

/**
 * Expands one approved booking activity into one or more dated schedule rows.
 *
 * @param bookingId - Booking request being published to the schedule.
 * @param activity - Stored activity row with requested scheduling details.
 * @param timeSlot - Admin-selected operational slot to write to each schedule row.
 * @param scheduleNotes - Notes copied from admin/internal booking notes.
 * @returns Schedule row create inputs for each persisted activity duration day.
 */
function buildScheduleItemsForActivity(
  bookingId: string,
  activity: ApprovableBookingActivity,
  timeSlot: ScheduleTimeSlot,
  scheduleNotes: string | null,
): ScheduleItemCreateInput[] {
  if (!activity.activityType || !activity.requestedDate) {
    return [];
  }

  const activityType = activity.activityType;
  const requestedDate = activity.requestedDate;
  const totalDays = activity.durationDays;

  return Array.from({
    length: totalDays,
  }).map((_, index) => ({
    bookingRequestId: bookingId,
    bookingActivityId: activity.id,
    date: addUtcDateOnlyDays(requestedDate, index),
    startTime: null,
    timeSlot,
    activityType,
    dayNumber: index + 1,
    totalDays,
    scheduleNotes,
  }));
}

/**
 * Builds schedule rows for the approval action using activity rows first.
 *
 * @param booking - Booking fields required to publish schedule items.
 * @param approvalTimeSlots - Admin-selected schedule slots keyed by activity ID.
 * @param scheduleNotes - Notes copied onto each schedule row.
 * @returns Schedule rows ready to create, or an error when required date/type data is missing.
 */
function buildScheduleItemsForApproval(
  booking: {
    id: string;
    requestedDate: Date | null;
    requestedTime: string | null;
    requestedTimeSlot?: ScheduleTimeSlot | null;
    activityType: ActivityType | null;
    activities: ApprovableBookingActivity[];
  },
  approvalTimeSlots: Map<string, ScheduleTimeSlot>,
  scheduleNotes: string | null,
):
  | { success: true; scheduleItems: ScheduleItemCreateInput[] }
  | { success: false; formError: string } {
  if (booking.activities.length === 0) {
    if (!booking.requestedDate) {
      return {
        success: false,
        formError: 'Requested date is required before approving a booking.',
      };
    }

    if (!booking.activityType) {
      return {
        success: false,
        formError: 'Activity type is required before approving a booking.',
      };
    }

    return {
      success: true,
      scheduleItems: buildScheduleItemsForActivity(
        booking.id,
        {
          id: 'legacy-booking-activity',
          activityType: booking.activityType,
          requestedDate: booking.requestedDate,
          requestedTime: booking.requestedTime,
          requestedTimeSlot: booking.requestedTimeSlot,
          durationDays: getDefaultActivityDurationDays(booking.activityType),
          notes: null,
          sortOrder: 0,
        },
        approvalTimeSlots.get(legacyApprovalScheduleTimeSlotKey) ??
          ScheduleTimeSlot.TBD,
        scheduleNotes,
      ).map((scheduleItem) => ({
        ...scheduleItem,
        bookingActivityId: null,
      })),
    };
  }

  const incompleteActivity = booking.activities.find(
    (activity) => !activity.activityType || !activity.requestedDate,
  );

  if (incompleteActivity) {
    return {
      success: false,
      formError:
        'Every activity needs an activity type and requested date before approval.',
    };
  }

  return {
    success: true,
    scheduleItems: booking.activities.flatMap((activity) =>
      buildScheduleItemsForActivity(
        booking.id,
        activity,
        approvalTimeSlots.get(activity.id) ?? ScheduleTimeSlot.TBD,
        scheduleNotes,
      ),
    ),
  };
}

/**
 * Converts participant status validation failures into the shared action shape.
 *
 * @param error - Zod validation error from the participant status schema.
 * @returns Field and form errors consumable by the booking detail controls.
 */
function getScheduledBookingParticipantValidationErrors(error: {
  flatten: () => {
    fieldErrors: Record<string, string[] | undefined>;
    formErrors: string[];
  };
}): ScheduledBookingParticipantValidationResult {
  const flattened = error.flatten();
  const fieldErrors = Object.fromEntries(
    Object.entries(flattened.fieldErrors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );

  return {
    success: false,
    fieldErrors,
    formError: flattened.formErrors[0],
  };
}

/**
 * Maps a scheduled participant payload to a new customer profile record.
 *
 * @param participant - Validated participant values from the add-participant action.
 * @returns Customer profile data for a newly created customer/diver.
 */
function mapScheduledParticipantCustomerData(
  participant: ScheduledBookingParticipantData,
) {
  return {
    fullName: participant.customerName,
    chineseName: participant.chineseName,
    weChatId: participant.weChatId,
    whatsAppNumber: participant.whatsAppNumber,
    email: participant.email,
    phone: participant.phone,
    preferredLanguage: participant.preferredLanguage,
  };
}

/**
 * Maps a validated scheduled participant payload to a booking/customer join row.
 *
 * @param bookingRequestId - Scheduled booking that will receive the participant.
 * @param customerId - Existing or newly created customer ID.
 * @param participant - Validated participant values from the add-participant action.
 * @returns BookingCustomer create data with active participant defaults.
 */
function mapScheduledBookingParticipantData(
  bookingRequestId: string,
  customerId: string,
  participant: ScheduledBookingParticipantData,
) {
  return {
    bookingRequestId,
    customerId,
    role: BookingCustomerRole.PARTICIPANT,
    participationStatus: BookingParticipantStatus.ACTIVE,
    hotelAtBooking: participant.hotelAtBooking,
    equipmentNeeded: participant.equipmentNeeded,
    notes: participant.customerNotes,
    certificationAgency: participant.certificationAgency,
    certificationLevel: participant.certificationLevel,
    lastDiveAt: participant.lastDiveDate,
    heightCm: participant.heightCm,
    weightKg: participant.weightKg,
    shoeSize: participant.shoeSize,
    divesLogged: participant.divesLogged,
  };
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
 * Updates the operational participation status for one scheduled booking participant.
 *
 * The mutation updates only the BookingCustomer join row. Historical
 * participation remains attached to the booking and customer record, while
 * active headcount is recalculated by existing query mappers after revalidation.
 *
 * @param bookingId - Scheduled booking containing the participant.
 * @param customerId - Customer linked to the booking participant row.
 * @param participationStatus - New participant status selected by an Admin or Manager.
 * @returns Success or validation/authorization/business-rule errors.
 */
export async function updateBookingParticipantStatus(
  bookingId: string,
  customerId: string,
  participationStatus: BookingParticipantStatus,
): Promise<BookingParticipantStatusActionResult> {
  const validation = updateBookingParticipantStatusSchema.safeParse({
    bookingId,
    customerId,
    participationStatus,
  });

  if (!validation.success) {
    return getScheduledBookingParticipantValidationErrors(validation.error);
  }

  const currentUser = await requireCurrentUser();

  if (
    !canManageScheduledBookingParticipants(currentUser, BookingStatus.SCHEDULED)
  ) {
    return {
      success: false,
      formError: 'You do not have permission to manage booking participants.',
    };
  }

  const participant = await db.bookingCustomer.findUnique({
    where: {
      bookingRequestId_customerId: {
        bookingRequestId: validation.data.bookingId,
        customerId: validation.data.customerId,
      },
    },
    select: {
      bookingRequestId: true,
      customerId: true,
      bookingRequest: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!participant) {
    return {
      success: false,
      formError: 'Booking participant not found. Refresh and try again.',
    };
  }

  if (
    !canManageScheduledBookingParticipants(
      currentUser,
      participant.bookingRequest.status,
    )
  ) {
    return {
      success: false,
      formError: 'Only scheduled bookings can have participant statuses changed.',
    };
  }

  const updateResult = await db.bookingCustomer.updateMany({
    where: {
      bookingRequestId: participant.bookingRequestId,
      customerId: participant.customerId,
      bookingRequest: {
        status: BookingStatus.SCHEDULED,
      },
    },
    data: {
      participationStatus: validation.data.participationStatus,
      participationStatusChangedAt: new Date(),
    },
  });

  if (updateResult.count !== 1) {
    return {
      success: false,
      formError:
        'This booking was updated by another user. Refresh and try again.',
    };
  }

  revalidateBookingWorkflowPaths(participant.bookingRequest.id);
  revalidateSchedulePath();
  return { success: true };
}

/**
 * Appends one active customer/diver to an already scheduled booking.
 *
 * This action preserves existing BookingCustomer rows and booking workflow
 * status. It creates a Customer when staff enters a new diver, links the
 * customer as an active participant, and refreshes schedule-facing routes so
 * derived active headcounts update across operations views.
 *
 * @param bookingId - Scheduled booking that should receive the participant.
 * @param values - Existing customer selection or new customer/diver details.
 * @returns Success or validation/authorization/business-rule errors.
 */
export async function addCustomerToScheduledBooking(
  bookingId: string,
  values: AddScheduledBookingParticipantValues,
): Promise<AddScheduledBookingParticipantActionResult> {
  const validation = addScheduledBookingParticipantSchema.safeParse({
    bookingId,
    ...values,
  });

  if (!validation.success) {
    return getScheduledBookingParticipantValidationErrors(validation.error);
  }

  const currentUser = await requireCurrentUser();

  if (
    !canManageScheduledBookingParticipants(currentUser, BookingStatus.SCHEDULED)
  ) {
    return {
      success: false,
      formError: 'You do not have permission to manage booking participants.',
    };
  }

  const result = await db.$transaction(async (transaction) => {
    const booking = await transaction.bookingRequest.findUnique({
      where: {
        id: validation.data.bookingId,
      },
      select: {
        id: true,
        status: true,
        customers: {
          select: {
            customerId: true,
            participationStatus: true,
          },
        },
      },
    });

    if (!booking) {
      return {
        success: false as const,
        formError: 'Booking request not found. Refresh and try again.',
      };
    }

    if (!canManageScheduledBookingParticipants(currentUser, booking.status)) {
      return {
        success: false as const,
        formError: 'Only scheduled bookings can have participants added.',
      };
    }

    const existingCustomerId = validation.data.customerId;

    if (existingCustomerId) {
      const customer = await transaction.customer.findUnique({
        where: {
          id: existingCustomerId,
        },
        select: {
          id: true,
        },
      });

      if (!customer) {
        return {
          success: false as const,
          formError:
            'Selected customer no longer exists. Search again and retry.',
        };
      }
    }

    if (
      existingCustomerId &&
      booking.customers.some(
        (bookingCustomer) => bookingCustomer.customerId === existingCustomerId,
      )
    ) {
      return {
        success: false as const,
        formError:
          'This customer is already attached to the booking. Update their participant status instead.',
      };
    }

    const nextActiveParticipantCount =
      booking.customers.filter(
        (bookingCustomer) =>
          bookingCustomer.participationStatus ===
          BookingParticipantStatus.ACTIVE,
      ).length + 1;

    const updateResult = await transaction.bookingRequest.updateMany({
      where: {
        id: booking.id,
        status: BookingStatus.SCHEDULED,
      },
      data: {
        numberOfPeople: nextActiveParticipantCount,
      },
    });

    if (updateResult.count !== 1) {
      return {
        success: false as const,
        formError:
          'This booking was updated by another user. Refresh and try again.',
      };
    }

    const customerId =
      existingCustomerId ??
      (
        await transaction.customer.create({
          data: mapScheduledParticipantCustomerData(validation.data),
        })
      ).id;

    await transaction.bookingCustomer.create({
      data: mapScheduledBookingParticipantData(
        booking.id,
        customerId,
        validation.data,
      ),
    });

    return { success: true as const, bookingId: booking.id };
  });

  if (!result.success) {
    return result;
  }

  revalidateBookingWorkflowPaths(result.bookingId);
  revalidateSchedulePath();
  return { success: true };
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

  const approvalTimeSlots = getApprovalScheduleTimeSlots(formData);
  if (!approvalTimeSlots.success) {
    return {
      fieldErrors: approvalTimeSlots.fieldErrors,
      formError: 'Select a valid schedule slot before approving.',
    };
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
      requestedTimeSlot: true,
      activityType: true,
	      internalNotes: true,
	      adminNotes: true,
	      scheduleItems: {
	        select: {
	          id: true,
	        },
	        take: 1,
	      },
	      activities: {
	        select: {
	          id: true,
          activityType: true,
          requestedDate: true,
          requestedTime: true,
          requestedTimeSlot: true,
          durationDays: true,
          notes: true,
          sortOrder: true,
        },
	        orderBy: {
	          sortOrder: 'asc',
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

  const legacyScheduleItem = (
    booking as { scheduleItem?: { id: string } | null }
  ).scheduleItem;
  const existingScheduleItems =
    booking.scheduleItems ?? (legacyScheduleItem ? [legacyScheduleItem] : []);

  if (existingScheduleItems.length > 0) {
    return {
      formError: 'This booking already has a schedule item.',
    };
  }

  const adminNotes = validation.data.adminNotes;
  const scheduleNotes = adminNotes ?? booking.internalNotes;
  const scheduleItemBuildResult = buildScheduleItemsForApproval(
    {
      ...booking,
      activities: booking.activities ?? [],
    },
    approvalTimeSlots.timeSlots,
    scheduleNotes,
  );

  if (!scheduleItemBuildResult.success) {
    return { formError: scheduleItemBuildResult.formError };
  }

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
    const existingScheduleItem = await transaction.scheduleItem.findFirst({
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

    for (const scheduleItem of scheduleItemBuildResult.scheduleItems) {
      await transaction.scheduleItem.create({
        data: scheduleItem,
      });
    }

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
 * diver, deposit, schedule, or assignment records.
 *
 * Pending Approval and Needs More Info bookings are removed from the review
 * workflow with a status update. Scheduled bookings are unpublished from active
 * schedule and assignment views by setting the booking status to `CANCELLED`;
 * stale ScheduleItem and ScheduleAssignment rows are preserved for historical
 * context and remain excluded by official schedule queries.
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
