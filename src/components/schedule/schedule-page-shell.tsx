'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useTransition } from 'react';

import { ScheduleFilters } from '@/components/schedule/schedule-filters';
import { ScheduleResultsPendingSkeleton } from '@/components/schedule/schedule-results-loading';
import type {
  ScheduleStaffFilterOption,
  ScheduleFilters as ScheduleFiltersValue,
} from '@/features/schedule/types';

type SchedulePageShellProps = {
  staffFilterOptions: ScheduleStaffFilterOption[];
  children: ReactNode;
  filters: ScheduleFiltersValue;
};

/**
 * Hosts client-side schedule filter navigation state around server-rendered results.
 *
 * @param props - Current URL-backed filters, staff filter options, and results content.
 * @returns Filter controls plus either current schedule results or a pending skeleton.
 */
export function SchedulePageShell({
  staffFilterOptions,
  children,
  filters,
}: SchedulePageShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /**
   * Starts a URL-backed schedule filter transition and blocks repeated filter changes.
   *
   * @param href - Schedule URL produced by the filter controls.
   */
  function handleFilterChange(href: string) {
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <>
      <ScheduleFilters
        staffFilterOptions={staffFilterOptions}
        disabled={isPending}
        filters={filters}
        isPending={isPending}
        onFilterChange={handleFilterChange}
      />
      {isPending ? <ScheduleResultsPendingSkeleton /> : children}
    </>
  );
}
