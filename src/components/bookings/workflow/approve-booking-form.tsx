'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { approveBooking } from '@/features/bookings/actions';

import {
  ActionError,
  getInitialBookingWorkflowActionState,
} from './workflow-action-state';

type ApproveBookingFormProps = {
  bookingId: string;
  defaultAdminNotes?: string | null;
  noteDescription?: string;
  noteLabel?: string;
};

/**
 * Form used by administrators to approve and publish a booking to the schedule.
 *
 * @param props - Booking identity, optional existing admin notes, and review-specific note copy.
 * @returns Approval workflow form wired to the booking approval action.
 */
export function ApproveBookingForm({
  bookingId,
  defaultAdminNotes,
  noteDescription = 'Optional notes for admin review or the internal schedule.',
  noteLabel = 'Admin/schedule notes',
}: ApproveBookingFormProps) {
  const [state, formAction, pending] = useActionState(
    approveBooking,
    getInitialBookingWorkflowActionState(),
  );

  return (
    <form action={formAction} className="grid gap-3">
      <input name="bookingId" type="hidden" value={bookingId} />
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="admin-notes">
          {noteLabel}
        </label>
        <p className="text-sm text-muted-foreground">{noteDescription}</p>
        <Textarea
          defaultValue={defaultAdminNotes ?? ''}
          id="admin-notes"
          name="adminNotes"
          placeholder="Add notes for admin review or the internal schedule."
        />
      </div>
      <ActionError message={state.formError} />
      <Button disabled={pending} type="submit">
        {pending ? 'Approving...' : 'Approve & Schedule'}
      </Button>
    </form>
  );
}
