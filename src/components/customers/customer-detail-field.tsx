const EMPTY_VALUE = '\u2014';

/**
 * Renders a labeled value for customer detail cards.
 *
 * @param props - Label and nullable display value.
 * @returns A compact field with a consistent empty-state placeholder.
 */
export function CustomerDetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  const displayValue =
    value === null || value === undefined || value === '' ? EMPTY_VALUE : value;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 wrap-break-word text-sm">{displayValue}</div>
    </div>
  );
}
