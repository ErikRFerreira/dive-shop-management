import { EMPTY_VALUE } from '@/components/bookings/booking-review-display';
import { MarkNeedsMoreInfoForm } from '@/components/bookings/booking-workflow-forms';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type BookingReviewSidebarProps = {
  bookingId: string;
  rawBookingText: string | null;
  missingInformation: string[];
  isReviewable: boolean;
};

export function BookingReviewSidebar({
  bookingId,
  rawBookingText,
  missingInformation,
  isReviewable,
}: BookingReviewSidebarProps) {
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
            {isReviewable
              ? 'Decision actions will be enabled in a later issue.'
              : 'This booking is not currently pending admin review.'}
          </CardDescription>
        </CardHeader>
        {isReviewable ? (
          <CardContent className="grid gap-2">
            <Button disabled type="button">
              Approve
            </Button>
            <MarkNeedsMoreInfoForm bookingId={bookingId} />
            <Button disabled type="button" variant="destructive">
              Cancel / Reject
            </Button>
          </CardContent>
        ) : null}
      </Card>
    </aside>
  );
}
