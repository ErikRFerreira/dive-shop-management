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
    <Card>
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
        <CardDescription>
          Booking requests and scheduled activities that need follow-up.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
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
