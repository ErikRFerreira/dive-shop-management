type AssignmentSectionHeaderProps = {
  count: number;
  title: string;
};

/**
 * Renders a section title and assignment count.
 *
 * @param props - Section title and count to display.
 * @returns A compact section header with uppercase title and inline count badge.
 */
export function AssignmentSectionHeader({
  count,
  title,
}: AssignmentSectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {count}
      </span>
    </div>
  );
}
