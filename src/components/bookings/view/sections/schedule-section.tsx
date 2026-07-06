import { ScheduleAssignmentsList } from '@/components/schedule/schedule-assignments';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import type { AssignableStaff } from '@/features/schedule/types';
import { formatDate, formatTimeOrTbd } from '../booking-detail-display';
import { Field, Section } from '../booking-detail-layout';

/**
 * Renders schedule details and assignment controls when a schedule item exists.
 *
 * @param props - Schedule assignment data and management permissions.
 * @returns Schedule detail section or null.
 */
export function ScheduleSection({
  assignableStaff,
  booking,
  canManageAssignments,
}: {
  assignableStaff: AssignableStaff[];
  booking: BookingDetailsItem;
  canManageAssignments: boolean;
}) {
  if (!booking.scheduleItem) {
    return null;
  }

  return (
    <Section title="Schedule">
      <Field label="Scheduled date" value={formatDate(booking.scheduleItem.date)} />
      <Field
        label="Scheduled time"
        value={formatTimeOrTbd(booking.scheduleItem.startTime)}
      />
      {booking.scheduleItem.scheduleNotes ? (
        <div className="sm:col-span-2">
          <Field label="Schedule notes" value={booking.scheduleItem.scheduleNotes} />
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
    </Section>
  );
}
