import { TextFieldEmptyState } from '@/components/common/text-field-empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="border-b">
        <CardTitle>Original booking message</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {hasNotes ? (
          <p className="whitespace-pre-wrap rounded-xl bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground">
            {notes}
          </p>
        ) : (
          <TextFieldEmptyState message="No original message saved." />
        )}
      </CardContent>
    </Card>
  );
}
