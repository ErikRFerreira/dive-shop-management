import Link from 'next/link';
import { Edit, Eye, MoreHorizontal, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  type BookingRowAction,
  getAvailableBookingRowActions,
} from '@/features/bookings/permissions';
import type { BookingListItem } from '@/features/bookings/queries';
import type { CurrentUser } from '@/lib/current-user';

type BookingRowActionsProps = {
  booking: BookingListItem;
  currentUser: Pick<CurrentUser, 'id' | 'role'>;
};

/**
 * Returns the route href for a booking row navigation action.
 *
 * @param action - Navigation action selected for the row.
 * @param bookingId - Booking request ID used in the route.
 * @returns The route href for the selected row action.
 */
function getBookingRowActionHref(action: BookingRowAction, bookingId: string) {
  if (action === 'edit') {
    return `/bookings/${bookingId}/edit`;
  }

  if (action === 'review') {
    return `/bookings/${bookingId}/review`;
  }

  return `/bookings/${bookingId}`;
}

/**
 * Returns the visible label for a booking row navigation action.
 *
 * @param action - Navigation action selected for the row.
 * @returns The staff-facing action label.
 */
function getBookingRowActionLabel(action: BookingRowAction) {
  if (action === 'edit') {
    return 'Edit booking';
  }

  if (action === 'review') {
    return 'Review booking';
  }

  return 'View details';
}

/**
 * Returns the icon for a booking row navigation action.
 *
 * @param action - Navigation action selected for the row.
 * @returns An icon component matching the row action.
 */
function getBookingRowActionIcon(action: BookingRowAction) {
  if (action === 'edit') {
    return Edit;
  }

  if (action === 'review') {
    return ShieldCheck;
  }

  return Eye;
}

/**
 * Renders the role-aware row actions menu for a booking list row.
 *
 * @param props - Booking row and authenticated user used to resolve actions.
 * @returns A compact dropdown menu with available navigation actions.
 */
export function BookingRowActions({
  booking,
  currentUser,
}: BookingRowActionsProps) {
  const actions = getAvailableBookingRowActions(currentUser, booking);

  if (actions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Open actions for booking ${booking.id}`}
          size="icon"
          variant="ghost"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => {
          const Icon = getBookingRowActionIcon(action);

          return (
            <DropdownMenuItem asChild key={action}>
              <Link href={getBookingRowActionHref(action, booking.id)}>
                <Icon className="h-4 w-4" />
                {getBookingRowActionLabel(action)}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
