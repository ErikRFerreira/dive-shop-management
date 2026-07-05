import { Waves } from 'lucide-react';
import type { BookingActivityDisplayItem } from './booking-display-utils';
import {
  formatBookingDate,
  formatBookingEnum,
  formatBookingTimeOrTbd,
} from './booking-display-utils';
import { BookingInfoField, BookingInfoSection } from './booking-info-layout';

/**
 * Renders one requested booking activity card.
 *
 * @param props - Activity row and its zero-based display index.
 * @returns Read-only activity detail card.
 */
function ActivityCard({
  activity,
  index,
}: {
  activity: BookingActivityDisplayItem;
  index: number;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4 sm:col-span-2">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
          <Waves className="size-4" />
        </span>
        <h3 className="font-semibold">Activity {index + 1}</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <BookingInfoField
          label="Activity type"
          value={formatBookingEnum(activity.activityType)}
        />
        {activity.specialtyCourse ? (
          <BookingInfoField
            label="Specialty course"
            value={activity.specialtyCourse}
          />
        ) : null}
        <BookingInfoField
          label="Requested date"
          value={formatBookingDate(activity.requestedDate)}
        />
        <BookingInfoField
          label="Requested time"
          value={formatBookingTimeOrTbd(activity.requestedTime)}
        />
        <div className="border-t border-muted-foreground/20 pt-4 sm:col-span-2">
          <BookingInfoField
            label="Activity notes"
            value={activity.notes?.trim() || 'No activity notes.'}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Renders all requested booking activities as shared read-only cards.
 *
 * @param props - Normalized activity rows for booking detail or review pages.
 * @returns Activities section.
 */
export function ActivitiesSection({
  activities,
}: {
  activities: BookingActivityDisplayItem[];
}) {
  return (
    <BookingInfoSection title="Activities">
      {activities.map((activity, index) => (
        <ActivityCard activity={activity} index={index} key={activity.id} />
      ))}
    </BookingInfoSection>
  );
}
