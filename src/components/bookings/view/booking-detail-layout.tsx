import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { EMPTY_VALUE } from './booking-detail-display';

/**
 * Renders a label/value pair in the booking detail view.
 *
 * @param props - Field label and rendered value.
 * @returns A compact booking detail field.
 */
export function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  const displayValue =
    value === null || value === undefined || value === '' ? EMPTY_VALUE : value;

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 break-words text-sm font-medium">{displayValue}</div>
    </div>
  );
}

/**
 * Renders a titled booking detail section with a two-column content grid.
 *
 * @param props - Section title and child content.
 * @returns A bordered detail section.
 */
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="border-b">
        <h2 className="font-heading text-base font-medium leading-snug">
          {title}
        </h2>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

/**
 * Renders one icon-backed metadata item in the booking reference card.
 *
 * @param props - Icon, label, and value for the metadata item.
 * @returns A compact operational metadata row.
 */
export function BookingReferenceMetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  const displayValue =
    value === null || value === undefined || value === '' ? EMPTY_VALUE : value;

  return (
    <div className="flex min-w-0 gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-0.5 break-words text-sm font-semibold">
          {displayValue}
        </div>
      </div>
    </div>
  );
}
