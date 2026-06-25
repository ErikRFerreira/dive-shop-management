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
