import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const completeCount = items.filter((item) => item.complete).length;
  const totalCount = items.length;
  const canSubmit = incompleteCount === 0;

  return (
    <Card
      data-testid="booking-readiness-card"
      className="rounded-2xl border border-border bg-card shadow-sm"
    >
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-heading text-base font-semibold">
            Booking readiness
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5 py-2">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Required before submission
            </p>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {completeCount}/{totalCount}
            </span>
          </div>
          <p
            className={cn(
              'mt-1 text-sm',
              canSubmit ? 'text-scheduled' : 'text-muted-foreground',
            )}
          >
            {canSubmit
              ? 'All required information is complete.'
              : `${incompleteCount} item${incompleteCount === 1 ? '' : 's'} still needed.`}
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const Icon = item.complete ? CheckCircle2 : AlertTriangle;
            const iconClass = item.complete ? 'text-scheduled' : 'text-pending';
            const textClass = item.complete
              ? 'text-foreground'
              : 'font-medium text-foreground';

            return (
              <li className="flex items-start gap-2.5 py-0.5" key={item.label}>
                <Icon
                  className={cn('mt-px size-[1.05rem] shrink-0', iconClass)}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className={cn('text-sm leading-tight', textClass)}>
                    {item.label}
                  </p>
                  {item.helperText ? (
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                      {item.helperText}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
