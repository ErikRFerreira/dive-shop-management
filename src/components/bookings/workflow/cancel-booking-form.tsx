'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cancelBooking } from '@/features/bookings/actions';
import { BookingStatus } from '@/generated/prisma/enums';

import {
  ActionError,
  getInitialBookingWorkflowActionState,
} from './workflow-action-state';

type CancelBookingFormProps = {
  bookingId: string;
  defaultAdminNotes?: string | null;
  status: BookingStatus;
};

/**
 * Form used by administrators to cancel or reject a booking request.
 *
 * @param props - Booking identity, status, and optional existing admin notes.
 * @returns Cancellation workflow form with scheduled-booking note handling.
 */
export function CancelBookingForm({
  bookingId,
  defaultAdminNotes,
  status,
}: CancelBookingFormProps) {
  const [state, formAction, pending] = useActionState(
    cancelBooking,
    getInitialBookingWorkflowActionState(),
  );
  const isScheduled = status === BookingStatus.SCHEDULED;

  return (
    <form action={formAction} className="grid gap-3">
      <input name="bookingId" type="hidden" value={bookingId} />
      {isScheduled ? (
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="cancel-admin-notes">
            Admin notes
          </label>
          <Textarea
            defaultValue={defaultAdminNotes ?? ''}
            id="cancel-admin-notes"
            name="adminNotes"
            placeholder="Add cancellation notes for the booking record."
          />
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Cancelling does not delete the booking, customer, diver, or deposit
        data.
      </p>
      <ActionError message={state.formError} />
      <Button disabled={pending} type="submit" variant="destructive">
        {pending
          ? 'Cancelling...'
          : isScheduled
            ? 'Cancel Scheduled Booking'
            : 'Cancel / Reject'}
      </Button>
    </form>
  );
}
