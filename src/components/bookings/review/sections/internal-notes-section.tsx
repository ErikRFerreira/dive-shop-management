import { EMPTY_VALUE, ReviewDetailsCard } from '../booking-review-display';

/**
 * Renders the customer-service internal notes visible during admin review.
 *
 * @param props - Internal notes text stored on the booking.
 * @returns Internal notes review section.
 */
export function InternalNotesSection({
  internalNotes,
}: {
  internalNotes: string | null;
}) {
  return (
    <ReviewDetailsCard title="Internal notes from customer service">
      <div className="sm:col-span-2">
        <p className="whitespace-pre-wrap text-sm">
          {internalNotes || EMPTY_VALUE}
        </p>
      </div>
    </ReviewDetailsCard>
  );
}
