import type { VariantProps } from 'class-variance-authority';

import { Badge, badgeVariants } from '@/components/ui/badge';
import { BookingStatus } from '@/generated/prisma/enums';

const statusDetails: Record<
  BookingStatus,
  { label: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  [BookingStatus.DRAFT]: { label: 'Draft', variant: 'secondary' },
  [BookingStatus.PENDING_APPROVAL]: {
    label: 'Pending Approval',
    variant: 'outline',
  },
  [BookingStatus.NEEDS_MORE_INFO]: {
    label: 'Needs More Info',
    variant: 'destructive',
  },
  [BookingStatus.APPROVED]: { label: 'Approved', variant: 'default' },
  [BookingStatus.SCHEDULED]: { label: 'Scheduled', variant: 'default' },
  [BookingStatus.CANCELLED]: { label: 'Cancelled', variant: 'secondary' },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, variant } = statusDetails[status];

  return <Badge variant={variant}>{label}</Badge>;
}
