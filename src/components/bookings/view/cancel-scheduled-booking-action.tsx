'use client';

import { useActionState, useState } from 'react';
import { XCircle } from 'lucide-react';

import { PendingButton } from '@/components/common/pending-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cancelBooking } from '@/features/bookings/actions';
import {
  ActionError,
  getInitialBookingWorkflowActionState,
} from '../workflow/workflow-action-state';

type CancelScheduledBookingActionProps = {
  bookingId: string;
};

/**
 * Renders the destructive scheduled-booking cancellation action for detail pages.
 *
 * @param props - Booking ID submitted to the cancellation Server Action.
 * @returns A full-width cancel button with confirmation dialog and pending state.
 */
export function CancelScheduledBookingAction({
  bookingId,
}: CancelScheduledBookingActionProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    cancelBooking,
    getInitialBookingWorkflowActionState(),
  );

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <Button
        className="w-full justify-center"
        onClick={() => setOpen(true)}
        type="button"
        variant="destructive"
      >
        <XCircle className="size-4" />
        Cancel booking
      </Button>
      <DialogContent>
        <form action={formAction} className="contents">
          <input name="bookingId" type="hidden" value={bookingId} />
          <DialogHeader>
            <DialogTitle>Cancel scheduled booking?</DialogTitle>
            <DialogDescription>
              This booking is already on the schedule. Cancelling it will remove
              it from active schedule views and assigned staff will no longer
              see it as active work.
            </DialogDescription>
          </DialogHeader>
          <ActionError message={state.formError} />
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={pending} type="button" variant="outline">
                Keep booking
              </Button>
            </DialogClose>
            <PendingButton
              pending={pending}
              pendingLabel="Cancelling..."
              type="submit"
              variant="destructive"
            >
              Cancel booking
            </PendingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
