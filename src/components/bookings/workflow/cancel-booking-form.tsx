'use client';

import { useActionState } from 'react';

import { AlertTriangle, XCircle } from 'lucide-react';

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
 * @returns Cancellation workflow form with optional reason capture.
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
      <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <p>
          Cancelling is a final decision. Add a short reason so the team has a
          record.
        </p>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="cancel-admin-notes">
          Reason for cancelling
        </label>
        <Textarea
          className="min-h-20 resize-none rounded-lg bg-background px-3 py-2 leading-relaxed text-foreground shadow-sm placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/30"
          defaultValue={defaultAdminNotes ?? ''}
          id="cancel-admin-notes"
          name="adminNotes"
          placeholder="e.g. Customer withdrew, duplicate request, unable to accommodate..."
        />
      </div>
      <ActionError message={state.formError} />
      <Button
        className="border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20"
        disabled={pending}
        type="submit"
        variant="outline"
      >
        <XCircle className="h-4 w-4" />
        {pending
          ? 'Cancelling...'
          : isScheduled
            ? 'Cancel Scheduled Booking'
            : 'Cancel / Reject'}
      </Button>
    </form>
  );
}
