'use client';

import { Button } from '@/components/ui/button';
import { BookingStatus } from '@/generated/prisma/enums';
import type {
  BookingQueueFilter,
  BookingStatusFilter as BookingStatusFilterValue,
} from '@/features/bookings/types';
import { bookingDefaultPageSize } from '@/features/bookings/types';
import { cn } from '@/lib/utils';

export type BookingStatusFilterKey =
  | 'all'
  | 'draft'
  | 'pending-approval'
  | 'needs-more-info'
  | 'approved'
  | 'cancelled'
  | 'unassigned';

const filters: {
  href: string;
  key: BookingStatusFilterKey;
  label: string;
  queue?: BookingQueueFilter;
  status?: BookingStatusFilterValue;
}[] = [
  {
    href: `/bookings?page=1&pageSize=${bookingDefaultPageSize}`,
    key: 'all',
    label: 'All',
  },
  {
    href: `/bookings?status=DRAFT&page=1&pageSize=${bookingDefaultPageSize}`,
    key: 'draft',
    label: 'Draft',
    status: BookingStatus.DRAFT,
  },
  {
    href: `/bookings?status=PENDING_APPROVAL&page=1&pageSize=${bookingDefaultPageSize}`,
    key: 'pending-approval',
    label: 'Pending Approval',
    status: BookingStatus.PENDING_APPROVAL,
  },
  {
    href: `/bookings?status=NEEDS_MORE_INFO&page=1&pageSize=${bookingDefaultPageSize}`,
    key: 'needs-more-info',
    label: 'Needs More Info',
    status: BookingStatus.NEEDS_MORE_INFO,
  },
  {
    href: `/bookings?status=APPROVED&page=1&pageSize=${bookingDefaultPageSize}`,
    key: 'approved',
    label: 'Approved',
    status: BookingStatus.APPROVED,
  },
  {
    href: `/bookings?status=CANCELLED&page=1&pageSize=${bookingDefaultPageSize}`,
    key: 'cancelled',
    label: 'Cancelled',
    status: BookingStatus.CANCELLED,
  },
  {
    href: `/bookings?queue=unassigned&page=1&pageSize=${bookingDefaultPageSize}`,
    key: 'unassigned',
    label: 'Unassigned',
    queue: 'unassigned',
  },
];

type BookingStatusFilterProps = {
  disabled?: boolean;
  onFilterSelect: (href: string, filterKey: BookingStatusFilterKey) => void;
  pendingFilterKey?: BookingStatusFilterKey;
  selectedQueue?: BookingQueueFilter;
  selectedStatus?: BookingStatusFilterValue;
};

/**
 * Renders booking work-queue filter chips for status filters and operational queues.
 *
 * @param props - The selected URL-backed filter plus pending navigation controls.
 * @returns A button-based filter chip navigation that delegates URL updates to the parent shell.
 */
export function BookingStatusFilter({
  disabled = false,
  onFilterSelect,
  pendingFilterKey,
  selectedQueue,
  selectedStatus,
}: BookingStatusFilterProps) {
  return (
    <nav
      aria-label="Filter bookings by status or operational queue"
      className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card/60 p-3 shadow-sm"
    >
      {filters.map((filter) => {
        const matchesCurrentFilter = filter.queue
          ? filter.queue === selectedQueue
          : !selectedQueue && filter.status === selectedStatus;
        const isPendingFilter = pendingFilterKey === filter.key;
        const isActive = pendingFilterKey
          ? isPendingFilter
          : matchesCurrentFilter;

        return (
          <Button
            key={filter.label}
            aria-current={isActive ? 'page' : undefined}
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => {
              if (!disabled && !matchesCurrentFilter) {
                onFilterSelect(filter.href, filter.key);
              }
            }}
            size="sm"
            type="button"
            variant={isActive ? 'default' : 'outline'}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
              disabled && 'cursor-not-allowed',
            )}
          >
            {filter.label}
          </Button>
        );
      })}
    </nav>
  );
}
