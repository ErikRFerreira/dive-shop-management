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
import {
  EMPTY_VALUE,
  type BookingActivityDisplay,
  formatAssignedStaffSummary,
  formatCustomerName,
  formatDateTime,
  formatRequestedDateTime,
  formatSourceReferrer,
  getPrimaryBookingCustomer,
} from '../booking-detail-display';
import { BookingReferenceMetaItem } from '../booking-detail-layout';

/**
 * Renders the high-level booking reference card for operational scanning.
 *
 * @param props - Booking and normalized activities used for reference values.
 * @returns Top booking reference card.
 */
export function BookingReferenceCard({
  activities,
  booking,
}: {
  activities: BookingActivityDisplay[];
  booking: BookingDetailsItem;
}) {
  const bookingCustomer = getPrimaryBookingCustomer(booking);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Booking reference
            </p>
            <p className="mt-1 font-mono text-sm font-semibold">{booking.id}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <BookingReferenceMetaItem
          icon={Contact}
          label="Primary customer"
          value={formatCustomerName(bookingCustomer?.customer ?? null)}
        />
        <BookingReferenceMetaItem
          icon={Waves}
          label="Activity"
          value={summarizeBookingActivities(
            booking.activities,
            booking.activityType,
          )}
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
          value={formatSourceReferrer(booking)}
        />
        <BookingReferenceMetaItem
          icon={Hotel}
          label="Hotel / pickup location"
          value={
            bookingCustomer?.hotelAtBooking ??
            bookingCustomer?.customer.hotel ??
            EMPTY_VALUE
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
          value={formatDateTime(booking.updatedAt)}
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
