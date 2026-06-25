import { EMPTY_VALUE } from '@/components/bookings/booking-review-display';
import {
  ApproveBookingForm,
  CancelBookingForm,
  MarkNeedsMoreInfoForm,
} from '@/components/bookings/booking-workflow-forms';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BookingStatus } from '@/generated/prisma/enums';

type BookingReviewSidebarProps = {
  bookingId: string;
  canApprove: boolean;
  adminNotes: string | null;
  rawBookingText: string | null;
  missingInformation: string[];
  status: BookingStatus;
};

export function BookingReviewSidebar({
  bookingId,
  canApprove,
  adminNotes,
  rawBookingText,
  missingInformation,
  status,
}: BookingReviewSidebarProps) {
  const canApprovePendingBooking =
    canApprove && status === BookingStatus.PENDING_APPROVAL;
  const canRequestMoreInfo = status === BookingStatus.PENDING_APPROVAL;
  const canCancel =
    status === BookingStatus.PENDING_APPROVAL ||
    status === BookingStatus.NEEDS_MORE_INFO;
  const hasDecisionActions =
    canApprovePendingBooking || canRequestMoreInfo || canCancel;

  return (
    <aside className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Raw booking text</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">
            {rawBookingText || EMPTY_VALUE}
          </p>
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
          <CardTitle>Admin notes</CardTitle>
          {canApprovePendingBooking ? (
            <CardDescription>
              These notes are saved when the booking is approved.
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          {canApprovePendingBooking ? (
            <ApproveBookingForm
              bookingId={bookingId}
              defaultAdminNotes={adminNotes}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm">
              {adminNotes || EMPTY_VALUE}
            </p>
          )}
        </CardContent>
      </Card>

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
          <CardContent className="grid gap-2">
            {canRequestMoreInfo ? (
              <MarkNeedsMoreInfoForm bookingId={bookingId} />
            ) : null}
            {canCancel ? <CancelBookingForm bookingId={bookingId} /> : null}
          </CardContent>
        ) : null}
      </Card>
    </aside>
  );
}
