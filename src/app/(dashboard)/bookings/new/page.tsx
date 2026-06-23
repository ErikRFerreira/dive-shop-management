import { BookingForm } from '@/components/bookings/booking-form';

/** Renders the route composition for a new internal booking request. */
function NewBooking() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Booking</h1>
        <p className="text-sm text-muted-foreground">
          Capture the request before submitting it for administrative review.
        </p>
      </div>
      <BookingForm />
    </div>
  );
}

export default NewBooking;
