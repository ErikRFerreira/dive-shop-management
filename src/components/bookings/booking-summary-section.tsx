import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import { summarizeBookingActivities } from '@/features/bookings/utils';
import {
  CalendarDays,
  Clock3,
  Contact,
  Hotel,
  MapPin,
  UserRound,
  Users,
  Waves,
} from 'lucide-react';
import type { BookingActivityDisplayItem } from './booking-display-utils';
import {
  EMPTY_BOOKING_VALUE,
  formatAssignedStaffSummary,
  formatBookingCustomerName,
  formatBookingDateTime,
  formatBookingSourceReferrer,
  formatRequestedDateTime,
  getPrimaryBookingCustomer,
} from './booking-display-utils';
import { BookingReferenceMetaItem } from './booking-info-layout';

/**
 * Renders the high-level booking summary card for operational scanning.
 *
 * @param props - Booking, normalized activities, and section title.
 * @returns Top left-column booking summary/reference card.
 */
export function BookingSummarySection({
  activities,
  booking,
  title,
}: {
  activities: BookingActivityDisplayItem[];
  booking: BookingDetailsItem;
  title: string;
}) {
  const bookingCustomer = getPrimaryBookingCustomer(booking);
  const activitySummary = summarizeBookingActivities(
    booking.activities,
    booking.activityType,
  );

  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-linear-to-b from-card to-card-glow shadow-sm">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="mt-1 font-mono text-sm font-semibold">
              Booking ID: {booking.id}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <BookingReferenceMetaItem
          icon={Contact}
          label="Primary customer"
          value={formatBookingCustomerName(bookingCustomer?.customer ?? null)}
        />
        <BookingReferenceMetaItem
          icon={Waves}
          label="Activity"
          value={activitySummary}
        />
        <BookingReferenceMetaItem
          icon={CalendarDays}
          label="Requested date / time"
          value={formatRequestedDateTime(booking, activities)}
        />
        <BookingReferenceMetaItem
          icon={Users}
          label="Total participants"
          value={booking.numberOfPeople}
        />
        <BookingReferenceMetaItem
          icon={MapPin}
          label="Source / referrer"
          value={formatBookingSourceReferrer(booking)}
        />
        <BookingReferenceMetaItem
          icon={Hotel}
          label="Hotel / pickup location"
          value={
            bookingCustomer?.hotelAtBooking ??
            bookingCustomer?.customer.hotel ??
            EMPTY_BOOKING_VALUE
          }
        />
        <BookingReferenceMetaItem
          icon={UserRound}
          label="Customer service owner"
          value={booking.createdBy.name}
        />
        <BookingReferenceMetaItem
          icon={Clock3}
          label="Last updated"
          value={formatBookingDateTime(booking.updatedAt)}
        />
        <BookingReferenceMetaItem
          icon={Users}
          label="Assigned staff"
          value={formatAssignedStaffSummary(booking)}
        />
      </CardContent>
    </Card>
  );
}
