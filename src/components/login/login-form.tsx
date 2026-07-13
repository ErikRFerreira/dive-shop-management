'use client';

import { Eye, EyeOff, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Prevents the presentation-only login form from navigating or reloading.
 *
 * @param event - The browser form submission event.
 */
function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
}

/**
 * Renders the presentation-only login form with password visibility controls.
 *
 * @returns The login form markup without authentication or validation behavior.
 */
export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@bluerevival.dive"
          className="h-10"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
            className="h-10 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((previous) => !previous)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Checkbox id="remember" name="remember" />
          <Label
            htmlFor="remember"
            className="cursor-pointer font-normal text-muted-foreground"
          >
            Remember me
          </Label>
        </div>
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        className="mt-1 h-10 w-full shadow-sm shadow-primary/20"
      >
        <LogIn className="size-4" aria-hidden />
        Sign in
      </Button>

      <Button
        asChild
        className="mt-0 h-10 w-full shadow-sm shadow-primary/20"
        variant="outline"
      >
        <Link href="/dashboard">Try Dashboard</Link>
      </Button>
    </form>
  );
}
