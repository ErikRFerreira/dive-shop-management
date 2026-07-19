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
  StaffUserFilters,
  StaffUserListPagination as StaffUserPaginationMetadata,
} from '@/features/settings/types';
import {
  buildStaffUserListHref,
  getVisibleStaffUserPages,
} from './staff-user-list-helpers';

type StaffUserPaginationProps = {
  filters: StaffUserFilters;
  pagination: StaffUserPaginationMetadata;
};

/**
 * Renders numbered staff pagination while preserving every active filter.
 *
 * @param props - Trusted staff filters and server-resolved pagination metadata.
 * @returns Pagination controls, or null when all matching staff fit one page.
 */
export function StaffUserPagination({
  filters,
  pagination,
}: StaffUserPaginationProps) {
  if (pagination.totalCount <= pagination.pageSize) {
    return null;
  }

  const pages = getVisibleStaffUserPages(
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
            href={buildStaffUserListHref({
              ...filters,
              page: previousPage,
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
                href={buildStaffUserListHref({ ...filters, page })}
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
            href={buildStaffUserListHref({ ...filters, page: nextPage })}
            tabIndex={hasNextPage ? undefined : -1}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

