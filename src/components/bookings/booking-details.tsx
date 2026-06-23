import Link from 'next/link';

import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { Button } from '@/components/ui/button';
import { BookingCustomerRole } from '@/generated/prisma/enums';
import type { BookingListItem } from '@/features/bookings/queries';

type Props = {
  booking: BookingListItem;
};

const dateFormatter = new Intl.DateTimeFormat('en-SG', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Singapore',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-SG', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Singapore',
});

function formatDate(value: Date | null) {
  return value ? dateFormatter.format(value) : '—';
}

function formatDateTime(value: Date) {
  return dateTimeFormatter.format(value);
}

function formatEnum(value: string | null | undefined) {
  return value
    ? value
        .toLowerCase()
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : '—';
}

function formatCustomerName(
  customer: BookingListItem['displayCustomer'],
) {
  const fullName = customer?.fullName?.trim();

  if (fullName) {
    return fullName;
  }

  return (
    [customer?.firstName, customer?.lastName]
      .filter((part): part is string => Boolean(part))
      .join(' ') || '—'
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value || '—'}</dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t pt-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function BookingDetails({ booking }: Props) {
  const bookingCustomer =
    booking.customers.find(
      (customer) => customer.role === BookingCustomerRole.PRIMARY_CONTACT,
    ) ?? booking.customers[0];
  const customer = bookingCustomer?.customer ?? null;
  const deposit = booking.deposits[0];
  const customerName = formatCustomerName(customer);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <header>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Booking details</h1>
          <Button asChild variant="outline">
            <Link href="/bookings">Back to booking requests</Link>
          </Button>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Reference code" value={booking.id} />
          <Field
            label="Status"
            value={<BookingStatusBadge status={booking.status} />}
          />
          <Field label="Activity type" value={formatEnum(booking.activityType)} />
          <Field label="Requested date" value={formatDate(booking.requestedDate)} />
          <Field label="Customer name" value={customerName} />
        </dl>
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">Raw booking text</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{booking.notes || '—'}</p>
        </div>
      </header>

      <Section title="Booking details">
        <Field label="Activity type" value={formatEnum(booking.activityType)} />
        <Field label="Requested date" value={formatDate(booking.requestedDate)} />
        <Field label="Requested time" value={booking.requestedTime} />
        <Field label="Number of people" value={booking.numberOfPeople} />
        <Field label="Source/referrer" value={formatEnum(booking.source)} />
        <Field label="Referrer name" value={booking.referrerName} />
        <Field label="Customer service owner" value={booking.createdBy.name} />
        <Field label="Created date" value={formatDateTime(booking.createdAt)} />
        <Field label="Updated date" value={formatDateTime(booking.updatedAt)} />
      </Section>

      <Section title="Customer/diver details">
        <Field label="Customer name" value={customerName} />
        <Field label="Chinese name" value={customer?.chineseName} />
        <Field label="WeChat ID" value={customer?.weChatId} />
        <Field label="WhatsApp number" value={customer?.whatsAppNumber} />
        <Field label="Email" value={customer?.email} />
        <Field label="Phone" value={customer?.phone} />
        <Field label="Hotel" value={customer?.hotel} />
        <Field
          label="Preferred language"
          value={formatEnum(customer?.preferredLanguage)}
        />
        <Field
          label="Certification level"
          value={bookingCustomer?.certificationLevel}
        />
        <Field
          label="Certification agency"
          value={bookingCustomer?.certificationAgency}
        />
        <Field
          label="Last dive date"
          value={formatDate(bookingCustomer?.lastDiveAt ?? null)}
        />
        <Field label="Number of logged dives" value={bookingCustomer?.divesLogged} />
      </Section>

      <Section title="Sizing details">
        <Field
          label="Height"
          value={
            bookingCustomer?.heightCm === null || bookingCustomer?.heightCm === undefined
              ? '—'
              : `${bookingCustomer.heightCm} cm`
          }
        />
        <Field
          label="Weight"
          value={
            bookingCustomer?.weightKg === null || bookingCustomer?.weightKg === undefined
              ? '—'
              : `${bookingCustomer.weightKg.toString()} kg`
          }
        />
        <Field
          label="Shoe size"
          value={bookingCustomer?.shoeSize?.toString()}
        />
      </Section>

      <Section title="Deposit details">
        <Field label="Deposit status" value={formatEnum(deposit?.status)} />
        <Field label="Amount" value={deposit?.amount?.toString()} />
        <Field label="Currency" value={deposit?.currency} />
        <Field label="Paid to" value={deposit?.paidTo} />
        <Field label="Payment method" value={deposit?.paymentMethod} />
        <Field label="Payment notes" value={deposit?.notes} />
      </Section>

      <Section title="Internal notes">
        <Field label="Internal notes" value={booking.internalNotes} />
      </Section>
    </div>
  );
}

export default BookingDetails;
