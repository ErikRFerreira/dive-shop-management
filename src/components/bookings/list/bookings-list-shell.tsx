'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useState, useTransition } from 'react';

import {
  BookingStatusFilter,
  type BookingStatusFilterKey,
} from '@/components/bookings/list/booking-status-filter';
import { BookingListPendingSkeleton } from '@/components/bookings/list/booking-list-loading';
import type {
  BookingQueueFilter,
  BookingStatusFilter as BookingStatusFilterValue,
} from '@/features/bookings/types';

type BookingsListShellProps = {
  children: ReactNode;
  selectedQueue?: BookingQueueFilter;
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
  selectedQueue,
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

  return (
    <>
      <BookingStatusFilter
        disabled={isPending}
        onFilterSelect={handleFilterSelect}
        pendingFilterKey={isPending ? pendingFilterKey : undefined}
        selectedQueue={selectedQueue}
        selectedStatus={selectedStatus}
      />
      {isPending ? <BookingListPendingSkeleton /> : children}
    </>
  );
}
