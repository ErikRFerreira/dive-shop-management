import type { BookingDetailsItem } from '@/features/bookings/queries';
import type { ReviewActivity } from './booking-review-activities';
import { Field, ReviewDetailsCard, formatEnum } from './booking-review-display';
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
 * Renders the main column of booking information used during admin review.
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
      <ReviewDetailsCard title="Booking details">
        <Field label="Number of people" value={booking.numberOfPeople} />
        <Field label="Customer service owner" value={booking.createdBy.name} />
        <Field label="Source/referrer" value={formatEnum(booking.source)} />
        <Field label="Referrer name" value={booking.referrerName} />
      </ReviewDetailsCard>

      <ActivitiesSection activities={activities} />
      <CustomersSection booking={booking} includesFunDive={includesFunDive} />
      <DepositsSection booking={booking} />
      <InternalNotesSection internalNotes={booking.internalNotes} />
    </main>
  );
}
