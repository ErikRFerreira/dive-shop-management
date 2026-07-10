import Link from 'next/link';

import { ResubmitBookingForApprovalForm } from '@/components/bookings/booking-workflow-forms';
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getActiveBookingParticipants } from '@/features/bookings/participants';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import { summarizeBookingActivities } from '@/features/bookings/utils';
import { formatDisplayDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { BookingStatus, DepositStatus } from '@/generated/prisma/enums';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Pencil,
} from 'lucide-react';
import type { BookingDetailAction } from './booking-detail-actions';
import type { BookingActivityDisplay } from './booking-detail-display';
import { CancelScheduledBookingAction } from './cancel-scheduled-booking-action';
import {
  formatCustomerName,
  getPrimaryBookingCustomer,
  includesFunDiveActivity,
} from './booking-detail-display';

export type { BookingDetailAction } from './booking-detail-actions';

type BookingDetailsRailProps = {
  actions: BookingDetailAction[];
  activities: BookingActivityDisplay[];
  booking: BookingDetailsItem;
  canCancel: boolean;
  canResubmit: boolean;
};

type ReviewReadinessItem = {
  label: string;
  complete: boolean;
  helperText: string;
};

/**
 * Checks whether a nullable string contains visible text.
 *
 * @param value - Optional text from the booking detail payload.
 * @returns True when the value contains non-whitespace content.
 */
function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

/**
 * Checks whether the primary contact has at least one usable contact method.
 *
 * @param bookingCustomer - Primary booking customer row, when available.
 * @returns True when WeChat, WhatsApp, email, or phone is present.
 */
function hasPrimaryContactMethod(
  bookingCustomer: BookingDetailsItem['customers'][number] | null,
) {
  const customer = bookingCustomer?.customer;

  return [
    customer?.weChatId,
    customer?.whatsAppNumber,
    customer?.email,
    customer?.phone,
  ].some(hasText);
}

/**
 * Checks whether all active fun-dive participants have core diving experience details.
 *
 * @param booking - Booking detail payload with customer/diver rows.
 * @returns True when every active customer row has the expected fun-dive experience fields.
 */
function hasDivingExperienceForFunDive(booking: BookingDetailsItem) {
  return getActiveBookingParticipants(booking.customers).every(
    (customer) =>
      hasText(customer.certificationLevel) &&
      customer.lastDiveAt !== null &&
      customer.divesLogged !== null,
  );
}

/**
 * Checks whether paid or partially paid deposits include their required payment fields.
 *
 * @param booking - Booking detail payload with deposit rows.
 * @returns True when no paid deposit is incomplete.
 */
function hasCompletePaidDepositDetails(booking: BookingDetailsItem) {
  return booking.deposits.every((deposit) => {
    if (
      deposit.status !== DepositStatus.PAID &&
      deposit.status !== DepositStatus.PARTIALLY_PAID
    ) {
      return true;
    }

    return (
      deposit.amount !== null &&
      hasText(deposit.currency) &&
      hasText(deposit.paidTo)
    );
  });
}

/**
 * Builds the display-only review readiness checklist for the sticky detail rail.
 *
 * @param booking - Booking detail payload.
 * @param activities - Normalized activity rows visible on the detail page.
 * @returns Readiness rows derived from existing booking information.
 */
function buildReviewReadinessItems(
  booking: BookingDetailsItem,
  activities: BookingActivityDisplay[],
): ReviewReadinessItem[] {
  const primaryCustomer = getPrimaryBookingCustomer(booking);
  const firstActivityWithDate =
    activities.find((activity) => activity.requestedDate) ?? activities[0];
  const activitySummary = summarizeBookingActivities(
    booking.activities,
    booking.activityType,
  );
  const includesFunDive = includesFunDiveActivity(activities);

  const readinessItems: ReviewReadinessItem[] = [
    {
      label: 'Activity selected',
      complete: activities.some((activity) => activity.activityType !== null),
      helperText: activitySummary,
    },
    {
      label: 'Requested date set',
      complete: Boolean(firstActivityWithDate?.requestedDate),
      helperText: formatDisplayDate(firstActivityWithDate?.requestedDate),
    },
    {
      label: 'Primary customer set',
      complete: Boolean(primaryCustomer),
      helperText: formatCustomerName(primaryCustomer?.customer ?? null),
    },
    {
      label: 'Contact method present',
      complete: hasPrimaryContactMethod(primaryCustomer),
      helperText: hasPrimaryContactMethod(primaryCustomer)
        ? 'Contact details available'
        : 'Add WeChat, WhatsApp, email, or phone',
    },
    {
      label: 'Deposit details complete',
      complete: hasCompletePaidDepositDetails(booking),
      helperText:
        booking.deposits.length === 0
          ? 'No deposit on file.'
          : 'Paid deposits include amount, currency, and recipient.',
    },
  ];

  if (includesFunDive) {
    readinessItems.push({
      label: 'Diving experience',
      complete: hasDivingExperienceForFunDive(booking),
      helperText: 'Required for fun dive review.',
    });
  }

  return readinessItems;
}

/**
 * Selects the small icon used for a status-aware booking action.
 *
 * @param label - Action label shown to staff.
 * @returns An icon component that matches the action intent.
 */
function getActionIcon(label: string) {
  if (label.includes('Review')) return ClipboardCheck;
  if (label.includes('Edit') || label.includes('Fix')) return Pencil;
  if (label.includes('schedule')) return CalendarDays;
  return ArrowLeft;
}

/**
 * Renders status-aware booking detail navigation actions in the sticky rail.
 *
 * @param props - Ordered action links for the current booking status.
 * @returns Rail action buttons.
 */
function BookingDetailActions({ actions }: { actions: BookingDetailAction[] }) {
  return (
    <div className="grid gap-2">
      {actions.map((action) => {
        const Icon = getActionIcon(action.label);

        return (
          <Button
            asChild
            className="w-full"
            key={`${action.href}-${action.label}`}
            variant={action.variant}
          >
            <Link href={action.href}>
              <Icon className="size-4" />
              {action.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

/**
 * Returns the short status explanation shown in the sticky operational rail.
 *
 * @param status - Current booking workflow status.
 * @returns Staff-facing status explanation text.
 */
function getStatusDescription(status: BookingStatus) {
  switch (status) {
    case BookingStatus.DRAFT:
      return 'Saved as a draft before customer service submits it for review.';
    case BookingStatus.PENDING_APPROVAL:
      return 'Waiting for admin review before it can appear on the schedule.';
    case BookingStatus.NEEDS_MORE_INFO:
      return 'Customer service needs to update the request before approval.';
    case BookingStatus.APPROVED:
      return 'Approved and ready for schedule coordination.';
    case BookingStatus.SCHEDULED:
      return 'Scheduled and visible on the internal calendar.';
    case BookingStatus.CANCELLED:
      return 'Cancelled bookings stay available for historical reference.';
  }
}

/**
 * Renders the sticky booking status and action card.
 *
 * @param props - Booking status, actions, and optional resubmit state.
 * @returns Right-rail status card with preserved workflow actions.
 */
function BookingStatusRailCard({
  actions,
  booking,
  canCancel,
  canResubmit,
}: {
  actions: BookingDetailAction[];
  booking: BookingDetailsItem;
  canCancel: boolean;
  canResubmit: boolean;
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Booking status</CardTitle>
          <BookingStatusBadge status={booking.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {getStatusDescription(booking.status)}
        </p>
        {booking.status === BookingStatus.NEEDS_MORE_INFO &&
        booking.needsMoreInfoReason ? (
          <div className="rounded-xl border border-info-alert/20 bg-info-alert/10 p-3 text-sm">
            <p className="font-medium text-info-alert">Needs more info</p>
            <p className="mt-1 text-muted-foreground">
              {booking.needsMoreInfoReason}
            </p>
          </div>
        ) : null}
        <BookingDetailActions actions={actions} />
        {canCancel ? (
          <CancelScheduledBookingAction bookingId={booking.id} />
        ) : null}
        {canResubmit ? (
          <ResubmitBookingForApprovalForm bookingId={booking.id} />
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Renders one display-only readiness item in the booking detail rail.
 *
 * @param props - Readiness item label, state, and helper text.
 * @returns A compact checklist row.
 */
function ReviewReadinessRow({ item }: { item: ReviewReadinessItem }) {
  const Icon = item.complete ? CheckCircle2 : Circle;

  return (
    <li className="flex items-start gap-3">
      <Icon
        aria-hidden="true"
        className={cn(
          'mt-0.5 size-4 shrink-0',
          item.complete ? 'text-scheduled' : 'text-muted-foreground/50',
        )}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{item.label}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          {item.helperText}
        </p>
      </div>
    </li>
  );
}

/**
 * Renders the display-only review readiness card for the sticky detail rail.
 *
 * @param props - Readiness items derived from the current booking data.
 * @returns Right-rail readiness card.
 */
function ReviewReadinessCard({ items }: { items: ReviewReadinessItem[] }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Review readiness
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {items.map((item) => (
            <ReviewReadinessRow item={item} key={item.label} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * Renders the booking detail sticky rail without the redundant quick summary card.
 *
 * @param props - Booking, action, permission, and activity data for rail display.
 * @returns Sticky-rail status and readiness cards.
 */
export function BookingDetailsRail({
  actions,
  activities,
  booking,
  canCancel,
  canResubmit,
}: BookingDetailsRailProps) {
  const reviewReadinessItems = buildReviewReadinessItems(booking, activities);

  return (
    <>
      <BookingStatusRailCard
        actions={actions}
        booking={booking}
        canCancel={canCancel}
        canResubmit={canResubmit}
      />
      {booking.status !== BookingStatus.CANCELLED && (
        <ReviewReadinessCard items={reviewReadinessItems} />
      )}
    </>
  );
}
