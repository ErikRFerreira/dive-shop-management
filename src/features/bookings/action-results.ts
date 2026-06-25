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
