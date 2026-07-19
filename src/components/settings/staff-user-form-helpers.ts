import type { z } from 'zod';

export type StaffUserFieldErrors = Record<string, string[]>;

/**
 * Converts client-side Zod errors into the same field map returned by actions.
 *
 * @param error - Zod validation failure from a staff dialog.
 * @returns Defined field messages and the first form-level message.
 */
export function getStaffUserFormErrors(error: z.ZodError): {
  fieldErrors: StaffUserFieldErrors;
  formError?: string;
} {
  const flattened = error.flatten();

  return {
    fieldErrors: Object.fromEntries(
      Object.entries(flattened.fieldErrors).filter(
        (entry): entry is [string, string[]] => entry[1] !== undefined,
      ),
    ),
    formError: flattened.formErrors[0],
  };
}
