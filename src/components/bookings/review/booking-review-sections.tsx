import type { BookingDetailsItem } from '@/features/bookings/queries';
import type { ReviewActivity } from './booking-review-activities';
import {
  Field,
  ReviewDetailsCard,
  formatSourceReferrer,
} from './booking-review-display';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ActivitiesSection } from './sections/activities-section';
import { CustomersSection } from './sections/customers-section';
import { DepositsSection } from './sections/deposits-section';
import { InternalNotesSection } from './sections/internal-notes-section';

type ReviewSectionsProps = {
  booking: BookingDetailsItem;
  activities: ReviewActivity[];
  includesFunDive: boolean;
};

/**
 * Renders the original customer message inside the main admin review flow.
 *
 * @param props - Optional original booking message captured during intake.
 * @returns Read-only original message card with an explicit empty state.
 */
function OriginalBookingMessageCard({ notes }: { notes: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Original booking message</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm">
          {notes?.trim() || 'No original message saved.'}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Renders the main column of booking information used during admin review, including the original message source.
 *
 * @param props - Booking details, normalized activities, and activity context.
 * @returns Main admin review content sections.
 */
export function BookingReviewMainSections({
  booking,
  activities,
  includesFunDive,
}: ReviewSectionsProps) {
  return (
    <main className="space-y-6">
      <ReviewDetailsCard title="Booking summary">
        <Field label="Total participants" value={booking.numberOfPeople} />
        <Field label="Customer service owner" value={booking.createdBy.name} />
        <Field label="Source / referrer" value={formatSourceReferrer(booking)} />
      </ReviewDetailsCard>

      <OriginalBookingMessageCard notes={booking.notes} />
      <ActivitiesSection activities={activities} />
      <CustomersSection booking={booking} includesFunDive={includesFunDive} />
      <DepositsSection booking={booking} />
      <InternalNotesSection internalNotes={booking.internalNotes} />
    </main>
  );
}
