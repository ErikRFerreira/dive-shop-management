'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { Edit, Eye, MoreHorizontal, ShieldCheck, XCircle } from 'lucide-react';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cancelBooking } from '@/features/bookings/actions';
import type { BookingRowAction } from '@/features/bookings/permissions';
import {
  ActionError,
  getInitialBookingWorkflowActionState,
} from '../workflow/workflow-action-state';

type BookingRowActionsMenuProps = {
  actions: BookingRowAction[];
  bookingId: string;
};

/**
 * Returns the route href for a booking row navigation action.
 *
 * @param action - Navigation action selected for the row.
 * @param bookingId - Booking request ID used in the route.
 * @returns The route href for the selected row action.
 */
function getBookingRowActionHref(action: BookingRowAction, bookingId: string) {
  if (action === 'edit') {
    return `/bookings/${bookingId}/edit`;
  }

  if (action === 'review') {
    return `/bookings/${bookingId}/review`;
  }

  return `/bookings/${bookingId}`;
}

/**
 * Returns the visible label for a booking row action.
 *
 * @param action - Row action selected for the booking.
 * @returns The staff-facing action label.
 */
function getBookingRowActionLabel(action: BookingRowAction) {
  if (action === 'edit') {
    return 'Edit booking';
  }

  if (action === 'review') {
    return 'Review booking';
  }

  if (action === 'cancel') {
    return 'Cancel booking';
  }

  return 'View details';
}

/**
 * Returns the icon for a booking row action.
 *
 * @param action - Row action selected for the booking.
 * @returns An icon component matching the row action.
 */
function getBookingRowActionIcon(action: BookingRowAction) {
  if (action === 'edit') {
    return Edit;
  }

  if (action === 'review') {
    return ShieldCheck;
  }

  if (action === 'cancel') {
    return XCircle;
  }

  return Eye;
}

/**
 * Renders the client-side row action menu and scheduled cancellation dialog.
 *
 * @param props - Booking ID and resolved actions authorized by the server wrapper.
 * @returns A dropdown menu with navigation links and an optional cancellation confirmation.
 */
export function BookingRowActionsMenu({
  actions,
  bookingId,
}: BookingRowActionsMenuProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    cancelBooking,
    getInitialBookingWorkflowActionState(),
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Open actions for booking ${bookingId}`}
            size="icon"
            variant="ghost"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map((action) => {
            const Icon = getBookingRowActionIcon(action);

            if (action === 'cancel') {
              return (
                <DropdownMenuItem
                  key={action}
                  onSelect={(event) => {
                    event.preventDefault();
                    setCancelDialogOpen(true);
                  }}
                  variant="destructive"
                >
                  <Icon className="h-4 w-4" />
                  {getBookingRowActionLabel(action)}
                </DropdownMenuItem>
              );
            }

            return (
              <DropdownMenuItem asChild key={action}>
                <Link href={getBookingRowActionHref(action, bookingId)}>
                  <Icon className="h-4 w-4" />
                  {getBookingRowActionLabel(action)}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog onOpenChange={setCancelDialogOpen} open={cancelDialogOpen}>
        <DialogContent>
          <form action={formAction} className="contents">
            <input name="bookingId" type="hidden" value={bookingId} />
            <DialogHeader>
              <DialogTitle>Cancel scheduled booking?</DialogTitle>
              <DialogDescription>
                This booking is already on the schedule. Cancelling it will
                remove it from active schedule views and assigned staff will no
                longer see it as active work.
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
    </>
  );
}
