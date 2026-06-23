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
  children: ReactNode;
};

/**
 * Groups a related set of booking intake controls in a consistent card layout.
 *
 * @param props - Section title, optional description, and form controls.
 * @returns A card-wrapped booking form section.
 */
export function BookingFormSection({
  title,
  description,
  children,
}: BookingFormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">{children}</CardContent>
    </Card>
  );
}
