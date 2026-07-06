import type {
  BookingQueueFilter,
  BookingStatusFilter,
} from '@/features/bookings/queries';

/**
 * Builds a bookings list URL for a specific page while preserving the active filter.
 *
 * @param props - Active booking filter, target page, and fixed page size.
 * @returns A `/bookings` URL with page and pageSize query parameters.
 */
export function buildBookingPageHref({
  page,
  pageSize,
  selectedQueue,
  selectedStatus,
}: {
  page: number;
  pageSize: number;
  selectedQueue?: BookingQueueFilter;
  selectedStatus?: BookingStatusFilter;
}) {
  const params = new URLSearchParams();

  if (selectedQueue) {
    params.set('queue', selectedQueue);
  } else if (selectedStatus) {
    params.set('status', selectedStatus);
  }

  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  return `/bookings?${params.toString()}`;
}

/**
 * Computes the compact set of page numbers shown in the booking pagination UI.
 *
 * @param currentPage - The resolved active page.
 * @param totalPages - Total number of pages available.
 * @returns Sorted page numbers including the edges and current-page neighbors.
 */
export function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 3);
    pages.add(totalPages - 2);
    pages.add(totalPages - 1);
  }

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
}
