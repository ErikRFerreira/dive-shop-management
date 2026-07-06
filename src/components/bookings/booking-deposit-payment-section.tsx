import type { BookingDetailsItem } from '@/features/bookings/queries';
import { formatBookingDate, formatBookingEnum } from './booking-display-utils';
import { BookingInfoField, BookingInfoSection } from './booking-info-layout';

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
    <div className="grid gap-4 rounded-lg border p-4 sm:col-span-2 sm:grid-cols-2 bg-muted/30">
      <BookingInfoField
        label="Deposit status"
        value={formatBookingEnum(deposit.status)}
      />
      <BookingInfoField
        label="Amount"
        value={
          deposit.amount === null
            ? null
            : `${deposit.amount.toString()} ${deposit.currency ?? ''}`.trim()
        }
      />
      <BookingInfoField label="Currency" value={deposit.currency} />
      <BookingInfoField label="Paid to" value={deposit.paidTo} />
      <BookingInfoField label="Payment method" value={deposit.paymentMethod} />
      <BookingInfoField
        label="Due date"
        value={formatBookingDate(deposit.dueAt)}
      />
      <BookingInfoField
        label="Paid date"
        value={formatBookingDate(deposit.paidAt)}
      />
      <div className="sm:col-span-2">
        <BookingInfoField
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
export function BookingDepositPaymentSection({
  booking,
}: {
  booking: BookingDetailsItem;
}) {
  return (
    <BookingInfoSection title="Deposit / payment">
      {booking.deposits.length === 0 ? (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          No deposit recorded.
        </p>
      ) : (
        booking.deposits.map((deposit) => (
          <DepositPaymentCard deposit={deposit} key={deposit.id} />
        ))
      )}
    </BookingInfoSection>
  );
}
