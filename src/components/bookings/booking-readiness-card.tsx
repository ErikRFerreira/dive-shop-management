import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type BookingReadinessItem = {
  label: string;
  complete: boolean;
  helperText?: string;
};

type BookingReadinessCardProps = {
  items: BookingReadinessItem[];
  children: ReactNode;
};

/**
 * Renders the sticky booking submission readiness summary and action area.
 *
 * @param props - Checklist items and action controls rendered inside the card.
 * @returns A booking readiness card for the create booking form rail.
 */
export function BookingReadinessCard({
  items,
  children,
}: BookingReadinessCardProps) {
  const incompleteCount = items.filter((item) => !item.complete).length;

  return (
    <Card data-testid="booking-readiness-card">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Booking readiness</CardTitle>
          <Badge variant="secondary">Draft</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Required before submission
          </p>
          <p className="text-sm text-muted-foreground">
            {incompleteCount === 0
              ? 'Ready to submit.'
              : `${incompleteCount} item${incompleteCount === 1 ? '' : 's'} still needed.`}
          </p>
          <ul className="space-y-2">
            {items.map((item) => (
              <li className="flex items-start gap-2" key={item.label}>
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-1 size-2.5 shrink-0 rounded-full border',
                    item.complete
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/50',
                  )}
                />
                <span>
                  <span className="block text-sm">{item.label}</span>
                  {item.helperText ? (
                    <span className="block text-xs text-muted-foreground">
                      {item.helperText}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t pt-4">{children}</div>
      </CardContent>
    </Card>
  );
}
