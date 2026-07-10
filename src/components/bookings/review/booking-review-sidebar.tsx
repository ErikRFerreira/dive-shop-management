import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ReviewReadinessItem } from '@/features/bookings/review-requirements';
import type { ApprovalScheduleActivitySlot } from '@/components/bookings/workflow/approve-booking-form';
import { BookingStatus } from '@/generated/prisma/enums';
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { BookingReviewDecisionPanel } from './booking-review-decision-panel';
import { EMPTY_VALUE } from './booking-review-display';

type BookingReviewSidebarProps = {
  bookingId: string;
  canApprove: boolean;
  adminNotes: string | null;
  missingInformation: string[];
  reviewReadiness: ReviewReadinessItem[];
  scheduleActivities?: ApprovalScheduleActivitySlot[];
  status: BookingStatus;
};

const readinessStatusDetails: Record<
  ReviewReadinessItem['status'],
  {
    label: string;
    className: string;
    icon: LucideIcon;
    iconClassName: string;
  }
> = {
  complete: {
    label: 'Complete',
    className: 'bg-scheduled/10 text-scheduled ring-scheduled/20',
    icon: CheckCircle2,
    iconClassName: 'text-scheduled',
  },
  missing: {
    label: 'Missing',
    className: 'bg-destructive/10 text-destructive ring-destructive/20',
    icon: AlertCircle,
    iconClassName: 'text-destructive',
  },
  'recommended/optional': {
    label: 'Recommended/optional',
    className: 'bg-info-alert/10 text-info-alert ring-info-alert/20',
    icon: Info,
    iconClassName: 'text-info-alert',
  },
  'not required': {
    label: 'Not required',
    className: 'bg-muted text-muted-foreground ring-border',
    icon: CircleDashed,
    iconClassName: 'text-muted-foreground',
  },
};

/**
 * Checks whether a readiness item should count toward required approval checks.
 *
 * @param item - Review readiness item shown in the sidebar checklist.
 * @returns True when the item is either complete or missing required information.
 */
function isRequiredReadinessItem(item: ReviewReadinessItem) {
  return item.status === 'complete' || item.status === 'missing';
}

/**
 * Builds the required-check summary shown above the full readiness checklist.
 *
 * @param items - Readiness items, including optional and not-required rows.
 * @returns Completed required count, total required count, and missing required count.
 */
function getRequiredReadinessSummary(items: ReviewReadinessItem[]) {
  const requiredItems = items.filter(isRequiredReadinessItem);
  const completedRequiredCount = requiredItems.filter(
    (item) => item.status === 'complete',
  ).length;

  return {
    completedRequiredCount,
    missingRequiredCount: requiredItems.length - completedRequiredCount,
    totalRequiredCount: requiredItems.length,
  };
}

/**
 * Renders one read-only review readiness checklist row.
 *
 * @param props - Readiness item with label, status, and explanatory text.
 * @returns A checklist row for the review readiness card.
 */
function ReviewReadinessRow({ item }: { item: ReviewReadinessItem }) {
  const statusDetails = readinessStatusDetails[item.status];
  const StatusIcon = statusDetails.icon;

  return (
    <li className="flex items-start gap-2.5 py-2">
      <StatusIcon
        aria-hidden="true"
        className={`mt-0.5 size-4 shrink-0 ${statusDetails.iconClassName}`}
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium leading-5">{item.label}</p>
          <Badge
            className={`shrink-0 rounded-full border-transparent px-2 py-0 text-[0.68rem] leading-5 ring-1 ring-inset ${statusDetails.className}`}
            variant="outline"
          >
            {statusDetails.label}
          </Badge>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {item.description}
        </p>
      </div>
    </li>
  );
}

/**
 * Renders admin review supporting information and workflow decision forms.
 *
 * @param props - Booking workflow state, notes, readiness items, missing information, and permission flags.
 * @returns The admin review rail content rendered inside the shared sticky layout.
 */
export function BookingReviewSidebar({
  bookingId,
  canApprove,
  adminNotes,
  missingInformation,
  reviewReadiness,
  scheduleActivities = [],
  status,
}: BookingReviewSidebarProps) {
  const canApprovePendingBooking =
    canApprove && status === BookingStatus.PENDING_APPROVAL;
  const canRequestMoreInfo = status === BookingStatus.PENDING_APPROVAL;
  const canCancel =
    status === BookingStatus.PENDING_APPROVAL ||
    status === BookingStatus.NEEDS_MORE_INFO ||
    status === BookingStatus.SCHEDULED;
  const hasDecisionActions =
    canApprovePendingBooking || canRequestMoreInfo || canCancel;
  const { completedRequiredCount, missingRequiredCount, totalRequiredCount } =
    getRequiredReadinessSummary(reviewReadiness);
  const hasMissingRequiredInformation = missingRequiredCount > 0;

  return (
    <div className="space-y-6" data-testid="booking-review-sidebar">
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Review readiness</CardTitle>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              Required checks {completedRequiredCount}/{totalRequiredCount}
            </span>
          </div>
          <CardDescription>
            Use this checklist to spot missing or recommended details before
            choosing a decision.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Required checks only
            </p>
            <p
              className={`mt-1 text-sm ${
                hasMissingRequiredInformation
                  ? 'text-muted-foreground'
                  : 'text-scheduled'
              }`}
            >
              {hasMissingRequiredInformation
                ? `${missingRequiredCount} required item${
                    missingRequiredCount === 1 ? '' : 's'
                  } still missing.`
                : 'Required information is complete. Optional details can still be added.'}
            </p>
          </div>
          <ul>
            {reviewReadiness.map((item) => (
              <ReviewReadinessRow item={item} key={item.label} />
            ))}
          </ul>
        </CardContent>
      </Card>

      {missingInformation.length > 0 ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Missing information</CardTitle>
            <CardDescription>
              Review these submission requirements before making a decision.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {missingInformation.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Admin decision</CardTitle>
          <CardDescription>
            {hasDecisionActions
              ? 'Review the booking and choose the appropriate workflow action.'
              : 'This booking is not currently pending admin review.'}
          </CardDescription>
        </CardHeader>
        {hasDecisionActions ? (
          <CardContent>
            <BookingReviewDecisionPanel
              bookingId={bookingId}
              canApprovePendingBooking={canApprovePendingBooking}
              canRequestMoreInfo={canRequestMoreInfo}
              canCancel={canCancel}
              adminNotes={adminNotes}
              scheduleActivities={scheduleActivities}
              status={status}
            />
          </CardContent>
        ) : adminNotes ? (
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">
              {adminNotes || EMPTY_VALUE}
            </p>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
