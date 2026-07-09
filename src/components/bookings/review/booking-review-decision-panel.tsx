'use client';

import { useMemo, useState } from 'react';

import { CalendarCheck, MessageCircleQuestion, XCircle } from 'lucide-react';

import {
  ApproveBookingForm,
  CancelBookingForm,
  MarkNeedsMoreInfoForm,
} from '@/components/bookings/booking-workflow-forms';
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

const decisionModeIcons: Record<
  BookingReviewDecisionMode,
  typeof CalendarCheck
> = {
  approve: CalendarCheck,
  'needs-more-info': MessageCircleQuestion,
  cancel: XCircle,
};

const decisionModeActiveClasses: Record<BookingReviewDecisionMode, string> = {
  approve: 'border-primary bg-primary/10 text-primary',
  'needs-more-info': 'border-orange-500 bg-orange-500/10 text-orange-600',
  cancel: 'border-destructive bg-destructive/10 text-destructive',
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
  const [isAnyFormPending, setIsAnyFormPending] = useState(false);
  const activeMode = availableModes.includes(selectedMode)
    ? selectedMode
    : availableModes[0];

  return (
    <div className="space-y-4">
      {availableModes.length > 1 ? (
        <div
          className="grid grid-cols-3 gap-2"
          role="group"
          aria-label="Decision mode"
        >
          {availableModes.map((mode) => {
            const Icon = decisionModeIcons[mode];
            const isActive = activeMode === mode;
            return (
              <button
                aria-pressed={isActive}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border border-border bg-background px-2 py-3 text-center transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50',
                  isActive && decisionModeActiveClasses[mode],
                )}
                disabled={isAnyFormPending}
                key={mode}
                onClick={() => setSelectedMode(mode)}
                type="button"
              >
                <Icon className="h-6 w-6" />
                <span className="text-sm">{decisionModeLabels[mode]}</span>
              </button>
            );
          })}
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
            onPendingChange={setIsAnyFormPending}
          />
        </section>
      ) : null}

      {activeMode === 'needs-more-info' && canRequestMoreInfo ? (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Request more information</h3>
            <p className="text-sm text-muted-foreground">
              Return this booking to customer service with a clear reason.
            </p>
          </div>
          <MarkNeedsMoreInfoForm
            bookingId={bookingId}
            onPendingChange={setIsAnyFormPending}
          />
        </section>
      ) : null}

      {activeMode === 'cancel' && canCancel ? (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Cancel / reject</h3>
            <p className="text-sm text-muted-foreground">
              This removes the request from the review queue. It will not be
              scheduled.
            </p>
          </div>
          <CancelBookingForm
            bookingId={bookingId}
            defaultAdminNotes={adminNotes}
            onPendingChange={setIsAnyFormPending}
            status={status}
          />
        </section>
      ) : null}
    </div>
  );
}
