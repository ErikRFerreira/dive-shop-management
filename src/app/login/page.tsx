import LoginForm from '@/components/login/login-form';
import Image from 'next/image';

/** Demo accounts surfaced for an internal tool — muted helper only. */
const demoAccounts = [
  { role: 'Admin', email: 'admin@bluerevival.dive' },
  { role: 'Customer Service', email: 'service@bluerevival.dive' },
  { role: 'Instructor', email: 'instructor@bluerevival.dive' },
];

/** Renders the branded internal login experience. */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen bg-background">
      {/* Left — branded visual panel */}
      <section className="relative hidden w-[45%] max-w-2xl overflow-hidden lg:flex lg:flex-col lg:justify-between">
        {/* Ocean-inspired premium gradient */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 15% 10%, oklch(0.42 0.07 220) 0%, oklch(0.32 0.045 245) 42%, oklch(0.26 0.03 252) 100%)',
          }}
        />
        {/* Soft cyan glow accents */}
        <div
          aria-hidden
          className="absolute -left-24 top-1/3 size-96 rounded-full opacity-40 blur-3xl"
          style={{ background: 'oklch(0.7 0.12 205 / 35%)' }}
        />
        <div
          aria-hidden
          className="absolute bottom-0 right-0 size-80 translate-x-1/4 translate-y-1/4 rounded-full opacity-30 blur-3xl"
          style={{ background: 'oklch(0.62 0.1 190 / 30%)' }}
        />

        {/* Brand lockup */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 text-center text-white">
          <Image
            src="/icon.png"
            alt=""
            width={128}
            height={128}
            className="size-32 object-contain"
            priority
          />
          <h1 className="mt-0 font-heading text-3xl font-semibold tracking-tight">
            Blue Revival
          </h1>
          <p className="mt-1.5 text-sm font-medium tracking-[0.18em] text-white/65 uppercase">
            Dive Ops
          </p>
        </div>
      </section>

      {/* Right — auth form panel */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
        {/* Mobile brand (left panel hidden) */}

        <div className="w-full max-w-sm">
          <header className="mb-8">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground text-balance">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to access Blue Revival Dive Ops.
            </p>
          </header>

          <LoginForm />

          {/* Demo accounts helper */}
          <div className="mt-8 rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
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
        </div>
      </section>
    </main>
  );
}
