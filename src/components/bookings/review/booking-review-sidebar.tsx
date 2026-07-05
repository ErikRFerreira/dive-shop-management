import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ReviewReadinessItem } from '@/features/bookings/review-requirements';
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
 * @returns The admin review sidebar.
 */
export function BookingReviewSidebar({
  bookingId,
  canApprove,
  adminNotes,
  missingInformation,
  reviewReadiness,
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

  return (
    <aside className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review readiness</CardTitle>
          <CardDescription>
            Use this checklist to spot missing or recommended details before
            choosing a decision.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
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
    </aside>
  );
}
