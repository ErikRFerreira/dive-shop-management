import type { BookingDetailsItem } from '@/features/bookings/queries';
import { formatDateTime, formatSourceReferrer } from '../booking-detail-display';
import { Field, Section } from '../booking-detail-layout';

/**
 * Renders the booking summary metadata section.
 *
 * @param props - Booking detail payload.
 * @returns Booking summary fields.
 */
export function BookingSummarySection({
  booking,
}: {
  booking: BookingDetailsItem;
}) {
  return (
    <Section title="Booking summary">
      <Field label="Total participants" value={booking.numberOfPeople} />
      <Field label="Source / referrer" value={formatSourceReferrer(booking)} />
      <Field label="Referrer name" value={booking.referrerName} />
      <Field label="Customer service owner" value={booking.createdBy.name} />
      <Field label="Created date" value={formatDateTime(booking.createdAt)} />
      <Field label="Updated date" value={formatDateTime(booking.updatedAt)} />
    </Section>
  );
}
