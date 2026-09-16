import { PageHeaderSkeleton } from '@/components/common/dashboard-loading-skeletons';
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
 * Renders a staff-table-shaped loading state for filter transitions.
 *
 * @param props - Optional announcement shown while existing filters remain visible.
 * @returns A six-column staff list skeleton matching the loaded table.
 */
export function StaffUserListPendingSkeleton({
  announce = true,
}: {
  announce?: boolean;
}) {
  return (
    <div aria-busy="true" className="space-y-3">
      {announce ? (
        <p
          aria-live="polite"
          className="text-sm text-muted-foreground"
          role="status"
        >
          Updating staff users...
        </p>
      ) : null}
      <Card className="overflow-visible rounded-none border-0 bg-transparent py-0 shadow-none xl:overflow-hidden xl:rounded-2xl xl:border xl:border-border xl:bg-linear-to-b xl:from-card xl:to-card-glow xl:shadow-sm">
        <CardContent className="p-0">
          <Table
            aria-label="Loading staff users"
            className="block w-full xl:table xl:table-fixed"
          >
            <TableHeader className="hidden xl:table-header-group">
              <TableRow className="border-b bg-muted/40">
                {['Name', 'Email', 'Role', 'Status', 'Updated', 'Actions'].map(
                  (heading) => (
                    <TableHead
                      className="h-12 first:pl-6 last:pr-6 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80"
                      key={heading}
                    >
                      {heading}
                    </TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="block space-y-3 [&_tr:last-child]:border xl:table-row-group xl:space-y-0 xl:[&_tr:last-child]:border-0">
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 rounded-2xl border border-border bg-linear-to-b from-card to-card-glow p-4 shadow-sm xl:table-row xl:rounded-none xl:border-x-0 xl:border-t-0 xl:border-b xl:bg-none xl:p-0 xl:shadow-none"
                  key={index}
                >
                  <TableCell className="col-start-1 row-start-1 p-0 align-middle xl:table-cell xl:py-5 xl:pl-6 xl:align-top">
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell className="col-span-2 mt-4 border-t border-border/70 p-0 pt-4 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5">
                    <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 xl:hidden">
                      Email
                    </span>
                    <Skeleton className="h-4 w-full max-w-44" />
                  </TableCell>
                  <TableCell className="col-span-2 mt-4 border-t border-border/70 p-0 pt-4 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5">
                    <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 xl:hidden">
                      Role
                    </span>
                    <Skeleton className="h-6 w-28 rounded-full" />
                  </TableCell>
                  <TableCell className="col-span-2 mt-4 border-t border-border/70 p-0 pt-4 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5">
                    <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 xl:hidden">
                      Status
                    </span>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell className="col-span-2 mt-4 border-t border-border/70 p-0 pt-4 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5 xl:pr-6">
                    <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 xl:hidden">
                      Updated
                    </span>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="col-start-2 row-start-1 p-0 align-middle xl:table-cell xl:py-5 xl:pr-6 xl:align-top">
                    <Skeleton className="ml-auto h-8 w-24" />
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

/**
 * Renders the complete Settings route loading layout.
 *
 * @returns Header, Staff Users section, filters, and table placeholders.
 */
export function StaffUsersLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton action />
      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-3 shadow-sm sm:p-5">
          <div className="flex flex-col items-stretch gap-3 md:flex-row md:flex-wrap md:items-end">
            <div className="grid w-full gap-1 md:min-w-64 md:flex-1">
              <Skeleton className="h-3 w-12" />
              <div className="flex flex-col gap-2 md:flex-row">
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-full rounded-lg md:w-24" />
              </div>
            </div>
            <div className="grid w-full gap-1 md:w-44">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
            <div className="grid w-full gap-1 md:w-36">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
        </div>
        <StaffUserListPendingSkeleton announce={false} />
      </section>
    </div>
  );
}
