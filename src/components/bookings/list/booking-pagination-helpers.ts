import type {
  BookingQueueFilter,
  BookingSort,
  BookingStatusFilter,
} from '@/features/bookings/queries';

/**
 * Builds a bookings list URL from the active filters, sort, and pagination.
 *
 * @param props - Active booking filter, sort, target page, and fixed page size.
 * @returns A `/bookings` URL with normalized query parameters.
 */
export function buildBookingListHref({
  page,
  pageSize,
  selectedQueue,
  selectedSort,
  selectedStatus,
}: {
  page: number;
  pageSize: number;
  selectedQueue?: BookingQueueFilter;
  selectedSort: BookingSort;
  selectedStatus?: BookingStatusFilter;
}) {
  const params = new URLSearchParams();

  if (selectedQueue) {
    params.set('queue', selectedQueue);
  } else if (selectedStatus) {
    params.set('status', selectedStatus);
  }

  params.set('sort', selectedSort);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  return `/bookings?${params.toString()}`;
}

/**
 * Builds a bookings list URL for a specific page while preserving list state.
 *
 * @param props - Active booking filter, sort, target page, and fixed page size.
 * @returns A `/bookings` URL for the requested page.
 */
export function buildBookingPageHref(props: {
  page: number;
  pageSize: number;
  selectedQueue?: BookingQueueFilter;
  selectedSort: BookingSort;
  selectedStatus?: BookingStatusFilter;
}) {
  return buildBookingListHref(props);
}

/**
 * Builds a bookings list URL for a filter change while preserving the active sort.
 *
 * @param props - Target filter, current sort, and fixed page size.
 * @returns A `/bookings` URL reset to page 1.
 */
export function buildBookingFilterHref({
  pageSize,
  selectedQueue,
  selectedSort,
  selectedStatus,
}: {
  pageSize: number;
  selectedQueue?: BookingQueueFilter;
  selectedSort: BookingSort;
  selectedStatus?: BookingStatusFilter;
}) {
  return buildBookingListHref({
    page: 1,
    pageSize,
    selectedQueue,
    selectedSort,
    selectedStatus,
  });
}

/**
 * Builds a bookings list URL for a sort change while preserving the active filter.
 *
 * @param props - Active booking filter, selected sort, and fixed page size.
 * @returns A `/bookings` URL reset to page 1.
 */
export function buildBookingSortHref({
  pageSize,
  selectedQueue,
  selectedSort,
  selectedStatus,
}: {
  pageSize: number;
  selectedQueue?: BookingQueueFilter;
  selectedSort: BookingSort;
  selectedStatus?: BookingStatusFilter;
}) {
  return buildBookingListHref({
    page: 1,
    pageSize,
    selectedQueue,
    selectedSort,
    selectedStatus,
  });
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
