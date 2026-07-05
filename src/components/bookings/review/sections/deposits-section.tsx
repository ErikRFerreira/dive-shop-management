import type { BookingDetailsItem } from '@/features/bookings/queries';
import {
  Field,
  ReviewDetailsCard,
  formatDate,
  formatEnum,
} from '../booking-review-display';

/**
 * Renders deposit and payment details for admin review.
 *
 * @param props - Booking detail payload with deposit records.
 * @returns Deposit/payment review section.
 */
export function DepositsSection({ booking }: { booking: BookingDetailsItem }) {
  return (
    <ReviewDetailsCard title="Deposit / payment">
      {booking.deposits.length === 0 ? (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          No deposit recorded.
        </p>
      ) : (
        booking.deposits.map((deposit) => (
          <div
            className="grid gap-4 rounded-lg border p-4 sm:col-span-2 sm:grid-cols-2"
            key={deposit.id}
          >
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
            <Field
              label="Payment notes"
              value={deposit.notes?.trim() || 'No payment notes.'}
            />
          </div>
        ))
      )}
    </ReviewDetailsCard>
  );
}
