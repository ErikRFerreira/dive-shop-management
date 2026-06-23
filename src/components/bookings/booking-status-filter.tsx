import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { BookingStatus } from '@/generated/prisma/enums';
import type { BookingStatusFilter as BookingStatusFilterValue } from '@/features/bookings/queries';

const filters: { label: string; status?: BookingStatusFilterValue }[] = [
  { label: 'All' },
  { label: 'Draft', status: BookingStatus.DRAFT },
  { label: 'Pending Approval', status: BookingStatus.PENDING_APPROVAL },
  { label: 'Needs More Info', status: BookingStatus.NEEDS_MORE_INFO },
  { label: 'Approved', status: BookingStatus.APPROVED },
  { label: 'Cancelled', status: BookingStatus.CANCELLED },
];

export function BookingStatusFilter({
  selectedStatus,
}: {
  selectedStatus?: BookingStatusFilterValue;
}) {
  return (
    <nav aria-label="Filter bookings by status" className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const isActive = filter.status === selectedStatus;
        const href = filter.status
          ? `/bookings?status=${filter.status}`
          : '/bookings';

        return (
          <Button
            key={filter.label}
            asChild
            size="sm"
            variant={isActive ? 'default' : 'outline'}
          >
            <Link href={href} aria-current={isActive ? 'page' : undefined}>
              {filter.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
