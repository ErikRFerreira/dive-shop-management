import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Renders the original customer message with helpful empty text.
 *
 * @param props - Original message text from the booking.
 * @returns Read-only original booking message block.
 */
export function OriginalBookingMessage({ notes }: { notes: string | null }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="border-b">
        <CardTitle>Original booking message</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {notes?.trim() || 'No original message saved.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
