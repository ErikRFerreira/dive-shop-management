'use client';

import { useId } from 'react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  BookingQueueFilter,
  BookingSort,
  BookingStatusFilter,
} from '@/features/bookings/types';
import { bookingSortOptions } from '@/features/bookings/types';
import { buildBookingSortHref } from './booking-pagination-helpers';

type BookingSortSelectProps = {
  disabled?: boolean;
  onSortSelect: (href: string) => void;
  pageSize: number;
  selectedQueue?: BookingQueueFilter;
  selectedSort: BookingSort;
  selectedStatus?: BookingStatusFilter;
};

const sortLabels: Record<BookingSort, string> = {
  'recently-updated': 'Recently updated',
  'newest-created': 'Newest created',
  'activity-date': 'Activity date',
};

const selectClass =
  'h-9 w-44 truncate rounded-lg border border-border bg-background px-2.5 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 [&>span]:truncate';

/**
 * Checks whether a raw select value is one of the supported booking sorts.
 *
 * @param value - Raw Radix Select value.
 * @returns True when the value is a supported booking sort.
 */
function isBookingSort(value: string): value is BookingSort {
  return bookingSortOptions.includes(value as BookingSort);
}

/**
 * Renders the URL-backed sort selector for the bookings list.
 *
 * @param props - Current list state and navigation callback for sort changes.
 * @returns A compact shadcn Select control for supported booking sorts.
 */
export function BookingSortSelect({
  disabled = false,
  onSortSelect,
  pageSize,
  selectedQueue,
  selectedSort,
  selectedStatus,
}: BookingSortSelectProps) {
  const sortSelectId = useId();

  /**
   * Navigates to the bookings list with a new sort while preserving filters.
   *
   * @param value - Raw selected sort value from the dropdown.
   */
  function handleSortChange(value: string) {
    if (!isBookingSort(value) || value === selectedSort) {
      return;
    }

    onSortSelect(
      buildBookingSortHref({
        pageSize,
        selectedQueue,
        selectedSort: value,
        selectedStatus,
      }),
    );
  }

  return (
    <div className="grid gap-1">
      <Label
        className="mb-0.5 text-xs font-medium text-muted-foreground"
        htmlFor={sortSelectId}
      >
        Sort by
      </Label>
      <Select
        disabled={disabled}
        onValueChange={handleSortChange}
        value={selectedSort}
      >
        <SelectTrigger
          aria-label="Sort bookings"
          className={selectClass}
          id={sortSelectId}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {bookingSortOptions.map((sortOption) => (
            <SelectItem key={sortOption} value={sortOption}>
              {sortLabels[sortOption]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
