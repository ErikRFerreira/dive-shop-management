'use client';

import { useState } from 'react';

import FooterDemo from '@/components/login/footer-demo';
import LoginForm from '@/components/login/login-form';

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

  /**
   * Selects a seeded email while requiring the password to be entered manually.
   *
   * @param selectedEmail - Email belonging to the selected seeded user.
   */
  function handleDemoAccountSelect(selectedEmail: string) {
    setEmail(selectedEmail);
    setPassword('');
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
        <FooterDemo onAccountSelect={handleDemoAccountSelect} />
      ) : null}
    </>
  );
}
