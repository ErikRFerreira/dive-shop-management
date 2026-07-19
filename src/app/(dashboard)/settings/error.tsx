'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type SettingsErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

/**
 * Renders a safe route-level recovery state for unexpected Settings failures.
 *
 * The original server error is intentionally not rendered, preventing database
 * messages and stack details from reaching the staff-facing interface.
 *
 * @param props - Next.js retry callback and intentionally undisplayed error.
 * @returns Generic Settings error copy with a retry action.
 */
export default function SettingsError({
  unstable_retry,
}: SettingsErrorProps) {
  return (
    <Card className="rounded-2xl border border-border bg-linear-to-b from-card to-card-glow shadow-sm">
      <CardHeader>
        <CardTitle>Unable to load staff users.</CardTitle>
        <CardDescription>
          Something went wrong while loading Staff Management. Try again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={unstable_retry} type="button">
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
