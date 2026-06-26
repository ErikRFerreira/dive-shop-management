import { CustomerSearch } from '@/components/customers/customer-search';
import { CustomerSummaryCard } from '@/components/customers/customer-summary-card';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { searchCustomers } from '@/features/customers/queries';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { requireCurrentUser } from '@/lib/current-user';

type CustomersPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
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

  const query = parseCustomerSearchQuery((await searchParams).q);
  const customers = await searchCustomers(query);
  const hasSearch = query.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Find existing customers before creating duplicate booking records.
        </p>
      </div>

      <CustomerSearch query={query} />

      {!hasSearch ? (
        <Card>
          <CardHeader>
            <CardTitle>Search for a customer</CardTitle>
            <CardDescription>
              Use a name, Chinese name, WeChat ID, WhatsApp number, email, or
              phone number.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : customers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No customers found</CardTitle>
            <CardDescription>
              No existing customers match &quot;{query}&quot;.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {customers.length} {customers.length === 1 ? 'result' : 'results'}{' '}
            for &quot;{query}&quot;
          </p>
          <div className="space-y-3">
            {customers.map((customer) => (
              <CustomerSummaryCard customer={customer} key={customer.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default Customers;
