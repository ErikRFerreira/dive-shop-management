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
  BookingSort,
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
  selectedSort: BookingSort;
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
  selectedSort,
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
      <Card className="overflow-visible rounded-none border-0 bg-transparent py-0 shadow-none xl:overflow-hidden xl:rounded-2xl xl:border xl:border-border xl:bg-linear-to-b xl:from-card xl:to-card-glow xl:shadow-sm">
        <CardContent className="p-0">
          <Table className="block w-full xl:table xl:table-fixed">
            <TableHeader className="hidden xl:table-header-group">
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
            <TableBody className="block space-y-3 [&_tr:last-child]:border xl:table-row-group xl:space-y-0 xl:[&_tr:last-child]:border-0">
              {bookings.map((booking) => (
                <TableRow
                  key={booking.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 rounded-2xl border border-border bg-linear-to-b from-card to-card-glow p-4 shadow-sm xl:table-row xl:rounded-none xl:border-x-0 xl:border-t-0 xl:border-b xl:bg-none xl:p-0 xl:shadow-none"
                >
                  <TableCell className="col-start-1 row-start-1 p-0 align-middle xl:table-cell xl:py-5 xl:pr-2 xl:pl-6 xl:align-top">
                    <BookingStatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell className="col-span-2 mt-4 whitespace-normal wrap-break-word border-t border-border/70 p-0 pt-4 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5 xl:pr-2">
                    <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 xl:hidden">
                      Booking
                    </span>
                    {renderBookingSummary(booking)}
                  </TableCell>
                  <TableCell className="col-span-2 mt-4 whitespace-normal wrap-break-word border-t border-border/70 p-0 pt-4 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5 xl:pr-2">
                    <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 xl:hidden">
                      Activity / Schedule
                    </span>
                    {renderActivitySchedule(booking)}
                  </TableCell>
                  <TableCell className="col-start-1 row-start-4 mt-4 whitespace-normal wrap-break-word border-t border-border/70 p-0 pt-4 pr-2 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5 xl:pr-2">
                    <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 xl:hidden">
                      Staff
                    </span>
                    {renderStaffAssignments(booking)}
                  </TableCell>
                  <TableCell className="col-start-2 row-start-4 mt-4 border-t border-border/70 p-0 pt-4 pl-2 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5 xl:pr-2 xl:pl-0">
                    <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 xl:hidden">
                      Updated
                    </span>
                    {renderCompactUpdatedDate(booking.updatedAt)}
                  </TableCell>
                  <TableCell className="col-start-2 row-start-1 p-0 text-right align-middle xl:table-cell xl:py-5 xl:pr-6 xl:text-center xl:align-top">
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

      <div className="mb-8 flex flex-col items-center gap-3 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
        <p>
          Showing {bookings.length} of {pagination.totalCount} bookings
        </p>
        <div className="w-full sm:w-auto">
          <BookingPagination
            pagination={pagination}
            selectedQueue={selectedQueue}
            selectedSort={selectedSort}
            selectedStatus={selectedStatus}
          />
        </div>
      </div>
    </div>
  );
}
