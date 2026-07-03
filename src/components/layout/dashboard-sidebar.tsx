'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

import { useSidebarCollapse } from '@/components/layout/sidebar-collapse-provider';
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
  const { isCollapsed } = useSidebarCollapse();
  const isActive = isNavItemActive(pathname, href);

  return (
    <Link
      href={href}
      title={isCollapsed ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
      aria-label={label}
      className={cn(
        'group relative flex items-center rounded-lg text-sm font-medium transition-colors',
        isCollapsed ? 'justify-center gap-0 px-2 py-2.5' : 'gap-3 px-3 py-2',
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
      <span className={cn('flex-1', isCollapsed && 'sr-only')}>{label}</span>
    </Link>
  );
}

/** Renders the role-aware dashboard sidebar with v0-inspired visual styling. */
function DashboardSidebar({ currentUser }: { currentUser: CurrentUser }) {
  const { isCollapsed, toggleCollapsed } = useSidebarCollapse();
  const navItems = getDashboardNavigation(currentUser);
  const pathname = usePathname();

  return (
    <aside
      className={cn('app-sidebar', isCollapsed && 'app-sidebar-collapsed')}
    >
      <div
        className={cn(
          'flex items-center',
          isCollapsed ? 'flex-col gap-3 px-3 py-5' : 'gap-3 px-5 py-6',
        )}
      >
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
        <div className={cn('min-w-0 leading-tight', isCollapsed && 'sr-only')}>
          <p className="text-sm font-semibold tracking-tight">Blue Revival</p>
          <p className="text-xs text-sidebar-foreground/55">Dive Ops</p>
        </div>
        <button
          type="button"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={toggleCollapsed}
          className={cn(
            'ml-auto inline-flex size-8 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/30 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/55 hover:text-sidebar-foreground',
            isCollapsed && 'ml-0',
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
      </div>

      <nav
        className={cn(
          'flex flex-1 flex-col gap-1 px-3 py-2',
          isCollapsed && 'px-2',
        )}
      >
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

      <div className={cn('mt-auto px-5 py-5', isCollapsed && 'px-3 py-4')}>
        <div
          className={cn(
            'flex items-center rounded-lg bg-sidebar-accent/40 px-3 py-2.5 ring-1 ring-sidebar-border',
            isCollapsed ? 'justify-center gap-0 px-2.5' : 'gap-2',
          )}
        >
          <MapPin className="size-4 text-sidebar-primary" />
          <p
            className={cn(
              'text-xs text-sidebar-foreground/70',
              isCollapsed && 'sr-only',
            )}
          >
            Panglao Island <span className="text-sidebar-foreground/40">·</span>{' '}
            Bohol
          </p>
        </div>
      </div>
    </aside>
  );
}

export default DashboardSidebar;
