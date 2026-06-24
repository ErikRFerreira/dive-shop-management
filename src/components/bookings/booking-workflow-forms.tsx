'use client';

import { useActionState } from 'react';

import {
  initialBookingWorkflowActionState,
  markBookingNeedsMoreInfo,
  resubmitBookingForApproval,
} from '@/features/bookings/actions';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type BookingIdProps = {
  bookingId: string;
};

function ActionError({ message }: { message?: string }) {
  return message ? (
    <p aria-live="polite" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

/** Form used by administrators to request missing booking details. */
export function MarkNeedsMoreInfoForm({ bookingId }: BookingIdProps) {
  const [state, formAction, pending] = useActionState(
    markBookingNeedsMoreInfo,
    initialBookingWorkflowActionState,
  );
  const reasonError = state.fieldErrors?.needsMoreInfoReason?.[0];

  return (
    <form action={formAction} className="grid gap-3">
      <input name="bookingId" type="hidden" value={bookingId} />
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="needs-more-info-reason">
          Reason
        </label>
        <Textarea
          aria-describedby={reasonError ? 'needs-more-info-reason-error' : undefined}
          aria-invalid={Boolean(reasonError)}
          id="needs-more-info-reason"
          name="needsMoreInfoReason"
          placeholder="Explain what information customer service needs to provide."
          required
        />
        {reasonError ? (
          <p className="text-sm text-destructive" id="needs-more-info-reason-error">
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
      <Button className={state.formError ? 'mt-3' : undefined} disabled={pending} type="submit">
        {pending ? 'Resubmitting…' : 'Resubmit for Approval'}
      </Button>
    </form>
  );
}
