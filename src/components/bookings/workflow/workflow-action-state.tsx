'use client';

import type { BookingWorkflowActionState } from '@/features/bookings/actions';

const initialBookingWorkflowActionState: BookingWorkflowActionState = {};

/**
 * Returns the initial empty state used by booking workflow server actions.
 *
 * @returns Empty workflow action state for useActionState initialization.
 */
export function getInitialBookingWorkflowActionState() {
  return initialBookingWorkflowActionState;
}

/**
 * Renders an accessible booking workflow form error when one is present.
 *
 * @param props - Optional message returned by the workflow server action.
 * @returns A destructive inline error message or null.
 */
export function ActionError({ message }: { message?: string }) {
  return message ? (
    <p aria-live="polite" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}
