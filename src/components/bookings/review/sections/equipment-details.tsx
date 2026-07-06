import type { BookingDetailsItem } from '@/features/bookings/queries';
import { Field } from '../booking-review-display';

/**
 * Renders equipment and sizing details for one reviewed customer/diver.
 *
 * @param props - Booking customer row attached to the reviewed booking.
 * @returns Equipment detail fields.
 */
export function EquipmentDetails({
  bookingCustomer,
}: {
  bookingCustomer: BookingDetailsItem['customers'][number];
}) {
  return (
    <div>
      <h4 className="font-medium">Equipment details</h4>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Equipment needed" value={bookingCustomer.equipmentNeeded} />
        <Field
          label="Height"
          value={
            bookingCustomer.heightCm === null
              ? null
              : `${bookingCustomer.heightCm} cm`
          }
        />
        <Field
          label="Weight"
          value={
            bookingCustomer.weightKg === null
              ? null
              : `${bookingCustomer.weightKg.toString()} kg`
          }
        />
        <Field label="Shoe size" value={bookingCustomer.shoeSize?.toString()} />
      </div>
    </div>
  );
}
