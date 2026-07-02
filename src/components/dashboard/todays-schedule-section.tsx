import type { DashboardScheduleItem as DashboardScheduleItemData } from '@/features/dashboard/types';
import { EmptyState } from '@/components/common/empty-state';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type { DashboardSectionUser } from './dashboard-operational-helpers';
import { TodaysScheduleItem } from './todays-schedule-item';

type TodaysScheduleSectionProps = {
  items: DashboardScheduleItemData[];
  currentUser: DashboardSectionUser;
};

/**
 * Renders today's official schedule rows for the dashboard user.
 *
 * @param props - Role-scoped schedule rows and current user details.
 * @returns A dashboard card containing today's scheduled activities.
 */
export function TodaysScheduleSection({
  items,
  currentUser,
}: TodaysScheduleSectionProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No scheduled activities today"
        description="Approved bookings scheduled for today will appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s schedule</CardTitle>
        <CardDescription>
          Official scheduled activities for today.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {items.map((item) => (
          <TodaysScheduleItem
            currentUser={currentUser}
            item={item}
            key={item.scheduleItemId}
          />
        ))}
      </CardContent>
    </Card>
  );
}
