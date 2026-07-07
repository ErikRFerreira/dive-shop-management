import { Skeleton } from '@/components/ui/skeleton';

/**
 * Renders a results-only loading state for schedule filter transitions.
 *
 * @returns A calendar-shaped skeleton with inline pending feedback.
 */
export function ScheduleResultsPendingSkeleton() {
  return (
    <section aria-busy="true" className="space-y-3">
      <div
        aria-live="polite"
        className="text-sm text-muted-foreground"
        role="status"
      >
        Updating results...
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <Skeleton className="h-7 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
          {Array.from({ length: 35 }).map((_, index) => (
            <div className="min-h-24 bg-card p-2" key={index}>
              <Skeleton className="mb-3 h-3 w-8" />
              {index % 4 === 0 ? (
                <Skeleton className="h-8 rounded-md" />
              ) : null}
              {index % 9 === 0 ? (
                <Skeleton className="mt-2 h-8 rounded-md" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
