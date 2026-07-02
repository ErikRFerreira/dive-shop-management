import type { CustomerServiceDashboardSummary as CustomerServiceDashboardSummaryData } from '@/features/dashboard/queries';

import { DashboardSummaryCard } from './dashboard-summary-card';

type CustomerServiceDashboardSummaryProps = {
  summary: CustomerServiceDashboardSummaryData;
};

/**
 * Renders the Customer Service dashboard summary cards.
 *
 * @param props - The already-owner-scoped dashboard summary data.
 * @returns Booking workflow cards for the current Customer Service user.
 */
export function CustomerServiceDashboardSummary({
  summary,
}: CustomerServiceDashboardSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DashboardSummaryCard
        title="My Drafts"
        value={summary.myDraftsCount}
        href="/bookings?status=DRAFT"
        description="Bookings saved before submission."
      />
      <DashboardSummaryCard
        title="My Pending Approval"
        value={summary.myPendingApprovalCount}
        href="/bookings?status=PENDING_APPROVAL"
        description="Your bookings waiting for review."
      />
      <DashboardSummaryCard
        title="Needs More Info"
        value={summary.myNeedsMoreInfoCount}
        href="/bookings?status=NEEDS_MORE_INFO"
        description="Your bookings needing updates."
      />
      <DashboardSummaryCard
        title="Approved/Scheduled"
        value={summary.myApprovedScheduledBookingsCount}
        href="/bookings"
        description="Your approved or scheduled bookings."
      />
    </div>
  );
}
