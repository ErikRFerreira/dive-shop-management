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
 * @returns A five-column staff list skeleton matching the loaded table.
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
      <Card className="overflow-hidden rounded-2xl border border-border bg-linear-to-b from-card to-card-glow py-0 shadow-sm">
        <CardContent className="p-0">
          <Table aria-label="Loading staff users" className="table-fixed">
            <TableHeader>
              <TableRow className="border-b bg-muted/40">
                {['Name', 'Email', 'Role', 'Status', 'Updated'].map(
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
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow className="border-b last:border-b-0" key={index}>
                  <TableCell className="py-5 pl-6">
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell className="py-5">
                    <Skeleton className="h-4 w-44" />
                  </TableCell>
                  <TableCell className="py-5">
                    <Skeleton className="h-6 w-28 rounded-full" />
                  </TableCell>
                  <TableCell className="py-5">
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell className="py-5 pr-6">
                    <Skeleton className="h-4 w-24" />
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
          <div className="flex flex-wrap items-end gap-3">
            <Skeleton className="h-9 min-w-64 flex-1 rounded-lg" />
            <Skeleton className="h-9 w-44 rounded-lg" />
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>
        </div>
        <StaffUserListPendingSkeleton announce={false} />
      </section>
    </div>
  );
}
