import { ScheduleAssignmentsList } from '@/components/schedule/schedule-assignments';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import { getActivityShortLabel } from '@/features/bookings/activity-utils';
import {
  formatScheduleActivityLabel,
  formatScheduleDayLabel,
} from '@/features/schedule/utils';
import type { AssignableStaff } from '@/features/schedule/types';
import {
  formatBookingDate,
  formatBookingTimeOrTbd,
} from '../../booking-display-utils';
import {
  BookingInfoField,
  BookingInfoSection,
} from '../../booking-info-layout';
import { ScheduledCourseDayActions } from './scheduled-course-day-actions';

const MANAGER_ASSIGNMENT_AVAILABILITY_MESSAGE =
  'Approve and schedule this booking before assigning instructors or divemasters.';
const READ_ONLY_ASSIGNMENT_AVAILABILITY_MESSAGE =
  'Staff assignments are available after this booking is approved and added to the schedule.';

/**
 * Renders schedule details, official staff assignments, or the availability
 * explanation shown before a booking has been approved and scheduled.
 *
 * @param props - Schedule assignment data, permissions, and role-aware copy flag.
 * @returns Schedule detail section with assignment controls or availability copy.
 */
export function ScheduleSection({
  assignableStaff,
  booking,
  canManageAssignments,
  showManagerAssignmentAvailabilityCopy = false,
}: {
  assignableStaff: AssignableStaff[];
  booking: BookingDetailsItem;
  canManageAssignments: boolean;
  showManagerAssignmentAvailabilityCopy?: boolean;
}) {
  const scheduleItems =
    booking.scheduleItems ?? (booking.scheduleItem ? [booking.scheduleItem] : []);

  if (scheduleItems.length === 0) {
    return (
      <BookingInfoSection title="Schedule">
        <div className="sm:col-span-2">
          <BookingInfoField
            label="Assigned staff"
            value={
              <p className="text-sm text-muted-foreground">
                {showManagerAssignmentAvailabilityCopy
                  ? MANAGER_ASSIGNMENT_AVAILABILITY_MESSAGE
                  : READ_ONLY_ASSIGNMENT_AVAILABILITY_MESSAGE}
              </p>
            }
          />
        </div>
      </BookingInfoSection>
    );
  }

  return (
    <BookingInfoSection title="Schedule">
      <div className="space-y-5 sm:col-span-2">
        {scheduleItems.map((scheduleItem, index) => (
          <div
            className="space-y-4 border-b border-border pb-5 last:border-b-0 last:pb-0"
            key={scheduleItem.id}
          >
            {canManageAssignments ? (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {getScheduleItemHeading(
                      scheduleItem.dayNumber,
                      scheduleItem.totalDays,
                      index,
                    )}
                  </p>
                </div>
                <ScheduledCourseDayActions
                  assignmentCount={scheduleItem.assignments.length}
                  canRemoveDay={scheduleItem.totalDays > 1}
                  scheduleItemId={scheduleItem.id}
                />
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <BookingInfoField
                label={getScheduleItemDateLabel(
                  scheduleItem.dayNumber,
                  scheduleItem.totalDays,
                  index,
                )}
                value={formatBookingDate(scheduleItem.date)}
              />
              <BookingInfoField
                label="Scheduled time"
                value={formatBookingTimeOrTbd(scheduleItem.startTime)}
              />
              <BookingInfoField
                label="Course day"
                value={
                  formatScheduleDayLabel(
                    scheduleItem.dayNumber,
                    scheduleItem.totalDays,
                  ) ?? 'Single day'
                }
              />
              <BookingInfoField
                label="Activity"
                value={getScheduleItemActivityLabel(booking, scheduleItem)}
              />
              <BookingInfoField
                label="Active participants"
                value={formatActiveParticipantSummary(
                  booking.activeParticipantCount,
                )}
              />
              {scheduleItem.scheduleNotes ? (
                <BookingInfoField
                  label="Schedule notes"
                  value={scheduleItem.scheduleNotes}
                />
              ) : null}
            </div>
            <ScheduleAssignmentsList
              assignableStaff={assignableStaff}
              assignments={scheduleItem.assignments}
              canManageAssignments={canManageAssignments}
              scheduleItemId={scheduleItem.id}
            />
          </div>
        ))}
      </div>
    </BookingInfoSection>
  );
}

/**
 * Resolves the display label for one scheduled day in booking detail.
 *
 * @param booking - Booking detail payload containing activities and schedule rows.
 * @param scheduleItem - Scheduled day whose linked booking activity is preferred.
 * @returns Specialty-aware compact activity label, falling back to the schedule type.
 */
function getScheduleItemActivityLabel(
  booking: BookingDetailsItem,
  scheduleItem: BookingDetailsItem['scheduleItems'][number],
) {
  const linkedActivity = booking.activities.find(
    (activity) => activity.id === scheduleItem.bookingActivityId,
  );

  if (linkedActivity?.activityType) {
    return getActivityShortLabel(linkedActivity);
  }

  return formatScheduleActivityLabel(scheduleItem.activityType);
}

/**
 * Formats the booking's active participant count for each scheduled day.
 *
 * @param count - Active participant count derived from booking/customer rows.
 * @returns Staff-facing active participant summary.
 */
function formatActiveParticipantSummary(count: number) {
  const label = count === 1 ? 'participant' : 'participants';

  return `${count} active ${label}`;
}

/**
 * Builds the date field label for one scheduled course day or activity slot.
 *
 * @param dayNumber - Persisted one-based course day number, when available.
 * @param totalDays - Persisted total days for the scheduled activity.
 * @param index - Zero-based display position used as a fallback.
 * @returns A concise field label for the schedule timeline.
 */
function getScheduleItemDateLabel(
  dayNumber: number | null,
  totalDays: number,
  index: number,
) {
  const dayLabel = formatScheduleDayLabel(dayNumber, totalDays);

  return dayLabel ? `${dayLabel} date` : `Schedule ${index + 1} date`;
}

/**
 * Builds the compact heading for admin/manager scheduled-day controls.
 *
 * @param dayNumber - Persisted one-based course day number, when available.
 * @param totalDays - Persisted total days for the scheduled activity.
 * @param index - Zero-based display position used as a fallback.
 * @returns A concise schedule day heading.
 */
function getScheduleItemHeading(
  dayNumber: number | null,
  totalDays: number,
  index: number,
) {
  return formatScheduleDayLabel(dayNumber, totalDays) || `Schedule ${index + 1}`;
}
