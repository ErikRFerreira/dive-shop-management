import type { VariantProps } from 'class-variance-authority';

import { Badge, badgeVariants } from '@/components/ui/badge';
import { BookingStatus } from '@/generated/prisma/enums';
import { cn } from '@/lib/utils';

const statusDetails: Record<
  BookingStatus,
  {
    label: string;
    variant: VariantProps<typeof badgeVariants>['variant'];
    className: string;
  }
> = {
  [BookingStatus.DRAFT]: {
    label: 'Draft',
    variant: 'outline',
    className: 'bg-ocean/10 text-ocean ring-ocean/20',
  },
  [BookingStatus.PENDING_APPROVAL]: {
    label: 'Pending Approval',
    variant: 'outline',
    className: 'bg-pending/10 text-pending ring-pending/20',
  },
  [BookingStatus.NEEDS_MORE_INFO]: {
    label: 'Needs More Info',
    variant: 'outline',
    className: 'bg-info-alert/10 text-info-alert ring-info-alert/20',
  },
  [BookingStatus.APPROVED]: {
    label: 'Approved',
    variant: 'outline',
    className: 'bg-ocean/10 text-ocean ring-ocean/20',
  },
  [BookingStatus.SCHEDULED]: {
    label: 'Scheduled',
    variant: 'outline',
    className: 'bg-scheduled/10 text-scheduled ring-scheduled/20',
  },
  [BookingStatus.CANCELLED]: {
    label: 'Cancelled',
    variant: 'outline',
    className: 'bg-unassigned/10 text-unassigned ring-unassigned/20',
  },
};

/**
 * Renders a booking status badge using status-specific visual treatment.
 *
 * @param props - Booking status used to map text, variant, and optional custom styles.
 * @returns A badge that preserves status semantics with optional dot accent styling.
 */
export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, variant, className } = statusDetails[status];

  return (
    <Badge
      variant={variant}
      className={cn(
        'h-7 rounded-full border-transparent px-3 text-[0.7rem] font-medium ring-1 ring-inset',
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}
