import { Badge } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from '@/components/ui/badge';

import { cn } from '@/lib/utils';

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

type ColorScheme =
  | 'ocean'
  | 'primary'
  | 'pending'
  | 'info-alert'
  | 'scheduled'
  | 'unassigned';

type AssignmentBadgeProps = {
  label: string;
  variant?: BadgeVariant;
  colorScheme?: ColorScheme;
  showDot?: boolean;
  className?: string;
};

const colorSchemeClasses: Record<ColorScheme, string> = {
  ocean: 'bg-ocean/10 text-ocean ring-ocean/20',
  primary: 'bg-primary/10 text-primary ring-primary/20',
  pending: 'bg-pending/10 text-pending ring-pending/20',
  'info-alert': 'bg-info-alert/10 text-info-alert ring-info-alert/20',
  scheduled: 'bg-scheduled/10 text-scheduled ring-scheduled/20',
  unassigned: 'bg-unassigned/10 text-unassigned ring-unassigned/20',
};

/**
 * Renders a badge with an optional dot indicator, commonly used for roles,
 * statuses, and operational indicators across the application.
 *
 * @param props - Badge configuration including label, variant, color scheme, and dot visibility.
 * @returns A styled badge with consistent spacing and optional status dot.
 */
export function AssignmentBadge({
  label,
  variant = 'secondary',
  colorScheme = 'ocean',
  showDot = true,
  className,
}: AssignmentBadgeProps) {
  const colorClasses = colorSchemeClasses[colorScheme];

  return (
    <Badge
      variant={variant}
      className={cn('flex items-center gap-2', colorClasses, className)}
    >
      {showDot ? (
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
      ) : null}
      {label}
    </Badge>
  );
}
