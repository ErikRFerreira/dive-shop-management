/**
 * Purpose: Defines the types and utility functions for handling action results related to booking operations,
 * including creation and updating of bookings, as well as validation error handling.
 *
 * @module features/bookings/action-results
 */

import type { BookingIntakeFieldErrors } from './validation';

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

/** Result returned after an existing booking has been saved. */
export type UpdateBookingActionResult =
  | { success: true; redirectTo: `/bookings/${string}` }
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

/** Result returned after changing a scheduled participant's operational status. */
export type BookingParticipantStatusActionResult =
  | { success: true }
  | {
      success: false;
      fieldErrors?: Record<string, string[]>;
      formError?: string;
    };

/** Browser-safe values accepted when adding a participant to a scheduled booking. */
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

/** Result returned after adding a participant to a scheduled booking. */
export type AddScheduledBookingParticipantActionResult =
  | { success: true }
  | {
      success: false;
      fieldErrors?: Record<string, string[]>;
      formError?: string;
    };

/**
 * Converts a Zod validation error into a shape consumable by the booking workflow forms.
 *
 * @param error - The Zod validation error to convert.
 * @returns The converted validation error in a shape consumable by the booking workflow forms.
 */
export function getValidationErrors(error: {
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
