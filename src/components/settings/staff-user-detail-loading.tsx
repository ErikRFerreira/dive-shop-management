import { PageHeaderSkeleton } from '@/components/common/dashboard-loading-skeletons';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Renders a non-interactive skeleton matching the Staff User Details layout.
 *
 * @returns Header, account-detail, and platform-access placeholders.
 */
export function StaffUserDetailLoadingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading staff user details"
      className="space-y-6"
      role="status"
    >
      <PageHeaderSkeleton />
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="space-y-2 border-b">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="space-y-2" key={index}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="space-y-2 border-b">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-12 rounded-xl" key={index} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
