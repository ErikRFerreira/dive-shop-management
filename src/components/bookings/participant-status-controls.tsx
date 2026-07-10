'use client';

import { useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  updateBookingParticipantStatus,
  type BookingParticipantStatusActionResult,
} from '@/features/bookings/actions';
import { formatParticipantStatusLabel } from '@/features/bookings/participants';
import {
  BookingParticipantStatus,
  type BookingParticipantStatus as BookingParticipantStatusValue,
} from '@/generated/prisma/enums';

export const participantStatuses = Object.values(BookingParticipantStatus);
export const participantStatusSelectClass =
  'h-8 min-w-36 truncate rounded-lg border border-border bg-background px-2.5 text-xs text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 [&>span]:truncate';

type ParticipantStatusActionErrorProps = {
  message?: string;
};

/**
 * Renders a compact visual label for a participant's operational status.
 *
 * @param props - Participant status to format.
 * @returns Status badge with severity matched to operational meaning.
 */
export function ParticipantStatusBadge({
  status,
}: {
  status: BookingParticipantStatusValue;
}) {
  const variant =
    status === BookingParticipantStatus.ACTIVE
      ? 'secondary'
      : status === BookingParticipantStatus.CANCELLED
        ? 'destructive'
        : 'outline';

  return (
    <Badge variant={variant}>{formatParticipantStatusLabel(status)}</Badge>
  );
}

/**
 * Renders the admin/manager participant status picker for a scheduled booking.
 *
 * @param props - Booking/customer identifiers and the current participant status.
 * @returns A compact status select with inline server-action feedback.
 */
export function ParticipantStatusSelect({
  bookingId,
  customerId,
  status,
}: {
  bookingId: string;
  customerId: string;
  status: BookingParticipantStatusValue;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pendingActionRef = useRef(false);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [error, setError] = useState<string>();
  const statusSelectId = useId();
  const isActionPending = isPending || isActionInFlight;

  /**
   * Persists a participant status change through the booking server action.
   *
   * @param nextStatus - New operational status selected by an Admin or Manager.
   */
  function handleStatusChange(nextStatus: BookingParticipantStatusValue) {
    if (nextStatus === status || pendingActionRef.current || isActionPending) {
      return;
    }

    pendingActionRef.current = true;
    setIsActionInFlight(true);
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await updateBookingParticipantStatus(
          bookingId,
          customerId,
          nextStatus,
        );
        handleParticipantStatusActionResult(result, router.refresh, setError);
      } finally {
        pendingActionRef.current = false;
        setIsActionInFlight(false);
      }
    });
  }

  return (
    <div className="grid gap-1">
      <Label className="sr-only" htmlFor={statusSelectId}>
        Participant status
      </Label>
      <Select
        disabled={isActionPending}
        onValueChange={(nextStatus) =>
          handleStatusChange(nextStatus as BookingParticipantStatusValue)
        }
        value={status}
      >
        <SelectTrigger
          id={statusSelectId}
          className={participantStatusSelectClass}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {participantStatuses.map((participantStatus) => (
            <SelectItem key={participantStatus} value={participantStatus}>
              {formatParticipantStatusLabel(participantStatus)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ParticipantStatusActionError message={error} />
    </div>
  );
}

/**
 * Applies a participant status action result to the client UI.
 *
 * @param result - Result returned by the participant status server action.
 * @param refresh - Callback that refreshes the current route.
 * @param setError - Callback that stores inline error text.
 */
export function handleParticipantStatusActionResult(
  result: BookingParticipantStatusActionResult,
  refresh: () => void,
  setError: (message?: string) => void,
) {
  if (result.success) {
    refresh();
    return;
  }

  setError(getParticipantStatusActionErrorMessage(result));
}

/**
 * Formats server action errors for inline participant status display.
 *
 * @param result - Failed participant status action result.
 * @returns A single staff-facing error message.
 */
export function getParticipantStatusActionErrorMessage(
  result: Extract<BookingParticipantStatusActionResult, { success: false }>,
) {
  const fieldError = result.fieldErrors
    ? Object.values(result.fieldErrors).flat()[0]
    : undefined;

  return (
    result.formError ?? fieldError ?? 'Unable to update participant status.'
  );
}

/**
 * Renders an accessible inline participant status action error.
 *
 * @param props - Optional error message.
 * @returns Inline error text when a message exists.
 */
export function ParticipantStatusActionError({
  message,
}: ParticipantStatusActionErrorProps) {
  return message ? (
    <p aria-live="polite" className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}
