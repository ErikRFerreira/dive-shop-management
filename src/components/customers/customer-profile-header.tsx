import PageHeader from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { CustomerDetail } from '@/features/customers/types';
import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatEnumLabel,
} from '@/lib/format';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarClock,
  Contact,
  Languages,
  MessageCircle,
  UserRound,
  Users,
} from 'lucide-react';

type CustomerProfileHeaderProps = {
  customer: CustomerDetail;
};

/**
 * Checks whether the customer still needs a staff-facing name.
 *
 * @param customer - Customer detail payload for the active route.
 * @returns True when every persisted name field is empty.
 */
function isCustomerNameMissing(customer: CustomerDetail) {
  return ![customer.fullName, customer.firstName, customer.lastName].some(
    (value) => value?.trim(),
  );
}

/**
 * Chooses the fastest operational contact method from the customer profile.
 *
 * @param customer - Customer detail payload for the active route.
 * @returns A labeled contact method, or null when no contact value exists.
 */
function formatMainContact(customer: CustomerDetail) {
  if (customer.weChatId) return `WeChat: ${customer.weChatId}`;
  if (customer.whatsAppNumber) return `WhatsApp: ${customer.whatsAppNumber}`;
  if (customer.email) return `Email: ${customer.email}`;
  if (customer.phone) return `Phone: ${customer.phone}`;

  return null;
}

/**
 * Resolves the most recent booking date from the newest-first booking history.
 *
 * @param customer - Customer detail payload for the active route.
 * @returns Last booking display date, or null when no history exists.
 */
function getLastBookingDate(customer: CustomerDetail) {
  return customer.bookingHistory[0]?.date ?? null;
}

/**
 * Renders one icon-backed value in the customer overview card.
 *
 * @param props - Icon, label, and rendered value for the overview item.
 * @returns A compact customer metadata row.
 */
function CustomerOverviewMetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  const displayValue =
    value === null || value === undefined || value === '' ? '\u2014' : value;

  return (
    <div className="flex min-w-0 gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-0.5 break-words text-sm font-semibold">
          {displayValue}
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the page heading and top-level customer metadata.
 *
 * @param props - Customer detail payload for the active route.
 * @returns Header section with operational profile summary and secondary metadata.
 */
export function CustomerProfileHeader({
  customer,
}: CustomerProfileHeaderProps) {
  const isProfileIncomplete = isCustomerNameMissing(customer);

  return (
    <header className="space-y-6">
      <PageHeader
        badge={
          isProfileIncomplete ? (
            <Badge
              className="border-amber-200 bg-amber-50 text-amber-900"
              variant="outline"
            >
              Customer profile incomplete
            </Badge>
          ) : null
        }
        title={customer.name}
        description="Internal customer profile, contact details, and booking history."
        linkLabel="Back to customer search"
        linkHref="/customers"
      />

      <Card className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card to-card-glow shadow-sm">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Customer overview
              </p>
              {isProfileIncomplete && (
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Missing customer name
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <CustomerOverviewMetaItem
              icon={UserRound}
              label="Customer name"
              value={customer.name}
            />
            <CustomerOverviewMetaItem
              icon={Languages}
              label="Chinese name"
              value={customer.chineseName}
            />
            <CustomerOverviewMetaItem
              icon={MessageCircle}
              label="Main contact method"
              value={formatMainContact(customer)}
            />
            <CustomerOverviewMetaItem
              icon={Contact}
              label="Preferred language"
              value={formatEnumLabel(customer.preferredLanguage)}
            />
            <CustomerOverviewMetaItem
              icon={CalendarClock}
              label="Last booking date"
              value={formatDisplayDate(getLastBookingDate(customer))}
            />
            <CustomerOverviewMetaItem
              icon={Users}
              label="Total bookings"
              value={customer.bookingHistory.length}
            />
          </div>

          <div className="grid gap-4 border-t pt-4 text-sm sm:grid-cols-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Customer ID
              </p>
              <p className="mt-1 break-all font-mono text-xs">{customer.id}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Created date
              </p>
              <p className="mt-1">
                {formatDisplayDateTime(customer.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Updated date
              </p>
              <p className="mt-1">
                {formatDisplayDateTime(customer.updatedAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </header>
  );
}

