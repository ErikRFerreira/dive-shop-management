import type { AdminDashboardSummary as AdminDashboardSummaryData } from '@/features/dashboard/types';
import { StatCard } from '@/components/common/stat-card';

type AdminDashboardSummaryProps = {
  summary: AdminDashboardSummaryData;
};

/**
 * Renders the Admin and Manager dashboard summary cards.
 *
 * @param props - The already-authorized global dashboard summary data.
 * @returns Global operational cards for booking review and schedule coverage.
 */
export function AdminDashboardSummary({
  summary,
}: AdminDashboardSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <StatCard
        title="Pending Approval"
        value={summary.pendingApprovalCount}
        href="/bookings?status=PENDING_APPROVAL"
        description="Bookings waiting for review."
      />
      <StatCard
        title="Needs More Info"
        value={summary.needsMoreInfoCount}
        href="/bookings?status=NEEDS_MORE_INFO"
        description="Bookings sent back for details."
      />
      <StatCard
        title="Today's Schedule"
        value={summary.todayScheduleCount}
        href="/schedule?range=today"
        description="Scheduled activities today."
      />
      <StatCard
        title="Tomorrow's Schedule"
        value={summary.tomorrowScheduleCount}
        href="/schedule?range=tomorrow"
        description="Scheduled activities tomorrow."
      />
      <StatCard
        title="Unassigned Activities"
        value={summary.unassignedActivitiesCount}
        href="/bookings?queue=unassigned"
        description="Scheduled activities without staff."
      />
    </div>
  );
}
