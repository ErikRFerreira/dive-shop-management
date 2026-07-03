import Link from 'next/link';
import { cloneElement, isValidElement } from 'react';
import { cn } from '@/lib/utils';

import { Card, CardContent } from '@/components/ui/card';

type StatusTone = 'pending' | 'info' | 'scheduled' | 'unassigned' | 'ocean';

const toneStyles: Record<
  StatusTone,
  { chip: string; accent: string; value: string }
> = {
  pending: {
    chip: 'bg-pending/12 text-pending ring-pending/25',
    accent: 'from-pending/70',
    value: 'text-foreground',
  },
  info: {
    chip: 'bg-info-alert/12 text-info-alert ring-info-alert/25',
    accent: 'from-info-alert/70',
    value: 'text-foreground',
  },
  scheduled: {
    chip: 'bg-scheduled/12 text-scheduled ring-scheduled/25',
    accent: 'from-scheduled/70',
    value: 'text-foreground',
  },
  unassigned: {
    chip: 'bg-unassigned/12 text-unassigned ring-unassigned/25',
    accent: 'from-unassigned/70',
    value: 'text-foreground',
  },
  ocean: {
    chip: 'bg-ocean/12 text-ocean ring-ocean/25',
    accent: 'from-ocean/60',
    value: 'text-muted-foreground/80',
  },
};

type StatCardProps = {
  icon?: React.ReactNode;
  title: string;
  value: number;
  href: string;
  description: string;
  tone?: StatusTone;
};

/**
 * Normalizes dashboard icon sizing so stat cards remain visually consistent.
 *
 * @param icon - Optional icon node supplied by a card caller.
 * @returns The original node, or a cloned element constrained to `size-4`.
 */
function renderStatIcon(icon: React.ReactNode): React.ReactNode {
  if (!isValidElement<{ className?: string }>(icon)) {
    return icon;
  }

  return cloneElement(icon, {
    className: cn('size-4', icon.props.className),
  });
}

/**
 * Renders a linked metric card for app-level summary views.
 *
 * @param props - The title, count, destination, and supporting copy to display.
 * @returns A single reusable stat card.
 */
export function StatCard({
  icon,
  title,
  value,
  href,
  description,
  tone = 'ocean',
}: StatCardProps) {
  const toneStyle = toneStyles[tone];

  return (
    <Link href={href} className="block h-full">
      <Card className="group relative h-full border border-border bg-linear-to-b from-card to-card-glow py-0 shadow-sm ring-1 ring-black/2 transition-shadow hover:shadow-md">
        <span
          className={cn(
            'absolute inset-x-0 top-0 h-0.5 bg-linear-to-r to-transparent',
            toneStyle.accent,
          )}
          aria-hidden
        />

        <CardContent className="flex h-full flex-col p-4">
          <div className="flex items-center justify-between gap-3">
            {icon ? (
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
                  toneStyle.chip,
                )}
              >
                {renderStatIcon(icon)}
              </div>
            ) : (
              <div aria-hidden className="size-8 shrink-0" />
            )}

            <span
              className={cn(
                'text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums',
                toneStyle.value,
              )}
            >
              {value}
            </span>
          </div>

          <p className="mt-3 text-sm font-semibold leading-tight text-foreground text-pretty">
            {title}
          </p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground text-pretty">
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
