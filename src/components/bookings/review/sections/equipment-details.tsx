import type { BookingDetailsItem } from '@/features/bookings/queries';
import {
  formatEquipmentNeeded,
  isEquipmentNeeded,
} from '@/features/bookings/equipment';
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
  const shouldShowEquipmentSizing = isEquipmentNeeded(
    bookingCustomer.equipmentNeeded,
  );

  return (
    <div>
      <h4 className="font-medium">Equipment details</h4>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          label="Equipment needed"
          value={formatEquipmentNeeded(bookingCustomer.equipmentNeeded)}
        />
        {shouldShowEquipmentSizing ? (
          <>
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
            <Field
              label="Shoe size"
              value={bookingCustomer.shoeSize?.toString()}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
