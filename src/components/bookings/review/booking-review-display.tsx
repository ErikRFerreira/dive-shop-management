import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { BookingDetailsItem } from '@/features/bookings/queries';
import { BookingCustomerRole } from '@/generated/prisma/enums';
import { formatDisplayDate, formatEnumLabel } from '@/lib/format';

export const EMPTY_VALUE = '\u2014';

/**
 * Formats a nullable date for booking review display.
 *
 * @param value - Date value from the booking detail payload.
 * @returns Staff-facing date text, or the review empty-value placeholder.
 */
export function formatDate(value: Date | null | undefined) {
  return formatDisplayDate(value);
}

/**
 * Formats enum-like values for booking review display.
 *
 * @param value - Raw enum text from the booking detail payload.
 * @returns Staff-facing label text, or the review empty-value placeholder.
 */
export function formatEnum(value: string | null | undefined) {
  return formatEnumLabel(value);
}

/**
 * Formats a requested time where missing values should remain operationally explicit.
 *
 * @param value - Stored requested time from a booking or activity.
 * @returns The stored time text, or `TBD` when no time has been captured.
 */
export function formatTimeOrTbd(value: string | null | undefined) {
  return value?.trim() || 'TBD';
}

/**
 * Formats the customer name shown in booking review sections.
 *
 * @param customer - Customer fields selected for the booking detail payload.
 * @returns Full name, first/last name fallback, or the review empty-value placeholder.
 */
export function formatCustomerName(
  customer: BookingDetailsItem['displayCustomer'],
) {
  const fullName = customer?.fullName?.trim();
  if (fullName) return fullName;

  return (
    [customer?.firstName, customer?.lastName]
      .filter((part): part is string => Boolean(part))
      .join(' ') || EMPTY_VALUE
  );
}

/**
 * Finds the booking customer staff should treat as the primary operational contact.
 *
 * @param booking - Booking detail payload with customer join rows.
 * @returns The explicit primary contact, first customer fallback, or null.
 */
export function getPrimaryBookingCustomer(booking: BookingDetailsItem) {
  return (
    booking.customers.find(
      (customer) => customer.role === BookingCustomerRole.PRIMARY_CONTACT,
    ) ??
    booking.customers[0] ??
    null
  );
}

/**
 * Formats a source and optional referrer into the standard staff-facing label.
 *
 * @param booking - Booking fields used for source and referrer display.
 * @returns Source, referrer, both joined with a slash, or the empty placeholder.
 */
export function formatSourceReferrer(
  booking: Pick<BookingDetailsItem, 'source' | 'referrerName'>,
) {
  const source = booking.source ? formatEnum(booking.source) : null;
  const referrer = booking.referrerName?.trim();

  if (source && referrer) {
    return `${source} / ${referrer}`;
  }

  return source ?? referrer ?? EMPTY_VALUE;
}

/**
 * Renders a label/value pair for the admin review UI.
 *
 * @param props - Field label and rendered value.
 * @returns A compact review field with the standard empty placeholder.
 */
export function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const displayValue =
    value === null || value === undefined || value === '' ? EMPTY_VALUE : value;

  return (
    <div className="flex items-start gap-3">
      {icon && (
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-foreground text-pretty">
          {displayValue}
        </p>
      </div>
    </div>
  );
}

/**
 * Renders a titled card with the standard admin review field grid.
 *
 * @param props - Card title and field/content children.
 * @returns A review details card.
 */
export function ReviewDetailsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {children}
      </CardContent>
    </Card>
  );
}
