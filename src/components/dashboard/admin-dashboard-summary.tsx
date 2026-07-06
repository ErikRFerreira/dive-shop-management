import type { AdminDashboardSummary as AdminDashboardSummaryData } from '@/features/dashboard/types';
import { StatCard } from '@/components/common/stat-card';
import {
  ClipboardCheck,
  HelpCircle,
  CalendarClock,
  CalendarDays,
  UserCog,
} from 'lucide-react';

type AdminDashboardSummaryProps = {
  summary: AdminDashboardSummaryData;
};

/**
 * Renders the Admin and Manager dashboard summary cards.
 *
 * @param props - The already-authorized global dashboard summary data.
 * @returns Global operational cards for booking review and schedule coverage.
 */
export function AdminDashboardSummary({ summary }: AdminDashboardSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <StatCard
        icon={<ClipboardCheck />}
        title="Pending Approval"
        value={summary.pendingApprovalCount}
        href="/bookings?status=PENDING_APPROVAL"
        description="Bookings waiting for review."
        tone="pending"
      />
      <StatCard
        icon={<HelpCircle />}
        title="Needs More Info"
        value={summary.needsMoreInfoCount}
        href="/bookings?status=NEEDS_MORE_INFO"
        description="Bookings sent back for details."
        tone="info"
      />
      <StatCard
        icon={<CalendarClock />}
        title="Today's Schedule"
        value={summary.todayScheduleCount}
        href="/schedule?range=today"
        description="Scheduled activities today."
        tone="scheduled"
      />
      <StatCard
        icon={<CalendarDays />}
        title="Tomorrow's Schedule"
        value={summary.tomorrowScheduleCount}
        href="/schedule?range=tomorrow"
        description="Scheduled activities tomorrow."
        tone="ocean"
      />
      <StatCard
        icon={<UserCog />}
        title="Unassigned Activities"
        value={summary.unassignedActivitiesCount}
        href="/schedule?unassignedOnly=true"
        description="Scheduled activities without staff."
        tone="unassigned"
      />
    </div>
  );
}
