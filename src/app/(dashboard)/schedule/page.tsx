import { ScheduleList } from '@/components/schedule/schedule-list';
import { getScheduledBookingsForSchedulePage } from '@/features/schedule/queries';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';

async function SchedulePage() {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'schedule');
  const scheduleItems = await getScheduledBookingsForSchedulePage(currentUser);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Official scheduled bookings grouped by date.
        </p>
      </div>

      <ScheduleList items={scheduleItems} />
    </div>
  );
}

export default SchedulePage;
