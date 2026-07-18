import type { StaffUserFilters } from '@/features/settings/types';

/**
 * Builds a Settings URL while preserving normalized staff-list state.
 *
 * @param filters - Validated staff filters and target page.
 * @returns A `/settings` URL containing only meaningful filter parameters.
 */
export function buildStaffUserListHref(filters: StaffUserFilters) {
  const params = new URLSearchParams();
  const search = filters.search.trim();

  if (search) {
    params.set('search', search);
  }

  if (filters.role) {
    params.set('role', filters.role);
  }

  if (filters.status !== 'all') {
    params.set('status', filters.status);
  }

  if (filters.page > 1) {
    params.set('page', String(filters.page));
  }

  const query = params.toString();

  return query ? `/settings?${query}` : '/settings';
}

/**
 * Returns whether search, role, or status currently narrows the staff list.
 *
 * @param filters - Normalized staff-list filters.
 * @returns True when a clear-filters action would change the result set.
 */
export function hasActiveStaffUserFilters(filters: StaffUserFilters) {
  return Boolean(
    filters.search || filters.role || filters.status !== 'all',
  );
}

/**
 * Computes compact numbered pagination links around the current staff page.
 *
 * @param currentPage - Resolved active page after server-side clamping.
 * @param totalPages - Total number of matching staff pages.
 * @returns Sorted edge and neighbor page numbers for the pagination control.
 */
export function getVisibleStaffUserPages(
  currentPage: number,
  totalPages: number,
) {
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

