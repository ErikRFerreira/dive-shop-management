import type { DashboardRecentActivityItem as DashboardRecentActivityItemData } from '@/features/dashboard/types';
import { EmptyState } from '@/components/common/empty-state';

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
    <section
      aria-label="Recent activity"
      className="border-t border-border px-1 pt-4"
    >
      <p className="mb-2.5 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
        Recent activity
      </p>
      <ul className="flex flex-col gap-2">
        {recentItems.map((item) => (
          <RecentActivityItem item={item} key={item.id} />
        ))}
      </ul>
    </section>
  );
}
