import Link from 'next/link';

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
    <Card className="flex h-full flex-col rounded-2xl border border-border bg-linear-to-b from-card to-card-glow shadow-sm">
      <CardHeader className="border-b border-border px-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">
            Today&apos;s schedule
          </CardTitle>
          <Link
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            href="/schedule?range=today"
          >
            Open schedule
          </Link>
        </div>
        <CardDescription className="mt-0.5 text-sm">
          Official scheduled activities for today.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-2">
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
