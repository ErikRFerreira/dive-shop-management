import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  BookingListPagination,
  BookingListItem,
  BookingQueueFilter,
  BookingStatusFilter,
} from '@/features/bookings/queries';
import type { CurrentUser } from '@/lib/current-user';
import {
  renderActivitySchedule,
  renderBookingSummary,
  renderCompactUpdatedDate,
  renderStaffAssignments,
} from './booking-list-display';
import { BookingPagination } from './booking-pagination';
import { BookingRowActions } from './booking-row-actions';

type BookingListProps = {
  bookings: BookingListItem[];
  currentUser: Pick<CurrentUser, 'id' | 'role'>;
  pagination: BookingListPagination;
  selectedQueue?: BookingQueueFilter;
  selectedStatus?: BookingStatusFilter;
};

/**
 * Renders booking requests in the staff-facing list table.
 *
 * @param props - Booking rows, pagination metadata, and current user used to resolve row actions.
 * @returns Booking list table or an empty-state card.
 */
export function BookingList({
  bookings,
  currentUser,
  pagination,
  selectedQueue,
  selectedStatus,
}: BookingListProps) {
  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No bookings found</CardTitle>
          <CardDescription>
            There are no booking requests matching this view.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card to-card-glow shadow-sm py-0">
        <CardContent className="p-0">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="border-b bg-muted/40">
                <TableHead className="h-12 w-[14%] pl-6 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Status
                </TableHead>
                <TableHead className="h-12 w-[20%] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Booking
                </TableHead>
                <TableHead className="h-12 w-[30%] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Activity / Schedule
                </TableHead>
                <TableHead className="h-12 w-[20%] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Staff
                </TableHead>
                <TableHead className="h-12 w-[10%] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Updated
                </TableHead>
                <TableHead className="h-12 w-[10%] pr-6 text-right text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id} className="border-b last:border-b-0">
                  <TableCell className="py-5 pl-6 align-top">
                    <BookingStatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell className="whitespace-normal break-words py-5 align-top">
                    {renderBookingSummary(booking)}
                  </TableCell>
                  <TableCell className="whitespace-normal break-words py-5 align-top">
                    {renderActivitySchedule(booking)}
                  </TableCell>
                  <TableCell className="whitespace-normal break-words py-5 align-top">
                    {renderStaffAssignments(booking)}
                  </TableCell>
                  <TableCell className="py-5 align-top">
                    {renderCompactUpdatedDate(booking.updatedAt)}
                  </TableCell>
                  <TableCell className="py-5 pr-6 text-center align-top">
                    <BookingRowActions
                      booking={booking}
                      currentUser={currentUser}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground mb-8">
        <p>
          Showing {bookings.length} of {pagination.totalCount} bookings
        </p>
        <div>
          <BookingPagination
            pagination={pagination}
            selectedQueue={selectedQueue}
            selectedStatus={selectedStatus}
          />
        </div>
      </div>
    </div>
  );
}
