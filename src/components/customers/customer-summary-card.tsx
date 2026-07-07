import Link from 'next/link';
import { Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
      <div className="mt-1 wrap-break-word text-sm">{displayValue}</div>
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
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle>{customer.name}</CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild size="icon" variant="outline">
                <Link
                  aria-label="View customer"
                  href={`/customers/${customer.id}`}
                >
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View customer</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
