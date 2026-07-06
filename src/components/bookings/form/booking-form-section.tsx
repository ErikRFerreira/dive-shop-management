import type { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type BookingFormSectionProps = {
  title: string;
  description?: string;
  sectionNumber?: number;
  children: ReactNode;
};

/**
 * Groups a related set of booking intake controls in a consistent card layout.
 *
 * @param props - Section title, optional number/description, and form controls.
 * @returns A card-wrapped booking form section.
 */
export function BookingFormSection({
  title,
  description,
  sectionNumber,
  children,
}: BookingFormSectionProps) {
  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border">
        <div className="flex items-start gap-3">
          {sectionNumber ? (
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20">
              {sectionNumber}
            </span>
          ) : null}
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {children}
      </CardContent>
    </Card>
  );
}
