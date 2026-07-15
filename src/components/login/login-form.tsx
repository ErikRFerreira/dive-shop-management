'use client';

import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useActionState, useState } from 'react';

import { PendingButton } from '@/components/common/pending-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  loginWithCredentials,
  type LoginActionState,
} from '@/features/auth/actions';

const initialLoginActionState: LoginActionState = {};

type LoginFormProps = {
  redirectTo?: string | null;
  email: string;
  password: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
};

/**
 * Renders the login form connected to the credentials authentication action.
 *
 * @param props - Controlled credentials and optional prevalidated destination.
 * @returns The existing login UI with validation, pending, and error states.
 */
export default function LoginForm({
  redirectTo,
  email,
  password,
  onEmailChange,
  onPasswordChange,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(
    loginWithCredentials,
    initialLoginActionState,
  );
  const emailError = state.fieldErrors?.email?.[0];
  const passwordError = state.fieldErrors?.password?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {redirectTo ? (
        <input name="callbackUrl" type="hidden" value={redirectTo} />
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          aria-describedby={emailError ? 'email-error' : undefined}
          aria-invalid={Boolean(emailError)}
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          autoComplete="email"
          placeholder="you@bluerevival.dive"
          required
          className="h-10"
        />
        {emailError ? (
          <p className="text-sm text-destructive" id="email-error">
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            aria-describedby={passwordError ? 'password-error' : undefined}
            aria-invalid={Boolean(passwordError)}
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
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
        {passwordError ? (
          <p className="text-sm text-destructive" id="password-error">
            {passwordError}
          </p>
        ) : null}
      </div>

      {state.formError ? (
        <p
          aria-live="polite"
          className="-mt-2.5 text-sm font-medium text-destructive"
          role="alert"
        >
          {state.formError}
        </p>
      ) : null}

      <PendingButton
        pending={pending}
        pendingLabel={
          <>
            <Spinner aria-hidden />
            Signing in...
          </>
        }
        type="submit"
        className="mt-1 h-10 w-full shadow-sm shadow-primary/20"
      >
        <LogIn className="size-4" aria-hidden />
        Sign in
      </PendingButton>
    </form>
  );
}
