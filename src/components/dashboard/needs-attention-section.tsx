import Link from 'next/link';

import type { DashboardNeedsAttentionItem as DashboardNeedsAttentionItemData } from '@/features/dashboard/types';
import { EmptyState } from '@/components/common/empty-state';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type { DashboardSectionUser } from './dashboard-operational-helpers';
import { NeedsAttentionItem } from './needs-attention-item';

type NeedsAttentionSectionProps = {
  items: DashboardNeedsAttentionItemData[];
  currentUser: DashboardSectionUser;
};

/**
 * Renders booking and schedule rows that need operational attention.
 *
 * @param props - Role-scoped attention rows and current user details.
 * @returns A dashboard card containing attention items or an empty state.
 */
export function NeedsAttentionSection({
  items,
  currentUser,
}: NeedsAttentionSectionProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing needs attention"
        description="Bookings and scheduled activities that need action will appear here."
      />
    );
  }

  return (
    <Card className="flex h-full flex-col rounded-2xl border border-border bg-linear-to-b from-card to-card-glow shadow-sm">
      <CardHeader className="border-b border-border px-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">
            Needs attention
          </CardTitle>
          <Link
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            href="/bookings"
          >
            View all
          </Link>
        </div>
        <CardDescription className="mt-0.5 text-sm">
          Bookings and scheduled activities that need admin action.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-2">
        {items.map((item) => (
          <NeedsAttentionItem
            currentUser={currentUser}
            item={item}
            key={item.id}
          />
        ))}
      </CardContent>
    </Card>
  );
}
