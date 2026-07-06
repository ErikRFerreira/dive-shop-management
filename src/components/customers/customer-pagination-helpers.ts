/**
 * Builds a customers list URL for a specific page while preserving search.
 *
 * @param props - Active search query, target page, and fixed page size.
 * @returns A `/customers` URL with pagination parameters and optional search.
 */
export function buildCustomerPageHref({
  page,
  pageSize,
  query,
}: {
  page: number;
  pageSize: number;
  query: string;
}) {
  const params = new URLSearchParams();
  const normalizedQuery = query.trim();

  if (normalizedQuery) {
    params.set('q', normalizedQuery);
  }

  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  return `/customers?${params.toString()}`;
}

/**
 * Computes the compact set of page numbers shown in the customer pagination UI.
 *
 * @param currentPage - The resolved active page.
 * @param totalPages - Total number of pages available.
 * @returns Sorted page numbers including the edges and current-page neighbors.
 */
export function getVisibleCustomerPages(
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
