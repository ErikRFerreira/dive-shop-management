import { ScheduleCalendar } from '@/components/schedule/schedule-calendar';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { canManageScheduleAssignments } from '@/features/schedule/permissions';
import {
  getAssignableStaff,
  getScheduleItemsForCalendar,
} from '@/features/schedule/queries';
import { serializeScheduleCalendarEvents } from '@/features/schedule/utils';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';

/**
 * Renders the internal schedule calendar for official scheduled bookings.
 *
 * @returns The schedule page with server-fetched events passed to the client calendar.
 */
async function SchedulePage() {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'schedule');
  const canManageAssignments = canManageScheduleAssignments(currentUser);
  const scheduleItems = await getScheduleItemsForCalendar(currentUser);
  const scheduleEvents = serializeScheduleCalendarEvents(scheduleItems);
  const assignableStaff = canManageAssignments ? await getAssignableStaff() : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Official scheduled bookings shown by month, week, day, and list.
        </p>
      </div>

      <ScheduleCalendar
        assignableStaff={assignableStaff}
        canManageAssignments={canManageAssignments}
        events={scheduleEvents}
      />
      {scheduleEvents.length === 0 ? <ScheduleEmptyState /> : null}
    </div>
  );
}

/**
 * Renders a clear empty state when there are no official scheduled bookings.
 *
 * @returns Staff-facing empty state content for the schedule page.
 */
function ScheduleEmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No scheduled bookings yet</CardTitle>
        <CardDescription>
          Approved bookings will appear here after admin schedules them.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default SchedulePage;
