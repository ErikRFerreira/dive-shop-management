/**
 * Purpose: Server actions for managing participants on scheduled bookings.
 *
 * @module features/bookings/scheduled-participant-actions
 */

'use server';

import type { z } from 'zod';

import {
  BookingCustomerRole,
  BookingParticipantStatus,
  BookingStatus,
} from '@/generated/prisma/enums';
import { db } from '@/lib/db';
import { requireCurrentUser } from '@/lib/current-user';

import type {
  AddScheduledBookingParticipantActionResult,
  AddScheduledBookingParticipantValues,
  BookingParticipantStatusActionResult,
} from './action-results';
import {
  revalidateBookingWorkflowPaths,
  revalidateSchedulePath,
} from './cache';
import { canManageScheduledBookingParticipants } from './permissions';
import {
  addScheduledBookingParticipantSchema,
  updateBookingParticipantStatusSchema,
} from './validation';

type ScheduledBookingParticipantValidationResult =
  | BookingParticipantStatusActionResult
  | AddScheduledBookingParticipantActionResult;
type ScheduledBookingParticipantData = z.infer<
  typeof addScheduledBookingParticipantSchema
>;

/**
 * Converts scheduled-participant validation failures into the shared result shape.
 *
 * @param error - Zod validation error from a scheduled-participant schema.
 * @returns Field and form errors consumable by booking participant controls.
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
 * @returns Customer profile data for a newly created customer or diver.
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
 * Maps a scheduled participant payload to a booking/customer join row.
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

/**
 * Updates the operational participation status for one scheduled booking participant.
 *
 * The mutation updates only the BookingCustomer join row so historical
 * participation remains attached to the booking and customer records.
 *
 * @param bookingId - Scheduled booking containing the participant.
 * @param customerId - Customer linked to the booking participant row.
 * @param participationStatus - New status selected by an Admin or Manager.
 * @returns Success or validation, authorization, and business-rule errors.
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
 * Appends one active customer or diver to an already scheduled booking.
 *
 * Existing participant rows and workflow status are preserved. A Customer is
 * created when staff enters a new diver, then linked as an active participant.
 *
 * @param bookingId - Scheduled booking that should receive the participant.
 * @param values - Existing customer selection or new customer details.
 * @returns Success or validation, authorization, and business-rule errors.
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
