import type { DashboardRecentActivityItem as DashboardRecentActivityItemData } from '@/features/dashboard/types';
import { EmptyState } from '@/components/common/empty-state';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { RecentActivityItem } from './recent-activity-item';

type RecentActivitySectionProps = {
  items: DashboardRecentActivityItemData[];
};

const RECENT_ACTIVITY_DISPLAY_LIMIT = 3;

/**
 * Renders recent dashboard activity as a short read-only list.
 *
 * @param props - Recent activity rows already scoped by the query layer.
 * @returns A dashboard card with recent activity rows or an empty state.
 */
export function RecentActivitySection({ items }: RecentActivitySectionProps) {
  const recentItems = items.slice(0, RECENT_ACTIVITY_DISPLAY_LIMIT);

  if (recentItems.length === 0) {
    return (
      <EmptyState
        title="No recent activity yet"
        description="Recent booking and schedule updates will appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          Latest booking and schedule updates from your workflow.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {recentItems.map((item) => (
          <RecentActivityItem item={item} key={item.id} />
        ))}
      </CardContent>
    </Card>
  );
}
