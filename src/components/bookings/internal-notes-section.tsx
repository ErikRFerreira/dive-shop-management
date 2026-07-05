import { TextFieldEmptyState } from '@/components/common/text-field-empty-state';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import { BookingInfoField, BookingInfoSection } from './booking-info-layout';

type InternalNotesVariant = 'details' | 'review';

/**
 * Renders internal notes with page-specific review/detail presentation.
 *
 * @param props - Booking detail payload and internal-notes page variant.
 * @returns Internal notes section.
 */
export function InternalNotesSection({
  booking,
  variant,
}: {
  booking: BookingDetailsItem;
  variant: InternalNotesVariant;
}) {
  const hasInternalNotes = booking.internalNotes?.trim();

  if (variant === 'review') {
    return (
      <BookingInfoSection title="Internal notes from customer service">
        <div className="sm:col-span-2">
          {hasInternalNotes ? (
            <p className="whitespace-pre-wrap text-sm">
              {booking.internalNotes}
            </p>
          ) : (
            <TextFieldEmptyState message="No internal notes from customer service." />
          )}
        </div>
      </BookingInfoSection>
    );
  }

  return (
    <BookingInfoSection title="Internal notes">
      <BookingInfoField
        label="Internal notes"
        value={booking.internalNotes?.trim() || 'No internal notes.'}
      />
      <BookingInfoField
        label="Admin notes"
        value={booking.adminNotes?.trim() || 'No admin notes yet.'}
      />
    </BookingInfoSection>
  );
}
