import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Renders a bookings-table-shaped loading state for URL-backed filter changes.
 *
 * @returns A results-only loading surface that preserves the current table columns.
 */
export function BookingListPendingSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <div
        aria-live="polite"
        className="text-sm text-muted-foreground"
        role="status"
      >
        Updating results...
      </div>
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
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow
                  key={index}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 rounded-2xl border border-border bg-linear-to-b from-card to-card-glow p-4 shadow-sm xl:table-row xl:rounded-none xl:border-x-0 xl:border-t-0 xl:border-b xl:bg-none xl:p-0 xl:shadow-none"
                >
                  <TableCell className="col-start-1 row-start-1 p-0 align-middle xl:table-cell xl:py-5 xl:pr-2 xl:pl-6 xl:align-top">
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </TableCell>
                  <TableCell className="col-span-2 mt-4 border-t border-border/70 p-0 pt-4 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5 xl:pr-2">
                    <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 xl:hidden">
                      Booking
                    </span>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </TableCell>
                  <TableCell className="col-span-2 mt-4 border-t border-border/70 p-0 pt-4 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5 xl:pr-2">
                    <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 xl:hidden">
                      Activity / Schedule
                    </span>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </TableCell>
                  <TableCell className="col-start-1 row-start-4 mt-4 border-t border-border/70 p-0 pt-4 pr-2 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5 xl:pr-2">
                    <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 xl:hidden">
                      Staff
                    </span>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </TableCell>
                  <TableCell className="col-start-2 row-start-4 mt-4 border-t border-border/70 p-0 pt-4 pl-2 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5 xl:pr-2 xl:pl-0">
                    <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 xl:hidden">
                      Updated
                    </span>
                    <Skeleton className="h-4 w-14" />
                  </TableCell>
                  <TableCell className="col-start-2 row-start-1 p-0 align-middle xl:table-cell xl:py-5 xl:pr-6 xl:align-top">
                    <Skeleton className="ml-auto h-8 w-8 rounded-lg" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
