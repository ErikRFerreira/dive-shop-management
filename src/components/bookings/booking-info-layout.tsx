import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';
import { EMPTY_BOOKING_VALUE } from './booking-display-utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

/**
 * Renders a label/value pair in read-only booking information sections.
 *
 * @param props - Field label and rendered value.
 * @returns A compact booking information field.
 */
export function BookingInfoField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  const displayValue =
    value === null || value === undefined || value === ''
      ? EMPTY_BOOKING_VALUE
      : value;

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 wrap-break-word text-sm font-medium">
        {displayValue}
      </div>
    </div>
  );
}

/**
 * Renders a titled read-only booking section with the standard field grid.
 *
 * @param props - Section title, children, and optional content class name.
 * @returns A bordered booking information section.
 */
export function BookingInfoSection({
  children,
  contentClassName,
  title,
}: {
  children: React.ReactNode;
  contentClassName?: string;
  title: string;
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <Accordion type="single" collapsible defaultValue={title}>
        <AccordionItem value={title} className="border-none">
          <CardHeader className="border-b">
            <AccordionTrigger className="p-0 no-underline">
              <h2 className="font-heading text-base font-semibold leading-snug">
                {title}
              </h2>
            </AccordionTrigger>
          </CardHeader>

          <AccordionContent>
            <CardContent
              className={cn('grid gap-4 pt-4 sm:grid-cols-2', contentClassName)}
            >
              {children}
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

/**
 * Renders a small titled field group inside a booking information card.
 *
 * @param props - Group title, fields, and optional divider flag.
 * @returns Customer card subgroup.
 */
export function BookingInfoFieldGroup({
  children,
  title,
  divider = false,
}: {
  children: React.ReactNode;
  title: string;
  divider?: boolean;
}) {
  return (
    <div className={divider ? 'border-t border-muted-foreground/20 pt-4' : ''}>
      <h4 className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/**
 * Renders one icon-backed metadata item in the booking summary card.
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
    value === null || value === undefined || value === ''
      ? EMPTY_BOOKING_VALUE
      : value;

  return (
    <div className="flex min-w-0 gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-0.5 wrap-break-word text-sm font-semibold">
          {displayValue}
        </div>
      </div>
    </div>
  );
}
