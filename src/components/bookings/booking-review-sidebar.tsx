import { EMPTY_VALUE } from '@/components/bookings/booking-review-display';
import {
  CancelBookingForm,
  MarkNeedsMoreInfoForm,
} from '@/components/bookings/booking-workflow-forms';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { BookingStatus } from '@/generated/prisma/enums';

type BookingReviewSidebarProps = {
  bookingId: string;
  rawBookingText: string | null;
  missingInformation: string[];
  status: BookingStatus;
};

export function BookingReviewSidebar({
  bookingId,
  rawBookingText,
  missingInformation,
  status,
}: BookingReviewSidebarProps) {
  const canRequestMoreInfo = status === BookingStatus.PENDING_APPROVAL;
  const canCancel =
    status === BookingStatus.PENDING_APPROVAL ||
    status === BookingStatus.NEEDS_MORE_INFO;
  const hasDecisionActions = canRequestMoreInfo || canCancel;

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
          <CardDescription>
            Saving admin notes will be enabled with the decision workflow in a
            later issue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea disabled placeholder="Admin notes are not saved yet." />
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
              <Button disabled type="button">
                Approve
              </Button>
            ) : null}
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
