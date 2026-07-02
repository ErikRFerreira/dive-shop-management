import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type StatCardProps = {
  title: string;
  value: number;
  href: string;
  description: string;
};

/**
 * Renders a linked metric card for app-level summary views.
 *
 * @param props - The title, count, destination, and supporting copy to display.
 * @returns A single reusable stat card.
 */
export function StatCard({ title, value, href, description }: StatCardProps) {
  return (
    <Link href={href} className="block h-full">
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tabular-nums">{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
