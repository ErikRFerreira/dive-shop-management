/**
 * Purpose: Provides utility functions for revalidating Next.js paths related to booking workflows.
 *
 * @module features/bookings/cache
 */

import { revalidatePath } from 'next/cache';

export function revalidateBookingWorkflowPaths(bookingId: string) {
  revalidatePath('/bookings');
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath(`/bookings/${bookingId}/review`);
  revalidatePath(`/bookings/${bookingId}/edit`);
}

export function revalidateBookingListPath() {
  revalidatePath('/bookings');
}

export function revalidateSchedulePath() {
  revalidatePath('/schedule');
}
