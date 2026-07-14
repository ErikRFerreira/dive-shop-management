import Image from 'next/image';
import type { ReactNode } from 'react';

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Renders the shared responsive Blue Revival authentication layout.
 *
 * @param props - Page heading, supporting copy, form content, and optional footer.
 * @returns The branded two-panel authentication shell.
 */
export default function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen bg-background">
      <section className="relative hidden w-[45%] max-w-2xl overflow-hidden lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 15% 10%, oklch(0.42 0.07 220) 0%, oklch(0.32 0.045 245) 42%, oklch(0.26 0.03 252) 100%)',
          }}
        />
        <div
          aria-hidden
          className="absolute -left-24 top-1/3 size-96 rounded-full opacity-40 blur-3xl"
          style={{ background: 'oklch(0.7 0.12 205 / 35%)' }}
        />
        <div
          aria-hidden
          className="absolute right-0 bottom-0 size-80 translate-x-1/4 translate-y-1/4 rounded-full opacity-30 blur-3xl"
          style={{ background: 'oklch(0.62 0.1 190 / 30%)' }}
        />

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

      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <header className="mb-8">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance text-foreground">
              {title}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {description}
            </p>
          </header>

          {children}
          {footer}
        </div>
      </section>
    </main>
  );
}
