'use client';

import { useState } from 'react';

import FooterDemo from '@/components/login/footer-demo';
import LoginForm from '@/components/login/login-form';

type LoginExperienceProps = {
  redirectTo?: string | null;
  showDevelopmentAccountSelector?: boolean;
};

/**
 * Coordinates the login fields and optional local-development account picker.
 *
 * @param props - Redirect destination and server-resolved selector visibility.
 * @returns The controlled login form and optional demo account buttons.
 */
export default function LoginExperience({
  redirectTo,
  showDevelopmentAccountSelector = false,
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

      {/* LOCAL DEVELOPMENT ONLY: the server resolves this non-sensitive flag. */}
      {showDevelopmentAccountSelector ? (
        <FooterDemo onAccountSelect={handleDemoAccountSelect} />
      ) : null}
    </>
  );
}
