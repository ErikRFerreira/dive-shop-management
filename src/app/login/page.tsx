import AuthShell from '@/components/login/auth-shell';
import LoginForm from '@/components/login/login-form';

/** Demo accounts surfaced for an internal tool as muted helper content. */
const demoAccounts = [
  { role: 'Admin', email: 'admin@bluerevival.dive' },
  { role: 'Customer Service', email: 'service@bluerevival.dive' },
  { role: 'Instructor', email: 'instructor@bluerevival.dive' },
];

/** Renders the branded internal login experience. */
export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to access Blue Revival Dive Ops."
      footer={
        <div className="mt-8 rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
            Demo accounts
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {demoAccounts.map((account) => (
              <li
                key={account.role}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="font-medium text-foreground">
                  {account.role}
                </span>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {account.email}
                </span>
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
