import type { BookingDetailsItem } from '@/features/bookings/queries';
import {
  Field,
  ReviewDetailsCard,
  formatCustomerName,
  formatEnum,
} from '../booking-review-display';
import { EquipmentDetails } from './equipment-details';
import { FunDiverDetails } from './fun-diver-details';

/**
 * Renders the customer and diver details reviewed by admins and managers.
 *
 * @param props - Booking detail payload and fun-dive display flag.
 * @returns Customer/diver review section.
 */
export function CustomersSection({
  booking,
  includesFunDive,
}: {
  booking: BookingDetailsItem;
  includesFunDive: boolean;
}) {
  return (
    <ReviewDetailsCard title="Customer/diver details">
      {booking.customers.length === 0 ? (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          No customer or diver details.
        </p>
      ) : (
        booking.customers.map((bookingCustomer) => {
          const customer = bookingCustomer.customer;

          return (
            <div
              className="space-y-6 rounded-lg border p-4 sm:col-span-2"
              key={bookingCustomer.customerId}
            >
              <div>
                <h3 className="font-medium">{formatCustomerName(customer)}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatEnum(bookingCustomer.role)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Chinese name" value={customer.chineseName} />
                <Field label="WeChat ID" value={customer.weChatId} />
                <Field label="WhatsApp number" value={customer.whatsAppNumber} />
                <Field label="Email" value={customer.email} />
                <Field label="Phone" value={customer.phone} />
                <Field
                  label="Hotel for this booking"
                  value={bookingCustomer.hotelAtBooking}
                />
                <Field
                  label="Preferred language"
                  value={formatEnum(customer.preferredLanguage)}
                />
                <Field
                  label="Customer/diver notes"
                  value={bookingCustomer.notes}
                />
              </div>

              <EquipmentDetails bookingCustomer={bookingCustomer} />

              {includesFunDive ? (
                <FunDiverDetails bookingCustomer={bookingCustomer} />
              ) : null}
            </div>
          );
        })
      )}
    </ReviewDetailsCard>
  );
}
