type AssignmentSectionHeaderProps = {
  count: number;
  title: string;
};

/**
 * Renders a section title and assignment count.
 *
 * @param props - Section title and count to display.
 * @returns A compact section header.
 */
export function AssignmentSectionHeader({
  count,
  title,
}: AssignmentSectionHeaderProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">
        {count === 1 ? '1 assigned activity' : `${count} assigned activities`}
      </p>
    </div>
  );
}
