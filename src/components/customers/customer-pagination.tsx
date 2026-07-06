import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { CustomerListPagination as CustomerListPaginationMetadata } from '@/features/customers/queries';
import {
  buildCustomerPageHref,
  getVisibleCustomerPages,
} from './customer-pagination-helpers';

type CustomerPaginationProps = {
  pagination: CustomerListPaginationMetadata;
  query: string;
};

/**
 * Renders pagination controls for the internal customers lookup list.
 *
 * @param props - Pagination metadata and active search query to preserve in links.
 * @returns Pagination controls, or null when all customers fit on one page.
 */
export function CustomerPagination({
  pagination,
  query,
}: CustomerPaginationProps) {
  if (pagination.totalCount <= pagination.pageSize) {
    return null;
  }

  const pages = getVisibleCustomerPages(
    pagination.page,
    pagination.totalPages,
  );
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
            href={buildCustomerPageHref({
              page: previousPage,
              pageSize: pagination.pageSize,
              query,
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
                href={buildCustomerPageHref({
                  page,
                  pageSize: pagination.pageSize,
                  query,
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
            href={buildCustomerPageHref({
              page: nextPage,
              pageSize: pagination.pageSize,
              query,
            })}
            tabIndex={hasNextPage ? undefined : -1}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
