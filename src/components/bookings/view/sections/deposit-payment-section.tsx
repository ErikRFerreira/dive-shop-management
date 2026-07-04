import type { BookingDetailsItem } from '@/features/bookings/queries';
import { formatDate, formatEnum } from '../booking-detail-display';
import { Field, Section } from '../booking-detail-layout';

/**
 * Renders one deposit/payment record.
 *
 * @param props - Deposit record from the booking detail payload.
 * @returns Read-only deposit/payment card.
 */
function DepositPaymentCard({
  deposit,
}: {
  deposit: BookingDetailsItem['deposits'][number];
}) {
  return (
    <div className="grid gap-4 rounded-lg border p-4 sm:col-span-2 sm:grid-cols-2">
      <Field label="Deposit status" value={formatEnum(deposit.status)} />
      <Field
        label="Amount"
        value={
          deposit.amount === null
            ? null
            : `${deposit.amount.toString()} ${deposit.currency ?? ''}`.trim()
        }
      />
      <Field label="Currency" value={deposit.currency} />
      <Field label="Paid to" value={deposit.paidTo} />
      <Field label="Payment method" value={deposit.paymentMethod} />
      <Field label="Due date" value={formatDate(deposit.dueAt)} />
      <Field label="Paid date" value={formatDate(deposit.paidAt)} />
      <div className="sm:col-span-2">
        <Field
          label="Payment notes"
          value={deposit.notes?.trim() || 'No payment notes.'}
        />
      </div>
    </div>
  );
}

/**
 * Renders deposit and payment details for the booking.
 *
 * @param props - Booking detail payload with deposit records.
 * @returns Deposit/payment section.
 */
export function DepositPaymentSection({
  booking,
}: {
  booking: BookingDetailsItem;
}) {
  return (
    <Section title="Deposit / payment">
      {booking.deposits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deposit recorded.</p>
      ) : (
        booking.deposits.map((deposit) => (
          <DepositPaymentCard deposit={deposit} key={deposit.id} />
        ))
      )}
    </Section>
  );
}
