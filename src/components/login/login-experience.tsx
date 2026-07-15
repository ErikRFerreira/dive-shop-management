'use client';

import { useState } from 'react';

import FooterDemo from '@/components/login/footer-demo';
import LoginForm from '@/components/login/login-form';

type LoginExperienceProps = {
  redirectTo?: string | null;
  demoPassword?: string;
};

/**
 * Coordinates the login fields and optional local-development account picker.
 *
 * The demo password is intentionally accepted only as an optional prop so the
 * server page can omit all demo functionality outside development.
 *
 * @param props - Redirect destination and optional development-only password.
 * @returns The controlled login form and, in development, demo account buttons.
 */
export default function LoginExperience({
  redirectTo,
  demoPassword,
}: LoginExperienceProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  /**
   * Fills the form with a seeded account used only during local development.
   *
   * @param selectedEmail - Email belonging to the selected seeded user.
   */
  function handleDemoAccountSelect(selectedEmail: string) {
    setEmail(selectedEmail);
    setPassword(demoPassword ?? '');
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

      {/* DEVELOPMENT ONLY: never expose seeded account helpers in production. */}
      {demoPassword ? (
        <FooterDemo onAccountSelect={handleDemoAccountSelect} />
      ) : null}
    </>
  );
}
