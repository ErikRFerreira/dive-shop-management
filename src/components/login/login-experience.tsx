'use client';

import { useState, useTransition } from 'react';

import FooterDemo from '@/components/login/footer-demo';
import LoginForm from '@/components/login/login-form';
import { loginWithDemoAccount } from '@/features/auth/actions';

type LoginExperienceProps = {
  redirectTo?: string | null;
  showDemoAccountSelector?: boolean;
};

/**
 * Coordinates the login fields and optional seeded demo account picker.
 *
 * @param props - Redirect destination and server-resolved selector visibility.
 * @returns The controlled login form and optional demo account buttons.
 */
export default function LoginExperience({
  redirectTo,
  showDemoAccountSelector = false,
}: LoginExperienceProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [demoLoginError, setDemoLoginError] = useState<string>();
  const [demoLoginPending, startDemoLoginTransition] = useTransition();

  /**
   * Selects a seeded email and requests server-side demo authentication.
   *
   * @param selectedEmail - Email belonging to the selected seeded user.
   */
  function handleDemoAccountSelect(selectedEmail: string) {
    setEmail(selectedEmail);
    setPassword('');
    setDemoLoginError(undefined);

    startDemoLoginTransition(async () => {
      const result = await loginWithDemoAccount(selectedEmail, redirectTo);
      setDemoLoginError(result.formError);
    });
  }

  return (
    <>
      <LoginForm
        redirectTo={redirectTo}
        email={email}
        password={password}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
      />

      {/* The server resolves this non-sensitive flag from the selected schema. */}
      {showDemoAccountSelector ? (
        <FooterDemo
          error={demoLoginError}
          pending={demoLoginPending}
          onAccountSelect={handleDemoAccountSelect}
        />
      ) : null}
    </>
  );
}
