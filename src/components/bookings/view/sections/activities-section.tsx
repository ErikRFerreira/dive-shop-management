import type { BookingActivityDisplay } from '../booking-detail-display';
import {
  formatDate,
  formatEnum,
  formatTimeOrTbd,
} from '../booking-detail-display';
import { Field, Section } from '../booking-detail-layout';
import { Waves } from 'lucide-react';

/**
 * Renders one requested activity card.
 *
 * @param props - Activity row and its one-based display index.
 * @returns Read-only activity detail card.
 */
function ActivityCard({
  activity,
  index,
}: {
  activity: BookingActivityDisplay;
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
        <Field
          label="Activity type"
          value={formatEnum(activity.activityType)}
        />
        {activity.specialtyCourse ? (
          <Field label="Specialty course" value={activity.specialtyCourse} />
        ) : null}
        <Field
          label="Requested date"
          value={formatDate(activity.requestedDate)}
        />
        <Field
          label="Requested time"
          value={formatTimeOrTbd(activity.requestedTime)}
        />
        <div className="sm:col-span-2 border-t border-muted-foreground/20 pt-4">
          <Field
            label="Activity notes"
            value={activity.notes?.trim() || 'No activity notes.'}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Renders all requested booking activities as cards.
 *
 * @param props - Normalized activity rows for the detail page.
 * @returns Activities section.
 */
export function ActivitiesSection({
  activities,
}: {
  activities: BookingActivityDisplay[];
}) {
  return (
    <Section title="Activities">
      {activities.map((activity, index) => (
        <ActivityCard activity={activity} index={index} key={activity.id} />
      ))}
    </Section>
  );
}
