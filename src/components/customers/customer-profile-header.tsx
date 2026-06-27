import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { CustomerDetail } from '@/features/customers/types';
import { formatDisplayDateTime } from '@/lib/format';

import { CustomerDetailField } from './customer-detail-field';

type CustomerProfileHeaderProps = {
  customer: CustomerDetail;
};

/**
 * Renders the page heading and top-level customer metadata.
 *
 * @param props - Customer detail payload for the active route.
 * @returns Header section with profile identity, timestamps, and back navigation.
 */
export function CustomerProfileHeader({
  customer,
}: CustomerProfileHeaderProps) {
  return (
    <header className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {customer.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Customer profile and booking history
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/customers">Back to customer search</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CustomerDetailField label="Customer ID" value={customer.id} />
        <CustomerDetailField
          label="Chinese name"
          value={customer.chineseName}
        />
        <CustomerDetailField
          label="Created date"
          value={formatDisplayDateTime(customer.createdAt)}
        />
        <CustomerDetailField
          label="Updated date"
          value={formatDisplayDateTime(customer.updatedAt)}
        />
      </div>
    </header>
  );
}

