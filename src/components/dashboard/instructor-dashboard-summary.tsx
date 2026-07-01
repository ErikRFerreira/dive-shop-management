import type { InstructorDashboardSummary as InstructorDashboardSummaryData } from '@/features/dashboard/queries';

import { DashboardSummaryCard } from './dashboard-summary-card';

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
      <DashboardSummaryCard
        title="Today's Assignments"
        value={summary.todayAssignmentsCount}
        href="/assignments"
        description="Assigned scheduled activities today."
      />
      <DashboardSummaryCard
        title="Tomorrow's Assignments"
        value={summary.tomorrowAssignmentsCount}
        href="/assignments"
        description="Assigned scheduled activities tomorrow."
      />
      <DashboardSummaryCard
        title="My Assignments"
        value={summary.myAssignmentsCount}
        href="/assignments"
        description="All scheduled activities assigned to you."
      />
    </div>
  );
}
