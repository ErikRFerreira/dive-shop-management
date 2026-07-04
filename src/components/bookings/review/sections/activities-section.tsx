import { ActivityType } from '@/generated/prisma/enums';
import type { ReviewActivity } from '../booking-review-activities';
import { Field, ReviewDetailsCard, formatDate, formatEnum } from '../booking-review-display';

/**
 * Renders the admin review activity cards.
 *
 * @param props - Normalized booking activities shown to the reviewer.
 * @returns The activities review section.
 */
export function ActivitiesSection({
  activities,
}: {
  activities: ReviewActivity[];
}) {
  return (
    <ReviewDetailsCard title="Activities">
      {activities.map((activity, index) => (
        <div
          className="space-y-4 rounded-lg border p-4 sm:col-span-2"
          key={activity.id}
        >
          <h3 className="font-medium">Activity {index + 1}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Activity type" value={formatEnum(activity.activityType)} />
            {activity.activityType === ActivityType.SPECIALTY_COURSE ? (
              <Field label="Specialty course" value={activity.specialtyCourse} />
            ) : null}
            <Field label="Requested date" value={formatDate(activity.requestedDate)} />
            <Field label="Requested time" value={activity.requestedTime} />
            <Field label="Activity notes" value={activity.notes} />
          </div>
        </div>
      ))}
    </ReviewDetailsCard>
  );
}
