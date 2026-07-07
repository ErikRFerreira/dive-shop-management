'use client';

import { useActionState, useState } from 'react';

import { MessageCircleQuestion } from 'lucide-react';

import { PendingButton } from '@/components/common/pending-button';
import { Textarea } from '@/components/ui/textarea';
import { markBookingNeedsMoreInfo } from '@/features/bookings/actions';

import {
  ActionError,
  getInitialBookingWorkflowActionState,
} from './workflow-action-state';

type MarkNeedsMoreInfoFormProps = {
  bookingId: string;
};

/**
 * Form used by administrators to request missing booking details.
 *
 * @param props - Booking identity for the needs-more-info transition.
 * @returns Needs-more-info workflow form with client-side reason validation.
 */
export function MarkNeedsMoreInfoForm({
  bookingId,
}: MarkNeedsMoreInfoFormProps) {
  const [state, formAction, pending] = useActionState(
    markBookingNeedsMoreInfo,
    getInitialBookingWorkflowActionState(),
  );
  const [reason, setReason] = useState('');
  const [clientReasonError, setClientReasonError] = useState<string>();
  const reasonError =
    clientReasonError ?? state.fieldErrors?.needsMoreInfoReason?.[0];

  /**
   * Blocks empty reason submissions before calling the server action.
   *
   * @param event - Form submit event from the needs-more-info form.
   */
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
          className="min-h-20 resize-none rounded-lg bg-background px-3 py-2 leading-relaxed text-foreground shadow-sm placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/30"
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
      <PendingButton
        className="border-orange-500 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
        pending={pending}
        pendingLabel="Sending request..."
        type="submit"
        variant="outline"
      >
        <MessageCircleQuestion className="h-4 w-4" />
        Mark as Needs More Info
      </PendingButton>
    </form>
  );
}
