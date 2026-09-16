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
        <div className="mb-4 flex flex-col gap-3 min-[721px]:flex-row min-[721px]:items-center min-[721px]:justify-between">
          <div className="flex w-full items-center justify-between gap-2 min-[721px]:w-auto">
            <div className="flex gap-1">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="size-9 rounded-full" />
            </div>
            <Skeleton className="h-9 w-16 rounded-full" />
            <Skeleton className="h-6 w-28" />
          </div>
          <div className="grid w-full grid-cols-4 gap-px overflow-hidden rounded-full border border-border min-[721px]:flex min-[721px]:w-auto">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                className="h-9 w-full rounded-none min-[721px]:w-16"
                key={index}
              />
            ))}
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
