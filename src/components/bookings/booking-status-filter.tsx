import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { BookingStatus } from '@/generated/prisma/enums';
import type {
  BookingQueueFilter,
  BookingStatusFilter as BookingStatusFilterValue,
} from '@/features/bookings/queries';
import { bookingDefaultPageSize } from '@/features/bookings/queries';

const filters: {
  href: string;
  label: string;
  queue?: BookingQueueFilter;
  status?: BookingStatusFilterValue;
}[] = [
  {
    href: `/bookings?page=1&pageSize=${bookingDefaultPageSize}`,
    label: 'All',
  },
  {
    href: `/bookings?status=DRAFT&page=1&pageSize=${bookingDefaultPageSize}`,
    label: 'Draft',
    status: BookingStatus.DRAFT,
  },
  {
    href: `/bookings?status=PENDING_APPROVAL&page=1&pageSize=${bookingDefaultPageSize}`,
    label: 'Pending Approval',
    status: BookingStatus.PENDING_APPROVAL,
  },
  {
    href: `/bookings?status=NEEDS_MORE_INFO&page=1&pageSize=${bookingDefaultPageSize}`,
    label: 'Needs More Info',
    status: BookingStatus.NEEDS_MORE_INFO,
  },
  {
    href: `/bookings?status=APPROVED&page=1&pageSize=${bookingDefaultPageSize}`,
    label: 'Approved',
    status: BookingStatus.APPROVED,
  },
  {
    href: `/bookings?status=CANCELLED&page=1&pageSize=${bookingDefaultPageSize}`,
    label: 'Cancelled',
    status: BookingStatus.CANCELLED,
  },
  {
    href: `/bookings?queue=unassigned&page=1&pageSize=${bookingDefaultPageSize}`,
    label: 'Unassigned',
    queue: 'unassigned',
  },
];

/**
 * Renders booking work-queue filter chips for status filters and operational queues.
 *
 * @param props - The selected status or queue parsed from the current URL.
 * @returns A link-based filter chip navigation.
 */
export function BookingStatusFilter({
  selectedQueue,
  selectedStatus,
}: {
  selectedQueue?: BookingQueueFilter;
  selectedStatus?: BookingStatusFilterValue;
}) {
  return (
    <nav
      aria-label="Filter bookings by status or operational queue"
      className="flex flex-wrap gap-2"
    >
      {filters.map((filter) => {
        const isActive = filter.queue
          ? filter.queue === selectedQueue
          : !selectedQueue && filter.status === selectedStatus;

        return (
          <Button
            key={filter.label}
            asChild
            size="sm"
            variant={isActive ? 'default' : 'outline'}
          >
            <Link
              href={filter.href}
              aria-current={isActive ? 'page' : undefined}
            >
              {filter.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
