'use client';

import { Button } from '@/components/ui/button';
import { BookingStatus } from '@/generated/prisma/enums';
import type {
  BookingQueueFilter,
  BookingSort,
  BookingStatusFilter as BookingStatusFilterValue,
} from '@/features/bookings/types';
import { cn } from '@/lib/utils';
import { buildBookingFilterHref } from './booking-pagination-helpers';

export type BookingStatusFilterKey =
  | 'all'
  | 'draft'
  | 'pending-approval'
  | 'needs-more-info'
  | 'approved'
  | 'cancelled'
  | 'unassigned';

const filters: {
  key: BookingStatusFilterKey;
  label: string;
  queue?: BookingQueueFilter;
  status?: BookingStatusFilterValue;
}[] = [
  {
    key: 'all',
    label: 'All',
  },
  {
    key: 'draft',
    label: 'Draft',
    status: BookingStatus.DRAFT,
  },
  {
    key: 'pending-approval',
    label: 'Pending Approval',
    status: BookingStatus.PENDING_APPROVAL,
  },
  {
    key: 'needs-more-info',
    label: 'Needs More Info',
    status: BookingStatus.NEEDS_MORE_INFO,
  },
  {
    key: 'approved',
    label: 'Approved',
    status: BookingStatus.APPROVED,
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    status: BookingStatus.CANCELLED,
  },
  {
    key: 'unassigned',
    label: 'Unassigned',
    queue: 'unassigned',
  },
];

type BookingStatusFilterProps = {
  disabled?: boolean;
  onFilterSelect: (href: string, filterKey: BookingStatusFilterKey) => void;
  pageSize: number;
  pendingFilterKey?: BookingStatusFilterKey;
  selectedQueue?: BookingQueueFilter;
  selectedSort: BookingSort;
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
  pageSize,
  pendingFilterKey,
  selectedQueue,
  selectedSort,
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
        const href = buildBookingFilterHref({
          pageSize,
          selectedQueue: filter.queue,
          selectedSort,
          selectedStatus: filter.status,
        });

        return (
          <Button
            key={filter.label}
            aria-current={isActive ? 'page' : undefined}
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => {
              if (!disabled && !matchesCurrentFilter) {
                onFilterSelect(href, filter.key);
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
