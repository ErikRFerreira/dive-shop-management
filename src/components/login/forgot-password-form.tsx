import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Renders a static password recovery form for future workflow integration.
 *
 * @returns Presentation-only recovery form markup and login navigation.
 */
export default function ForgotPasswordForm() {
  return (
    <form noValidate className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="recovery-email">Email</Label>
        <Input
          id="recovery-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@bluerevival.dive"
          className="h-10"
        />
      </div>

      <Button
        type="button"
        className="mt-1 h-10 w-full shadow-sm shadow-primary/20"
      >
        <Send className="size-4" aria-hidden />
        Send reset instructions
      </Button>

      <Button asChild variant="ghost" className="h-10 w-full">
        <Link href="/login">
          <ArrowLeft className="size-4" aria-hidden />
          Back to sign in
        </Link>
      </Button>
    </form>
  );
}
