import { TextFieldEmptyState } from '@/components/common/text-field-empty-state';
import { BookingInfoSection } from './booking-info-layout';

/**
 * Renders the original customer booking message with helpful empty text.
 *
 * @param props - Original message text from the booking.
 * @returns Read-only original booking message block.
 */
export function OriginalBookingMessageSection({
  notes,
}: {
  notes: string | null;
}) {
  const hasNotes = notes?.trim();

  return (
    <BookingInfoSection
      title="Original booking message"
      contentClassName="block sm:grid-cols-1"
    >
      {hasNotes ? (
        <p className="whitespace-pre-wrap rounded-xl bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground">
          {notes}
        </p>
      ) : (
        <TextFieldEmptyState message="No original message saved." />
      )}
    </BookingInfoSection>
  );
}
