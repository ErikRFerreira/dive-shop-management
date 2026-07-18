import { Skeleton } from '@/components/ui/skeleton';

/**
 * Renders the shared page heading placeholder used by dashboard loading routes.
 *
 * @param props - Optional action flag for pages with a header button.
 * @returns Skeleton title, description, and optional header action placeholder.
 */
export function PageHeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {action ? <Skeleton className="h-8 w-36" /> : null}
    </div>
  );
}

/**
 * Renders compact filter controls for list and calendar loading states.
 *
 * @returns A row of pill and input skeletons that preserves filter layout.
 */
export function FilterBarSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-40 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Renders repeated table-like rows for loading list pages.
 *
 * @param props - Number of rows to render.
 * @returns A bordered list placeholder with stable row heights.
 */
export function TableRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="grid grid-cols-4 gap-4 border-b border-border px-4 py-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24 justify-self-end" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.5fr)_1fr_8rem_7rem]"
            key={index}
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 justify-self-start sm:justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders one form section placeholder with fields matching booking intake cards.
 *
 * @returns A section card skeleton with heading and form field rows.
 */
export function FormSectionSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-5 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-24 rounded-lg sm:col-span-2" />
      </div>
    </section>
  );
}

/**
 * Renders the sticky side panel placeholder used by form and review pages.
 *
 * @returns A rail card skeleton that preserves the two-column page layout.
 */
export function StickyRailSkeleton() {
  return (
    <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="space-y-2 border-b border-border pb-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
      <div className="space-y-3 pt-4">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-9 rounded-lg" />
        <Skeleton className="h-9 rounded-lg" />
      </div>
    </aside>
  );
}

/**
 * Renders a booking form loading layout with intake sections and readiness rail.
 *
 * @returns Skeleton layout matching the new and edit booking form structure.
 */
export function BookingFormLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <FormSectionSkeleton />
          <FormSectionSkeleton />
          <FormSectionSkeleton />
        </div>
        <StickyRailSkeleton />
      </div>
    </div>
  );
}

/**
 * Renders a booking list loading layout with filters and rows.
 *
 * @returns Skeleton layout matching the bookings queue page.
 */
export function BookingListLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton action />
      <FilterBarSkeleton />
      <TableRowsSkeleton />
    </div>
  );
}

/**
 * Renders booking detail or review loading structure with a right rail.
 *
 * @returns Skeleton layout matching booking detail and review pages.
 */
export function BookingDetailLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton action />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <Skeleton className="mb-4 h-6 w-52" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-24 rounded-xl sm:col-span-2" />
            </div>
          </section>
          <FormSectionSkeleton />
          <FormSectionSkeleton />
        </div>
        <StickyRailSkeleton />
      </div>
    </div>
  );
}

/**
 * Renders the schedule page loading layout with filters and calendar surface.
 *
 * @returns Skeleton layout matching the schedule calendar route.
 */
export function ScheduleLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Skeleton className="h-7 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
          {Array.from({ length: 35 }).map((_, index) => (
            <div className="min-h-24 bg-card p-2" key={index}>
              <Skeleton className="mb-3 h-3 w-8" />
              {index % 3 === 0 ? <Skeleton className="h-8 rounded-md" /> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Renders the customer search page loading layout with search and result rows.
 *
 * @returns Skeleton layout matching the customers route.
 */
export function CustomersLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="rounded-2xl border border-border bg-card/60 p-3 shadow-sm">
        <div className="flex max-w-2xl flex-wrap gap-2">
          <Skeleton className="h-9 min-w-64 flex-1 rounded-2xl" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <TableRowsSkeleton rows={5} />
    </div>
  );
}

/**
 * Renders the customer detail loading layout with profile cards and history.
 *
 * @returns Skeleton layout matching the customer detail route.
 */
export function CustomerDetailLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <Skeleton className="mb-3 h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <FormSectionSkeleton />
        <FormSectionSkeleton />
      </div>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <Skeleton className="mb-4 h-5 w-40" />
        <TableRowsSkeleton rows={4} />
      </section>
    </div>
  );
}

/**
 * Renders the operational dashboard structure while role-scoped data loads.
 *
 * @returns A non-interactive skeleton matching dashboard cards and sections.
 */
export function DashboardLoadingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading dashboard"
      className="space-y-5"
      role="status"
    >
      <PageHeaderSkeleton action />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <section
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            key={index}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-14" />
              </div>
              <Skeleton className="size-9 rounded-xl" />
            </div>
            <Skeleton className="mt-4 h-3 w-full" />
          </section>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, sectionIndex) => (
          <section
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            key={sectionIndex}
          >
            <div className="space-y-2 border-b border-border p-5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <div className="space-y-3 p-3">
              {Array.from({ length: 3 }).map((_, rowIndex) => (
                <div
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                  key={rowIndex}
                >
                  <Skeleton className="size-9 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="border-t border-border px-1 pt-4">
        <Skeleton className="mb-3 h-3 w-28" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton className="h-12 rounded-xl" key={index} />
          ))}
        </div>
      </section>
    </div>
  );
}
