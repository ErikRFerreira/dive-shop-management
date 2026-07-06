import type { DashboardRecentActivityItem as DashboardRecentActivityItemData } from '@/features/dashboard/types';
import { BookingStatus } from '@/generated/prisma/enums';
import { formatRecentActivityTime } from '@/lib/format';
import { cn } from '@/lib/utils';

import { formatPrimaryCustomerName } from './dashboard-operational-helpers';

type RecentActivityItemProps = {
  item: DashboardRecentActivityItemData;
};

type StatusTone = 'pending' | 'info' | 'scheduled' | 'unassigned' | 'ocean';

const dotTone: Record<StatusTone, string> = {
  pending: 'bg-pending',
  info: 'bg-info-alert',
  scheduled: 'bg-scheduled',
  unassigned: 'bg-unassigned',
  ocean: 'bg-ocean',
};

/**
 * Renders one read-only recent activity row.
 *
 * @param props - Activity row to display.
 * @returns A compact activity list item.
 */
export function RecentActivityItem({ item }: RecentActivityItemProps) {
  const tone = getRecentActivityTone(item.status);

  return (
    <li className="flex items-center gap-3 text-[0.8rem] leading-snug">
      <span
        className={cn('size-1.5 shrink-0 rounded-full', dotTone[tone])}
        aria-hidden="true"
      />

      <span className="min-w-0 text-muted-foreground">
        <span className="text-foreground/80">{item.label}</span>
        {' - '}
        {formatPrimaryCustomerName(item.primaryCustomerName)}:{' '}
        {item.activitySummary}
      </span>

      <span className="ml-auto shrink-0 text-xs text-muted-foreground/70">
        {formatRecentActivityTime(item.occurredAt)}
      </span>
    </li>
  );
}

/**
 * Chooses a concise recent-activity tone based on booking status.
 *
 * @param status - Booking status driving the activity entry.
 * @returns A tone key used for the row's status dot color.
 */
function getRecentActivityTone(
  status: DashboardRecentActivityItemData['status'],
) {
  if (status === BookingStatus.PENDING_APPROVAL) {
    return 'pending';
  }

  if (status === BookingStatus.NEEDS_MORE_INFO) {
    return 'info';
  }

  if (status === BookingStatus.SCHEDULED || status === BookingStatus.APPROVED) {
    return 'scheduled';
  }

  return 'ocean';
}
