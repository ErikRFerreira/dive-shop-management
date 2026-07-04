import type { BookingDetailsItem } from '@/features/bookings/queries';
import { Field, formatDate } from '../booking-review-display';

/**
 * Renders fun-dive experience details for one reviewed customer/diver.
 *
 * @param props - Booking customer row attached to the reviewed booking.
 * @returns Fun diver detail fields.
 */
export function FunDiverDetails({
  bookingCustomer,
}: {
  bookingCustomer: BookingDetailsItem['customers'][number];
}) {
  return (
    <div>
      <h4 className="font-medium">Fun diver details</h4>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          label="Certification level"
          value={bookingCustomer.certificationLevel}
        />
        <Field
          label="Certification agency"
          value={bookingCustomer.certificationAgency}
        />
        <Field label="Last dive date" value={formatDate(bookingCustomer.lastDiveAt)} />
        <Field label="Number of logged dives" value={bookingCustomer.divesLogged} />
      </div>
    </div>
  );
}
