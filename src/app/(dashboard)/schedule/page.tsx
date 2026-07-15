import { ScheduleCalendar } from '@/components/schedule/schedule-calendar';
import { SchedulePageShell } from '@/components/schedule/schedule-page-shell';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getScheduleEmptyStateCopy } from '@/features/schedule/empty-states';
import { parseScheduleFiltersFromSearchParams } from '@/features/schedule/filters';
import { canManageScheduleAssignments } from '@/features/schedule/permissions';
import {
  getAssignableStaff,
  getScheduleItemsForCalendar,
  getScheduleStaffFilterOptions,
} from '@/features/schedule/queries';
import type { ScheduleFilters as ScheduleFiltersValue } from '@/features/schedule/types';
import { UserRole } from '@/generated/prisma/enums';
import { serializeScheduleCalendarEvents } from '@/features/schedule/utils';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import PageHeader from '@/components/common/page-header';

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
  const [assignableStaff, staffFilterOptions] = await Promise.all([
    canManageAssignments ? getAssignableStaff(currentUser) : Promise.resolve([]),
    getScheduleStaffFilterOptions(currentUser),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule"
        description="Approved bookings and scheduled activities for daily operations."
      />

      <SchedulePageShell
        filters={scheduleFilters}
        staffFilterOptions={staffFilterOptions}
      >
        {scheduleEvents.length === 0 ? (
          <ScheduleEmptyState filters={scheduleFilters} />
        ) : null}

        <ScheduleCalendar
          assignableStaff={assignableStaff}
          canManageAssignments={canManageAssignments}
          canViewBookingDetails={canViewBookingDetails}
          events={scheduleEvents}
        />
      </SchedulePageShell>
    </div>
  );
}

/**
 * Renders a clear empty state when there are no matching scheduled activities.
 *
 * @param props - Active schedule filters used to choose operational copy.
 * @returns Staff-facing empty state content for the schedule page.
 */
function ScheduleEmptyState({ filters }: { filters: ScheduleFiltersValue }) {
  const emptyState = getScheduleEmptyStateCopy(filters);

  return (
    <Card className="bg-linear-to-b from-card to-card-glow shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground">
          {emptyState.title}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {emptyState.description}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default SchedulePage;
