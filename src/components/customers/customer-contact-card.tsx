import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { CustomerDetail } from '@/features/customers/types';
import { formatEnumLabel } from '@/lib/format';

import { CustomerDetailField } from './customer-detail-field';

type CustomerContactCardProps = {
  customer: CustomerDetail;
};

/**
 * Renders reusable customer profile and contact information.
 *
 * @param props - Customer detail payload for the active route.
 * @returns Card containing general customer profile fields.
 */
export function CustomerContactCard({ customer }: CustomerContactCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CustomerDetailField label="Name" value={customer.name} />
          <CustomerDetailField
            label="Chinese name"
            value={customer.chineseName}
          />
          <CustomerDetailField label="WeChat ID" value={customer.weChatId} />
          <CustomerDetailField
            label="WhatsApp number"
            value={customer.whatsAppNumber}
          />
          <CustomerDetailField label="Email" value={customer.email} />
          <CustomerDetailField label="Phone" value={customer.phone} />
          <CustomerDetailField label="Hotel" value={customer.hotel} />
          <CustomerDetailField
            label="Preferred language"
            value={formatEnumLabel(customer.preferredLanguage)}
          />
        </div>
        <CustomerDetailField label="Notes" value={customer.notes} />
      </CardContent>
    </Card>
  );
}

