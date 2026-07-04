import type { InstructorDashboardSummary as InstructorDashboardSummaryData } from '@/features/dashboard/types';
import { StatCard } from '@/components/common/stat-card';
import { Calendar1, CalendarCheck, ClipboardCheck } from 'lucide-react';

type InstructorDashboardSummaryProps = {
  summary: InstructorDashboardSummaryData;
};

/**
 * Renders the Instructor dashboard summary cards.
 *
 * @param props - The assignment-scoped dashboard summary data for the user.
 * @returns Personal assignment summary cards for the current instructor.
 */
export function InstructorDashboardSummary({
  summary,
}: InstructorDashboardSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        title="Today's Assignments"
        value={summary.todayAssignmentsCount}
        href="/assignments"
        description="Assigned scheduled activities today."
        tone="scheduled"
        icon={<CalendarCheck />}
      />
      <StatCard
        title="Tomorrow's Assignments"
        value={summary.tomorrowAssignmentsCount}
        href="/assignments"
        description="Assigned scheduled activities tomorrow."
        tone="scheduled"
        icon={<Calendar1 />}
      />
      <StatCard
        title="My Assignments"
        value={summary.myAssignmentsCount}
        href="/assignments"
        description="All scheduled activities assigned to you."
        tone="ocean"
        icon={<ClipboardCheck />}
      />
    </div>
  );
}
