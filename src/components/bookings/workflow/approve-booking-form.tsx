'use client';

import { useActionState, useEffect } from 'react';

import { PendingButton } from '@/components/common/pending-button';
import { Textarea } from '@/components/ui/textarea';
import { approveBooking } from '@/features/bookings/actions';

import {
  ActionError,
  getInitialBookingWorkflowActionState,
} from './workflow-action-state';
import { CalendarCheck } from 'lucide-react';

type ApproveBookingFormProps = {
  bookingId: string;
  defaultAdminNotes?: string | null;
  noteDescription?: string;
  noteLabel?: string;
  onPendingChange?: (pending: boolean) => void;
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
  noteLabel = 'Admin/schedule notes',
  noteDescription,
  onPendingChange,
}: ApproveBookingFormProps) {
  const [state, formAction, pending] = useActionState(
    approveBooking,
    getInitialBookingWorkflowActionState(),
  );

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  return (
    <form action={formAction} className="grid gap-3">
      <input name="bookingId" type="hidden" value={bookingId} />
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="admin-notes">
          {noteLabel}
        </label>
        {noteDescription && (
          <p className="text-sm text-muted-foreground">{noteDescription}</p>
        )}
        <Textarea
          className="min-h-20 resize-none rounded-lg bg-background px-3 py-2 leading-relaxed text-foreground shadow-sm placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/30"
          defaultValue={defaultAdminNotes ?? ''}
          id="admin-notes"
          name="adminNotes"
          placeholder="Add notes for admin review or the internal schedule."
        />
      </div>
      <ActionError message={state.formError} />
      <PendingButton
        pending={pending}
        pendingLabel="Approving..."
        type="submit"
      >
        <CalendarCheck />
        Approve & Schedule
      </PendingButton>
    </form>
  );
}
