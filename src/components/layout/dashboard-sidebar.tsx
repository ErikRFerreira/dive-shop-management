'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin } from 'lucide-react';

import { getDashboardNavigation } from '@/lib/dashboard-navigation';
import type { CurrentUser } from '@/lib/current-user';
import { cn } from '@/lib/utils';

/** Returns true when a nav item should appear active for the current pathname. */
function isNavItemActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Renders one route row in the dashboard sidebar navigation. */
function SidebarNavItem({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  pathname: string;
}) {
  const isActive = isNavItemActive(pathname, href);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-accent/70 text-sidebar-foreground'
          : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
      )}
    >
      {isActive ? (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
      ) : null}
      <Icon
        className={cn(
          'size-[1.15rem] shrink-0',
          isActive
            ? 'text-sidebar-primary'
            : 'text-sidebar-foreground/55 group-hover:text-sidebar-foreground',
        )}
      />
      <span className="flex-1">{label}</span>
    </Link>
  );
}

/** Renders the role-aware dashboard sidebar with v0-inspired visual styling. */
function DashboardSidebar({ currentUser }: { currentUser: CurrentUser }) {
  const navItems = getDashboardNavigation(currentUser);
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex size-8 items-center justify-center overflow-hidden rounded-xl bg-sidebar-primary/15 ring-1 ring-sidebar-primary/25">
          <Image
            src="/icon.svg"
            alt="Blue Revival logo"
            width={32}
            height={32}
            className="size-8 object-contain"
            priority
          />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Blue Revival</p>
          <p className="text-xs text-sidebar-foreground/55">Dive Ops</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            pathname={pathname}
          />
        ))}
      </nav>

      <div className="mt-auto px-5 py-5">
        <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/40 px-3 py-2.5 ring-1 ring-sidebar-border">
          <MapPin className="size-4 text-sidebar-primary" />
          <p className="text-xs text-sidebar-foreground/70">
            Panglao Island <span className="text-sidebar-foreground/40">·</span>{' '}
            Bohol
          </p>
        </div>
      </div>
    </aside>
  );
}

export default DashboardSidebar;
