import type { DashboardRecentActivityItem as DashboardRecentActivityItemData } from '@/features/dashboard/types';
import { formatDisplayDateTime } from '@/lib/format';
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';

import { formatPrimaryCustomerName } from './dashboard-operational-helpers';

type RecentActivityItemProps = {
  item: DashboardRecentActivityItemData;
};

/**
 * Renders one read-only recent activity row.
 *
 * @param props - Activity row to display.
 * @returns A compact activity list item.
 */
export function RecentActivityItem({ item }: RecentActivityItemProps) {
  return (
    <article className="space-y-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium">{item.label}</h3>
        <BookingStatusBadge status={item.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        {formatPrimaryCustomerName(item.primaryCustomerName)} -{' '}
        {item.activitySummary}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatDisplayDateTime(item.occurredAt)}
      </p>
    </article>
  );
}
