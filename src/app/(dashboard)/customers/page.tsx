import { CustomerList } from '@/components/customers/customer-list';
import { CustomerSearch } from '@/components/customers/customer-search';
import {
  getCustomerLookupPage,
  parseCustomerPageParam,
  parseCustomerPageSizeParam,
} from '@/features/customers/queries';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { requireCurrentUser } from '@/lib/current-user';
import PageHeader from '@/components/common/page-header';

type CustomersPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
  }>;
};

/**
 * Parses the customer search query from Next.js search parameters.
 *
 * @param value - Raw `q` search parameter value from the request URL.
 * @returns Trimmed search text, or an empty string when absent or repeated.
 */
function parseCustomerSearchQuery(value: string | string[] | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Renders the protected customer search page.
 *
 * @param props - Async App Router search parameters for the current request.
 * @returns Customer search form plus initial, empty, or results state.
 */
async function Customers({ searchParams }: CustomersPageProps) {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'customers');

  const params = await searchParams;
  const query = parseCustomerSearchQuery(params.q);
  const hasSearch = query.length > 0;
  const page = parseCustomerPageParam(params.page);
  const pageSize = parseCustomerPageSizeParam(params.pageSize);
  const { customers, pagination } = await getCustomerLookupPage(query, {
    page,
    pageSize,
  });
  const resultSummary = hasSearch
    ? `${pagination.totalCount} ${
        pagination.totalCount === 1 ? 'result' : 'results'
      } for "${query}"`
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Find existing customers before creating duplicate booking records."
      />

      <CustomerSearch query={query} />

      <CustomerList
        customers={customers}
        emptyTitle={hasSearch ? 'No customers found.' : 'No customers yet.'}
        emptyDescription={
          hasSearch
            ? 'Try another name, WeChat ID, WhatsApp number, email, or phone.'
            : 'Customers will appear here after bookings are created.'
        }
        pagination={pagination}
        query={query}
        resultSummary={resultSummary}
      />
    </div>
  );
}

export default Customers;
