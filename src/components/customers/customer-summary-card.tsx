import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { CustomerSearchResult } from '@/features/customers/types';
import { formatDisplayDate, formatEnumLabel } from '@/lib/format';

type CustomerSummaryCardProps = {
  customer: CustomerSearchResult;
};

const EMPTY_VALUE = '-';

/**
 * Renders one labeled value in a customer summary card.
 *
 * @param props - Label and value to display.
 * @returns A compact field suitable for card grids.
 */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  const displayValue =
    value === null || value === undefined || value === '' ? EMPTY_VALUE : value;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 break-words text-sm">{displayValue}</div>
    </div>
  );
}

/**
 * Renders the identifying details for one customer search result.
 *
 * @param props - Customer result to summarize.
 * @returns A card containing contact, language, certification, and recent booking details.
 */
export function CustomerSummaryCard({ customer }: CustomerSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{customer.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Chinese name" value={customer.chineseName} />
          <Field label="WeChat ID" value={customer.weChatId} />
          <Field label="WhatsApp number" value={customer.whatsAppNumber} />
          <Field label="Email" value={customer.email} />
          <Field label="Phone" value={customer.phone} />
          <Field label="Hotel" value={customer.hotel} />
          <Field
            label="Preferred language"
            value={formatEnumLabel(customer.preferredLanguage, {
              emptyValue: EMPTY_VALUE,
            })}
          />
          <Field
            label="Certification level"
            value={customer.certificationLevel}
          />
          <Field
            label="Certification agency"
            value={customer.certificationAgency}
          />
          <Field
            label="Last dive date"
            value={formatDisplayDate(customer.lastDiveDate, {
              emptyValue: EMPTY_VALUE,
            })}
          />
          <Field label="Logged dives" value={customer.divesLogged} />
          <Field
            label="Last booking date"
            value={formatDisplayDate(customer.lastBookingDate, {
              emptyValue: EMPTY_VALUE,
            })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
