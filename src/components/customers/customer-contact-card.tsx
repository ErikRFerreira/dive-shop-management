import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TextFieldEmptyState } from '@/components/common/text-field-empty-state';
import type { CustomerDetail } from '@/features/customers/types';
import { formatEnumLabel } from '@/lib/format';

import { CustomerDetailField } from './customer-detail-field';

type CustomerContactCardProps = {
  customer: CustomerDetail;
};

/**
 * Checks whether the reusable customer profile has any direct contact values.
 *
 * @param customer - Customer detail payload for the active route.
 * @returns True when at least one contact method is recorded.
 */
function hasContactDetails(customer: CustomerDetail) {
  return Boolean(
    customer.weChatId ||
      customer.whatsAppNumber ||
      customer.email ||
      customer.phone,
  );
}

/**
 * Renders a small heading for grouped customer profile fields.
 *
 * @param props - Staff-facing subsection title.
 * @returns Uppercase subsection heading.
 */
function CustomerProfileSubsectionTitle({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </h3>
  );
}

/**
 * Renders reusable customer profile and contact information.
 *
 * @param props - Customer detail payload for the active route.
 * @returns Card containing grouped contact, profile, and note fields.
 */
export function CustomerContactCard({ customer }: CustomerContactCardProps) {
  const hasContact = hasContactDetails(customer);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="border-b">
        <CardTitle>Customer profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <CustomerProfileSubsectionTitle title="Contact details" />
          {hasContact ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <CustomerDetailField label="WeChat ID" value={customer.weChatId} />
              <CustomerDetailField
                label="WhatsApp number"
                value={customer.whatsAppNumber}
              />
              <CustomerDetailField label="Email" value={customer.email} />
              <CustomerDetailField label="Phone" value={customer.phone} />
            </div>
          ) : (
            <TextFieldEmptyState
              className="py-4"
              message="No contact details recorded."
            />
          )}
        </section>

        <section className="space-y-3">
          <CustomerProfileSubsectionTitle title="Profile details" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CustomerDetailField label="Name" value={customer.name} />
            <CustomerDetailField
              label="Chinese name"
              value={customer.chineseName}
            />
            <CustomerDetailField
              label="Preferred language"
              value={formatEnumLabel(customer.preferredLanguage)}
            />
            <CustomerDetailField label="Hotel" value={customer.hotel} />
          </div>
        </section>

        <section className="space-y-3">
          <CustomerProfileSubsectionTitle title="Notes" />
          {customer.notes ? (
            <CustomerDetailField label="Customer notes" value={customer.notes} />
          ) : (
            <TextFieldEmptyState message="No customer notes." />
          )}
        </section>
      </CardContent>
    </Card>
  );
}

