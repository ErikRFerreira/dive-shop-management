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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
