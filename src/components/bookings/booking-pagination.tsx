import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type {
  BookingListPagination,
  BookingQueueFilter,
  BookingStatusFilter,
} from '@/features/bookings/queries';

type BookingPaginationProps = {
  pagination: BookingListPagination;
  selectedQueue?: BookingQueueFilter;
  selectedStatus?: BookingStatusFilter;
};

/**
 * Builds a bookings list URL for a specific page while preserving the active filter.
 *
 * @param props - Active booking filter, target page, and fixed page size.
 * @returns A `/bookings` URL with page and pageSize query parameters.
 */
function buildBookingPageHref({
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
function getVisiblePages(currentPage: number, totalPages: number) {
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

/**
 * Renders shadcn pagination controls for the internal bookings list.
 *
 * @param props - Pagination metadata and the active booking list filter.
 * @returns Pagination controls, or null when all bookings fit on one page.
 */
export function BookingPagination({
  pagination,
  selectedQueue,
  selectedStatus,
}: BookingPaginationProps) {
  if (pagination.totalCount <= pagination.pageSize) {
    return null;
  }

  const pages = getVisiblePages(pagination.page, pagination.totalPages);
  const previousPage = Math.max(pagination.page - 1, 1);
  const nextPage = Math.min(pagination.page + 1, pagination.totalPages);
  const hasPreviousPage = pagination.page > 1;
  const hasNextPage = pagination.page < pagination.totalPages;

  return (
    <Pagination className="justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={!hasPreviousPage}
            className={
              hasPreviousPage ? undefined : 'pointer-events-none opacity-50'
            }
            href={buildBookingPageHref({
              page: previousPage,
              pageSize: pagination.pageSize,
              selectedQueue,
              selectedStatus,
            })}
            tabIndex={hasPreviousPage ? undefined : -1}
          />
        </PaginationItem>

        {pages.map((page, index) => {
          const previousVisiblePage = pages[index - 1];
          const showEllipsis =
            previousVisiblePage !== undefined && page - previousVisiblePage > 1;

          return (
            <PaginationItem key={page}>
              {showEllipsis ? <PaginationEllipsis /> : null}
              <PaginationLink
                href={buildBookingPageHref({
                  page,
                  pageSize: pagination.pageSize,
                  selectedQueue,
                  selectedStatus,
                })}
                isActive={page === pagination.page}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        <PaginationItem>
          <PaginationNext
            aria-disabled={!hasNextPage}
            className={hasNextPage ? undefined : 'pointer-events-none opacity-50'}
            href={buildBookingPageHref({
              page: nextPage,
              pageSize: pagination.pageSize,
              selectedQueue,
              selectedStatus,
            })}
            tabIndex={hasNextPage ? undefined : -1}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
