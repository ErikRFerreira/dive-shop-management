import { ScheduleAssignmentsList } from '@/components/schedule/schedule-assignments';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import { formatScheduleActivityLabel } from '@/features/schedule/utils';
import type { AssignableStaff } from '@/features/schedule/types';
import {
  formatBookingDate,
  formatBookingTimeOrTbd,
} from '../../booking-display-utils';
import {
  BookingInfoField,
  BookingInfoSection,
} from '../../booking-info-layout';

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
            <div className="grid gap-4 sm:grid-cols-2">
              <BookingInfoField
                label={getScheduleItemLabel(scheduleItem.dayNumber, index)}
                value={formatBookingDate(scheduleItem.date)}
              />
              <BookingInfoField
                label="Scheduled time"
                value={formatBookingTimeOrTbd(scheduleItem.startTime)}
              />
              <BookingInfoField
                label="Activity"
                value={formatScheduleActivityLabel(scheduleItem.activityType)}
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
 * Builds the display label for one scheduled course day or activity slot.
 *
 * @param dayNumber - Persisted one-based course day number, when available.
 * @param index - Zero-based display position used as a fallback.
 * @returns A concise field label for the schedule timeline.
 */
function getScheduleItemLabel(dayNumber: number | null, index: number) {
  return `Day ${dayNumber ?? index + 1} date`;
}
