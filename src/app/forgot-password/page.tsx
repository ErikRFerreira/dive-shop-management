import AuthShell from '@/components/login/auth-shell';
import ForgotPasswordForm from '@/components/login/forgot-password-form';

/** Renders the static password recovery experience. */
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter your email address and we'll send you instructions when password recovery is available."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
