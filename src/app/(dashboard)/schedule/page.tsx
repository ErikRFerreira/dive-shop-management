import { ScheduleCalendar } from '@/components/schedule/schedule-calendar';
import { ScheduleFilters } from '@/components/schedule/schedule-filters';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { parseScheduleFiltersFromSearchParams } from '@/features/schedule/filters';
import { canManageScheduleAssignments } from '@/features/schedule/permissions';
import {
  getAssignableStaff,
  getScheduleItemsForCalendar,
} from '@/features/schedule/queries';
import { UserRole } from '@/generated/prisma/enums';
import { serializeScheduleCalendarEvents } from '@/features/schedule/utils';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';

/**
 * Renders the internal schedule calendar for official scheduled bookings.
 *
 * @param props - Next.js page props containing URL search params.
 * @returns The schedule page with server-fetched events passed to the client calendar.
 */
async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'schedule');
  const canManageAssignments = canManageScheduleAssignments(currentUser);
  const canViewBookingDetails = currentUser.role !== UserRole.INSTRUCTOR;
  const scheduleFilters = parseScheduleFiltersFromSearchParams(
    await searchParams,
  );
  const scheduleItems = await getScheduleItemsForCalendar(
    currentUser,
    scheduleFilters,
  );
  const scheduleEvents = serializeScheduleCalendarEvents(scheduleItems);
  const assignableStaff = await getAssignableStaff();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Official scheduled bookings shown by month, week, day, and list.
        </p>
      </div>

      <ScheduleFilters
        assignableStaff={assignableStaff}
        filters={scheduleFilters}
      />

      <ScheduleCalendar
        assignableStaff={canManageAssignments ? assignableStaff : []}
        canManageAssignments={canManageAssignments}
        canViewBookingDetails={canViewBookingDetails}
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
