import { cn } from '@/lib/utils';

type TextFieldEmptyStateProps = {
  message: string;
  className?: string;
};

/**
 * Renders an empty state for large text fields like notes or messages.
 *
 * Used inside cards or form fields to indicate no content is present.
 *
 * @param props - Empty state message and optional className.
 * @returns Centered italic empty state message.
 */
export function TextFieldEmptyState({
  message,
  className,
}: TextFieldEmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center',
        className,
      )}
    >
      <p className="text-sm italic text-muted-foreground">{message}</p>
    </div>
  );
}
