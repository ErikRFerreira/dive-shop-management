import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** Displays the current administrator request for a booking in follow-up. */
export function MissingInfoPanel({ reason }: { reason: string | null }) {
  const displayReason = reason?.trim() || 'No reason was recorded for this request.';

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>More information needed</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm">{displayReason}</p>
      </CardContent>
    </Card>
  );
}
