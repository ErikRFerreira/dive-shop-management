import { ScheduleCalendar } from '@/components/schedule/schedule-calendar';
import { getScheduleItemsForCalendar } from '@/features/schedule/queries';
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
  const scheduleItems = await getScheduleItemsForCalendar(currentUser);
  const scheduleEvents = serializeScheduleCalendarEvents(scheduleItems);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Official scheduled bookings shown by month, week, day, and list.
        </p>
      </div>

      <ScheduleCalendar events={scheduleEvents} />
    </div>
  );
}

export default SchedulePage;
