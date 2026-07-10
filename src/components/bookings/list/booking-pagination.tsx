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
  BookingSort,
  BookingStatusFilter,
} from '@/features/bookings/queries';
import {
  buildBookingPageHref,
  getVisiblePages,
} from './booking-pagination-helpers';

type BookingPaginationProps = {
  pagination: BookingListPagination;
  selectedQueue?: BookingQueueFilter;
  selectedSort: BookingSort;
  selectedStatus?: BookingStatusFilter;
};

/**
 * Renders shadcn pagination controls for the internal bookings list.
 *
 * @param props - Pagination metadata and the active booking list filter.
 * @returns Pagination controls, or null when all bookings fit on one page.
 */
export function BookingPagination({
  pagination,
  selectedQueue,
  selectedSort,
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
              selectedSort,
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
                  selectedSort,
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
              selectedSort,
              selectedStatus,
            })}
            tabIndex={hasNextPage ? undefined : -1}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
