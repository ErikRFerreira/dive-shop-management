import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { BookingDetailsItem } from '@/features/bookings/queries';
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

export function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  const displayValue =
    value === null || value === undefined || value === '' ? EMPTY_VALUE : value;

  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{displayValue}</div>
    </div>
  );
}

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
