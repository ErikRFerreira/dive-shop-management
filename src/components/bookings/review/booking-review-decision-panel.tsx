'use client';

import { useMemo, useState } from 'react';

import {
  ApproveBookingForm,
  CancelBookingForm,
  MarkNeedsMoreInfoForm,
} from '@/components/bookings/booking-workflow-forms';
import { Button } from '@/components/ui/button';
import { BookingStatus } from '@/generated/prisma/enums';
import { cn } from '@/lib/utils';

type BookingReviewDecisionMode = 'approve' | 'needs-more-info' | 'cancel';

type BookingReviewDecisionPanelProps = {
  bookingId: string;
  canApprovePendingBooking: boolean;
  canRequestMoreInfo: boolean;
  canCancel: boolean;
  adminNotes: string | null;
  status: BookingStatus;
};

const decisionModeLabels: Record<BookingReviewDecisionMode, string> = {
  approve: 'Approve & schedule',
  'needs-more-info': 'Request more information',
  cancel: 'Cancel / reject',
};

/**
 * Chooses the initial progressive decision mode for the current booking state.
 *
 * @param props - Available admin workflow actions for the booking.
 * @returns The preferred initial decision mode, prioritizing approval when possible.
 */
function getInitialDecisionMode({
  canApprovePendingBooking,
  canRequestMoreInfo,
  canCancel,
}: Pick<
  BookingReviewDecisionPanelProps,
  'canApprovePendingBooking' | 'canRequestMoreInfo' | 'canCancel'
>): BookingReviewDecisionMode {
  if (canApprovePendingBooking) {
    return 'approve';
  }

  if (canRequestMoreInfo) {
    return 'needs-more-info';
  }

  return canCancel ? 'cancel' : 'approve';
}

/**
 * Builds the selectable decision modes backed by available workflow actions.
 *
 * @param props - Available admin workflow actions for the booking.
 * @returns Decision modes that should be offered to the reviewer.
 */
function getAvailableDecisionModes({
  canApprovePendingBooking,
  canRequestMoreInfo,
  canCancel,
}: Pick<
  BookingReviewDecisionPanelProps,
  'canApprovePendingBooking' | 'canRequestMoreInfo' | 'canCancel'
>) {
  const modes: BookingReviewDecisionMode[] = [];

  if (canApprovePendingBooking) {
    modes.push('approve');
  }

  if (canRequestMoreInfo) {
    modes.push('needs-more-info');
  }

  if (canCancel) {
    modes.push('cancel');
  }

  return modes;
}

/**
 * Renders the selected admin decision form while keeping alternate actions collapsed.
 *
 * @param props - Booking identity, workflow availability, notes, and status for existing action forms.
 * @returns Progressive admin decision controls for the review sidebar.
 */
export function BookingReviewDecisionPanel({
  bookingId,
  canApprovePendingBooking,
  canRequestMoreInfo,
  canCancel,
  adminNotes,
  status,
}: BookingReviewDecisionPanelProps) {
  const availableModes = useMemo(
    () =>
      getAvailableDecisionModes({
        canApprovePendingBooking,
        canRequestMoreInfo,
        canCancel,
      }),
    [canApprovePendingBooking, canCancel, canRequestMoreInfo],
  );
  const [selectedMode, setSelectedMode] = useState<BookingReviewDecisionMode>(
    getInitialDecisionMode({
      canApprovePendingBooking,
      canRequestMoreInfo,
      canCancel,
    }),
  );
  const activeMode = availableModes.includes(selectedMode)
    ? selectedMode
    : availableModes[0];

  return (
    <div className="space-y-4">
      {availableModes.length > 1 ? (
        <div className="grid gap-2" role="group" aria-label="Decision mode">
          {availableModes.map((mode) => (
            <Button
              aria-pressed={activeMode === mode}
              className={cn(
                'justify-start',
                activeMode === mode && 'ring-2 ring-ring/30',
              )}
              key={mode}
              onClick={() => setSelectedMode(mode)}
              type="button"
              variant={activeMode === mode ? 'secondary' : 'outline'}
            >
              {decisionModeLabels[mode]}
            </Button>
          ))}
        </div>
      ) : null}

      {activeMode === 'approve' && canApprovePendingBooking ? (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Approve &amp; schedule</h3>
            <p className="text-sm text-muted-foreground">
              Move this booking to the internal schedule.
            </p>
          </div>
          <ApproveBookingForm
            bookingId={bookingId}
            defaultAdminNotes={adminNotes}
          />
        </section>
      ) : null}

      {activeMode === 'needs-more-info' && canRequestMoreInfo ? (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">
              Request more information
            </h3>
            <p className="text-sm text-muted-foreground">
              Return this booking to customer service with a clear reason.
            </p>
          </div>
          <MarkNeedsMoreInfoForm bookingId={bookingId} />
        </section>
      ) : null}

      {activeMode === 'cancel' && canCancel ? (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Cancel / reject</h3>
            <p className="text-sm text-muted-foreground">
              Cancel the booking without deleting booking, customer, diver, or
              deposit data.
            </p>
          </div>
          <CancelBookingForm
            bookingId={bookingId}
            defaultAdminNotes={adminNotes}
            status={status}
          />
        </section>
      ) : null}
    </div>
  );
}
