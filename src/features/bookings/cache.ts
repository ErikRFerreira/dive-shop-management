/**
 * Purpose: Provides utility functions for revalidating Next.js paths related to booking workflows.
 *
 * @module features/bookings/cache
 */

import { revalidatePath } from 'next/cache';

/**
 * Revalidates booking list and detail routes affected by workflow mutations.
 *
 * @param bookingId - Booking request ID used by detail, review, and edit pages.
 */
export function revalidateBookingWorkflowPaths(bookingId: string) {
  revalidatePath('/bookings');
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath(`/bookings/${bookingId}/review`);
  revalidatePath(`/bookings/${bookingId}/edit`);
}

/**
 * Revalidates the booking list route after booking collection changes.
 */
export function revalidateBookingListPath() {
  revalidatePath('/bookings');
}

/**
 * Revalidates active schedule surfaces after schedule-affecting mutations.
 */
export function revalidateSchedulePath() {
  revalidatePath('/schedule');
  revalidatePath('/assignments');
  revalidatePath('/dashboard');
}
