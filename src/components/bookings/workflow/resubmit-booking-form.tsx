'use client';

import { useActionState } from 'react';
import { RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { resubmitBookingForApproval } from '@/features/bookings/actions';

import {
  ActionError,
  getInitialBookingWorkflowActionState,
} from './workflow-action-state';

type ResubmitBookingForApprovalFormProps = {
  bookingId: string;
};

/**
 * Form shown to users allowed to return a corrected booking for review.
 *
 * @param props - Booking identity for the resubmission transition.
 * @returns Resubmit workflow form wired to the booking resubmission action.
 */
export function ResubmitBookingForApprovalForm({
  bookingId,
}: ResubmitBookingForApprovalFormProps) {
  const [state, formAction, pending] = useActionState(
    resubmitBookingForApproval,
    getInitialBookingWorkflowActionState(),
  );

  return (
    <form action={formAction}>
      <input name="bookingId" type="hidden" value={bookingId} />
      <ActionError message={state.formError} />
      <Button
        disabled={pending}
        size="lg"
        type="reset"
        className="w-full"
        variant="ghost"
      >
        <RotateCw className="mr-2 h-4 w-4" />
        {pending ? 'Resubmittingâ€¦' : 'Resubmit for Approval'}
      </Button>
    </form>
  );
}
