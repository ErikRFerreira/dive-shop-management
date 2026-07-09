import { ScheduleAssignmentsList } from '@/components/schedule/schedule-assignments';
import type { BookingDetailsItem } from '@/features/bookings/queries';
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
  if (!booking.scheduleItem) {
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
      <BookingInfoField
        label="Scheduled date"
        value={formatBookingDate(booking.scheduleItem.date)}
      />
      <BookingInfoField
        label="Scheduled time"
        value={formatBookingTimeOrTbd(booking.scheduleItem.startTime)}
      />
      {booking.scheduleItem.scheduleNotes ? (
        <div className="sm:col-span-2">
          <BookingInfoField
            label="Schedule notes"
            value={booking.scheduleItem.scheduleNotes}
          />
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <ScheduleAssignmentsList
          assignableStaff={assignableStaff}
          assignments={booking.scheduleItem.assignments}
          canManageAssignments={canManageAssignments}
          scheduleItemId={booking.scheduleItem.id}
        />
      </div>
    </BookingInfoSection>
  );
}
