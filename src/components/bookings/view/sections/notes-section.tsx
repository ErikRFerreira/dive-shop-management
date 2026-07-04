import type { BookingDetailsItem } from '@/features/bookings/queries';
import { Field, Section } from '../booking-detail-layout';

/**
 * Renders internal and admin notes with helpful empty-state text.
 *
 * @param props - Booking detail payload.
 * @returns Notes section.
 */
export function NotesSection({ booking }: { booking: BookingDetailsItem }) {
  return (
    <Section title="Internal notes">
      <Field
        label="Internal notes"
        value={booking.internalNotes?.trim() || 'No internal notes.'}
      />
      <Field
        label="Admin notes"
        value={booking.adminNotes?.trim() || 'No admin notes yet.'}
      />
    </Section>
  );
}
