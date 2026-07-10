'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useState, useTransition } from 'react';

import {
  BookingStatusFilter,
  type BookingStatusFilterKey,
} from '@/components/bookings/list/booking-status-filter';
import { BookingListPendingSkeleton } from '@/components/bookings/list/booking-list-loading';
import { BookingSortSelect } from '@/components/bookings/list/booking-sort-select';
import type {
  BookingQueueFilter,
  BookingSort,
  BookingStatusFilter as BookingStatusFilterValue,
} from '@/features/bookings/types';

type BookingsListShellProps = {
  children: ReactNode;
  pageSize: number;
  selectedQueue?: BookingQueueFilter;
  selectedSort: BookingSort;
  selectedStatus?: BookingStatusFilterValue;
};

/**
 * Hosts client-side filter navigation state around server-rendered booking results.
 *
 * @param props - Current URL-backed filter state and server-rendered results content.
 * @returns Filter controls plus either the current results or a pending skeleton.
 */
export function BookingsListShell({
  children,
  pageSize,
  selectedQueue,
  selectedSort,
  selectedStatus,
}: BookingsListShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingFilterKey, setPendingFilterKey] =
    useState<BookingStatusFilterKey>();

  /**
   * Starts a URL-backed filter transition while optimistically highlighting the target filter.
   *
   * @param href - Existing bookings filter URL to navigate to.
   * @param filterKey - Stable filter key used for optimistic active styling.
   */
  function handleFilterSelect(
    href: string,
    filterKey: BookingStatusFilterKey,
  ) {
    setPendingFilterKey(filterKey);
    startTransition(() => {
      router.push(href);
    });
  }

  /**
   * Starts a URL-backed sort transition while showing pending booking results.
   *
   * @param href - Bookings URL with the next sort and current filters.
   */
  function handleSortSelect(href: string) {
    setPendingFilterKey(undefined);
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <BookingStatusFilter
          disabled={isPending}
          onFilterSelect={handleFilterSelect}
          pageSize={pageSize}
          pendingFilterKey={isPending ? pendingFilterKey : undefined}
          selectedQueue={selectedQueue}
          selectedSort={selectedSort}
          selectedStatus={selectedStatus}
        />
        <BookingSortSelect
          disabled={isPending}
          onSortSelect={handleSortSelect}
          pageSize={pageSize}
          selectedQueue={selectedQueue}
          selectedSort={selectedSort}
          selectedStatus={selectedStatus}
        />
      </div>
      {isPending ? <BookingListPendingSkeleton /> : children}
    </>
  );
}
