import Link from 'next/link';

import {
  Field,
  formatDate,
  formatEnum,
} from '@/components/bookings/booking-review-display';
import { BookingReviewMainSections } from '@/components/bookings/booking-review-sections';
import { BookingReviewSidebar } from '@/components/bookings/booking-review-sidebar';
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import { getMissingBookingReviewInformation } from '@/features/bookings/review-requirements';
import { summarizeBookingActivities } from '@/features/bookings/utils';
import { ActivityType } from '@/generated/prisma/enums';

type BookingReviewProps = {
  booking: BookingDetailsItem;
  canApprove: boolean;
};

type ReviewActivity = Pick<
  BookingDetailsItem['activities'][number],
  'id' | 'activityType' | 'specialtyCourse' | 'requestedDate' | 'requestedTime' | 'notes'
>;

function getReviewActivities(booking: BookingDetailsItem): ReviewActivity[] {
  return booking.activities.length > 0
    ? booking.activities
    : [
        {
          id: 'legacy-summary',
          activityType: booking.activityType,
          specialtyCourse: booking.specialtyCourse,
          requestedDate: booking.requestedDate,
          requestedTime: booking.requestedTime,
          notes: null,
        },
      ];
}

export function BookingReview({ booking, canApprove }: BookingReviewProps) {
  const activities = getReviewActivities(booking);
  const includesFunDive = activities.some(
    (activity) => activity.activityType === ActivityType.FUN_DIVE,
  );
  const missingInformation = getMissingBookingReviewInformation(booking);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Admin review</h1>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            Booking ID: {booking.id}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/bookings/${booking.id}`}>Back to booking details</Link>
        </Button>
      </header>

      <Card>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Requested date"
            value={formatDate(booking.requestedDate)}
          />
          <Field label="Requested time" value={booking.requestedTime} />
          <Field
            label="Activities"
            value={summarizeBookingActivities(
              booking.activities,
              booking.activityType,
            )}
          />
          <Field label="Source/referrer" value={formatEnum(booking.source)} />
          {booking.referrerName ? (
            <Field label="Referrer name" value={booking.referrerName} />
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <BookingReviewMainSections
          booking={booking}
          activities={activities}
          includesFunDive={includesFunDive}
        />
        <BookingReviewSidebar
          bookingId={booking.id}
          canApprove={canApprove}
          adminNotes={booking.adminNotes}
          rawBookingText={booking.notes}
          missingInformation={missingInformation}
          status={booking.status}
        />
      </div>
    </div>
  );
}
