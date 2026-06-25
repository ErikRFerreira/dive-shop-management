import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { BookingDetailsItem } from '@/features/bookings/queries';

export const EMPTY_VALUE = '\u2014';

const dateFormatter = new Intl.DateTimeFormat('en-SG', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Singapore',
});

export function formatDate(value: Date | null | undefined) {
  return value ? dateFormatter.format(value) : EMPTY_VALUE;
}

export function formatEnum(value: string | null | undefined) {
  return value
    ? value
        .toLowerCase()
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : EMPTY_VALUE;
}

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
