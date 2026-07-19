'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type StaffUserDetailsErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

/**
 * Renders safe recovery UI for unexpected staff-detail failures.
 *
 * The original server error is intentionally excluded so database and
 * authentication details cannot be disclosed through the page.
 *
 * @param props - Next.js retry callback and intentionally undisplayed error.
 * @returns Generic recovery actions for retrying or returning to staff management.
 */
export default function StaffUserDetailsError({
  unstable_retry,
}: StaffUserDetailsErrorProps) {
  return (
    <Card className="rounded-2xl border border-border bg-linear-to-b from-card to-card-glow shadow-sm">
      <CardHeader>
        <CardTitle>Unable to load staff user.</CardTitle>
        <CardDescription>
          Something went wrong while loading this staff record. Try again.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button onClick={unstable_retry} type="button">
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/settings">Back to Staff Management</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
