import Link from 'next/link';
import { Eye } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CustomerPagination } from '@/components/customers/customer-pagination';
import type { CustomerListPagination as CustomerListPaginationMetadata } from '@/features/customers/queries';
import type { CustomerSearchResult } from '@/features/customers/types';
import { formatDisplayDate, formatEnumLabel } from '@/lib/format';

type CustomerListProps = {
  customers: CustomerSearchResult[];
  emptyTitle: string;
  emptyDescription: string;
  pagination: CustomerListPaginationMetadata;
  query: string;
  resultSummary?: string;
};

const EMPTY_VALUE = '-';

/**
 * Renders a muted label and customer value line when the value is available.
 *
 * @param props - Field label and value to display in a compact table cell.
 * @returns A labeled line, or null when the value is empty.
 */
function DetailLine({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span>{value}</span>
    </div>
  );
}

/**
 * Formats a numeric booking count for the booking history column.
 *
 * @param count - Number of booking-customer records attached to a customer.
 * @returns Singular or plural booking count text.
 */
function formatBookingCount(count: number) {
  return `${count} ${count === 1 ? 'booking' : 'bookings'}`;
}

/**
 * Renders one customer identity cell with name, Chinese name, and language.
 *
 * @param customer - Customer result to summarize.
 * @returns Stacked customer identity details.
 */
function renderCustomerCell(customer: CustomerSearchResult) {
  return (
    <div className="space-y-1">
      <div className="font-medium text-foreground">{customer.name}</div>
      <div className="space-y-0.5 text-sm text-muted-foreground">
        <DetailLine label="Chinese name" value={customer.chineseName} />
        <DetailLine
          label="Language"
          value={formatEnumLabel(customer.preferredLanguage, {
            emptyValue: null,
          })}
        />
      </div>
    </div>
  );
}

/**
 * Renders customer contact channels used for duplicate prevention.
 *
 * @param customer - Customer result to summarize.
 * @returns Stacked contact details, or a placeholder when none exist.
 */
function renderContactCell(customer: CustomerSearchResult) {
  const lines = [
    <DetailLine key="wechat" label="WeChat" value={customer.weChatId} />,
    <DetailLine
      key="whatsapp"
      label="WhatsApp"
      value={customer.whatsAppNumber}
    />,
    <DetailLine key="email" label="Email" value={customer.email} />,
    <DetailLine key="phone" label="Phone" value={customer.phone} />,
  ].filter(Boolean);

  return lines.length > 0 ? (
    <div className="space-y-0.5 text-sm">{lines}</div>
  ) : (
    <span className="text-muted-foreground">{EMPTY_VALUE}</span>
  );
}

/**
 * Renders recent booking context for a customer list row.
 *
 * @param customer - Customer result to summarize.
 * @returns Last booking date, last activity, and booking count.
 */
function renderBookingHistoryCell(customer: CustomerSearchResult) {
  return (
    <div className="space-y-0.5 text-sm">
      <DetailLine
        label="Last booking"
        value={formatDisplayDate(customer.lastBookingDate, {
          emptyValue: EMPTY_VALUE,
        })}
      />
      <DetailLine
        label="Last activity"
        value={formatEnumLabel(customer.lastActivity, {
          emptyValue: EMPTY_VALUE,
        })}
      />
      <div className="text-muted-foreground">
        {formatBookingCount(customer.bookingCount)}
      </div>
    </div>
  );
}

/**
 * Renders latest known dive-profile fields for a customer list row.
 *
 * @param customer - Customer result to summarize.
 * @returns Certification, logged dives, and last dive date details.
 */
function renderDiveProfileCell(customer: CustomerSearchResult) {
  return (
    <div className="space-y-0.5 text-sm">
      <DetailLine
        label="Certification"
        value={customer.certificationLevel ?? EMPTY_VALUE}
      />
      <DetailLine
        label="Logged dives"
        value={customer.divesLogged ?? EMPTY_VALUE}
      />
      <DetailLine
        label="Last dive"
        value={formatDisplayDate(customer.lastDiveDate, {
          emptyValue: EMPTY_VALUE,
        })}
      />
    </div>
  );
}

/**
 * Renders the internal customer lookup table or the appropriate empty state.
 *
 * @param props - Customers to show plus empty/result text for the current page state.
 * @returns Customer list table, optional result summary, or empty-state card.
 */
export function CustomerList({
  customers,
  emptyTitle,
  emptyDescription,
  pagination,
  query,
  resultSummary,
}: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{emptyTitle}</CardTitle>
          <CardDescription>{emptyDescription}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section className="space-y-3">
      {resultSummary ? (
        <p className="text-sm text-muted-foreground">{resultSummary}</p>
      ) : null}

      <Card className="overflow-hidden rounded-2xl border border-border bg-linear-to-b from-card to-card-glow py-0 shadow-sm">
        <CardContent className="p-0">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="border-b bg-muted/40">
                <TableHead className="h-12 w-[22%] pl-6 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Customer
                </TableHead>
                <TableHead className="h-12 w-[24%] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Contact
                </TableHead>
                <TableHead className="h-12 w-[22%] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Booking history
                </TableHead>
                <TableHead className="h-12 w-[22%] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Dive profile
                </TableHead>
                <TableHead className="h-12 w-[10%] pr-6 text-right text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="border-b last:border-b-0"
                >
                  <TableCell className="whitespace-normal wrap-break-word py-5 pl-6 align-top">
                    {renderCustomerCell(customer)}
                  </TableCell>
                  <TableCell className="whitespace-normal wrap-break-word py-5 align-top">
                    {renderContactCell(customer)}
                  </TableCell>
                  <TableCell className="whitespace-normal wrap-break-word py-5 align-top">
                    {renderBookingHistoryCell(customer)}
                  </TableCell>
                  <TableCell className="whitespace-normal wrap-break-word py-5 align-top">
                    {renderDiveProfileCell(customer)}
                  </TableCell>
                  <TableCell className="py-5 pr-6 text-right align-top">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/customers/${customer.id}`}>
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          Showing {customers.length} of {pagination.totalCount} customers
        </p>
        <div>
          <CustomerPagination pagination={pagination} query={query} />
        </div>
      </div>
    </section>
  );
}
