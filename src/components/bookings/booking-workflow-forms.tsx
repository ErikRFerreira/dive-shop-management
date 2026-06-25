'use client';

import { useActionState, useState } from 'react';

import {
  approveBooking,
  cancelBooking,
  markBookingNeedsMoreInfo,
  resubmitBookingForApproval,
} from '@/features/bookings/actions';
import type { BookingWorkflowActionState } from '@/features/bookings/actions';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type BookingIdProps = {
  bookingId: string;
};

type ApproveBookingFormProps = BookingIdProps & {
  defaultAdminNotes?: string | null;
};

const initialBookingWorkflowActionState: BookingWorkflowActionState = {};

function ActionError({ message }: { message?: string }) {
  return message ? (
    <p aria-live="polite" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

/** Form used by administrators to approve and publish a booking to the schedule. */
export function ApproveBookingForm({
  bookingId,
  defaultAdminNotes,
}: ApproveBookingFormProps) {
  const [state, formAction, pending] = useActionState(
    approveBooking,
    initialBookingWorkflowActionState,
  );

  return (
    <form action={formAction} className="grid gap-3">
      <input name="bookingId" type="hidden" value={bookingId} />
      <div className="grid gap-2">
        <Textarea
          defaultValue={defaultAdminNotes ?? ''}
          id="admin-notes"
          name="adminNotes"
          placeholder="Add review notes for the internal schedule."
        />
      </div>
      <ActionError message={state.formError} />
      <Button disabled={pending} type="submit">
        {pending ? 'Approving...' : 'Approve & Schedule'}
      </Button>
    </form>
  );
}

/** Form used by administrators to request missing booking details. */
export function MarkNeedsMoreInfoForm({ bookingId }: BookingIdProps) {
  const [state, formAction, pending] = useActionState(
    markBookingNeedsMoreInfo,
    initialBookingWorkflowActionState,
  );
  const [reason, setReason] = useState('');
  const [clientReasonError, setClientReasonError] = useState<string>();
  const reasonError =
    clientReasonError ?? state.fieldErrors?.needsMoreInfoReason?.[0];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (reason.trim()) {
      return;
    }

    event.preventDefault();
    setClientReasonError('Enter a reason before requesting more information.');
  }

  return (
    <form
      action={formAction}
      className="grid gap-3"
      noValidate
      onSubmit={handleSubmit}
    >
      <input name="bookingId" type="hidden" value={bookingId} />
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="needs-more-info-reason">
          Reason
        </label>
        <Textarea
          aria-describedby={
            reasonError ? 'needs-more-info-reason-error' : undefined
          }
          aria-invalid={Boolean(reasonError)}
          id="needs-more-info-reason"
          name="needsMoreInfoReason"
          onChange={(event) => {
            setReason(event.target.value);

            if (event.target.value.trim()) {
              setClientReasonError(undefined);
            }
          }}
          placeholder="Explain what information customer service needs to provide."
          value={reason}
        />
        {reasonError ? (
          <p
            className="text-sm text-destructive"
            id="needs-more-info-reason-error"
          >
            {reasonError}
          </p>
        ) : null}
      </div>
      <ActionError message={state.formError} />
      <Button disabled={pending} type="submit" variant="outline">
        {pending ? 'Marking…' : 'Mark as Needs More Info'}
      </Button>
    </form>
  );
}

/** Form used by administrators to cancel or reject a booking request. */
export function CancelBookingForm({ bookingId }: BookingIdProps) {
  const [state, formAction, pending] = useActionState(
    cancelBooking,
    initialBookingWorkflowActionState,
  );

  return (
    <form action={formAction} className="grid gap-3">
      <input name="bookingId" type="hidden" value={bookingId} />
      <p className="text-sm text-muted-foreground">
        Cancelling does not delete the booking, customer, diver, or deposit
        data.
      </p>
      <ActionError message={state.formError} />
      <Button disabled={pending} type="submit" variant="destructive">
        {pending ? 'Cancelling...' : 'Cancel / Reject'}
      </Button>
    </form>
  );
}

/** Form shown to users allowed to return a corrected booking for review. */
export function ResubmitBookingForApprovalForm({ bookingId }: BookingIdProps) {
  const [state, formAction, pending] = useActionState(
    resubmitBookingForApproval,
    initialBookingWorkflowActionState,
  );

  return (
    <form action={formAction} className="mt-4">
      <input name="bookingId" type="hidden" value={bookingId} />
      <ActionError message={state.formError} />
      <Button
        className={state.formError ? 'mt-3' : undefined}
        disabled={pending}
        type="submit"
      >
        {pending ? 'Resubmitting…' : 'Resubmit for Approval'}
      </Button>
    </form>
  );
}
