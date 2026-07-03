import Link from 'next/link';

import type { DashboardNeedsAttentionItem as DashboardNeedsAttentionItemData } from '@/features/dashboard/types';
import { formatDisplayDate } from '@/lib/format';
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { Button } from '@/components/ui/button';

import type { DashboardSectionUser } from './dashboard-operational-helpers';
import {
  formatPrimaryCustomerName,
  getNeedsAttentionAction,
  shouldShowAttentionLabel,
} from './dashboard-operational-helpers';

type NeedsAttentionItemProps = {
  item: DashboardNeedsAttentionItemData;
  currentUser: DashboardSectionUser;
};

/**
 * Renders one dashboard attention row with a role-aware action.
 *
 * @param props - Attention item and user role used to choose the action link.
 * @returns A compact attention list item.
 */
export function NeedsAttentionItem({
  item,
  currentUser,
}: NeedsAttentionItemProps) {
  const action = getNeedsAttentionAction(item, currentUser);

  return (
    <article className="grid gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 md:grid-cols-[1fr_auto] md:items-center md:px-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {item.activitySummary}
          </h3>
          {item.status ? <BookingStatusBadge status={item.status} /> : null}
        </div>

        <p className="text-sm font-medium text-foreground/90">
          {formatPrimaryCustomerName(item.primaryCustomerName)}
        </p>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {shouldShowAttentionLabel(item) ? <span>{item.label}</span> : null}
          {item.date ? <span>{formatDisplayDate(item.date)}</span> : null}
          {item.detail ? <span>{item.detail}</span> : null}
        </div>
      </div>

      {action ? (
        <div className="self-start md:justify-self-end">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="rounded-full px-4"
          >
            <Link href={action.href}>{action.label}</Link>
          </Button>
        </div>
      ) : null}
    </article>
  );
}
