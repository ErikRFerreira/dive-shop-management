import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type EmptyStateProps = {
  title: string;
  description: string;
};

/**
 * Renders a compact reusable empty state card.
 *
 * @param props - Empty-state title and supporting description.
 * @returns A card-shaped empty state.
 */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card className="flex h-full flex-col rounded-2xl border border-border bg-linear-to-b from-card to-card-glow shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription className="mt-0.5 text-sm">
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
