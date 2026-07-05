'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

type DashboardNavigationItemsProps = {
  currentUser: CurrentUser;
  isCollapsed?: boolean;
  onItemClick?: () => void;
  variant?: 'desktop' | 'mobile';
};

/** Renders the navigation items for both desktop sidebar and mobile drawer. */
function DashboardNavigationItems({
  currentUser,
  isCollapsed = false,
  onItemClick,
  variant = 'desktop',
}: DashboardNavigationItemsProps) {
  const navItems = getDashboardNavigation(currentUser);
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = isNavItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            title={isCollapsed ? item.label : undefined}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            onClick={onItemClick}
            className={cn(
              'group relative flex items-center rounded-lg text-sm font-medium transition-colors',
              variant === 'desktop' &&
                (isCollapsed
                  ? 'justify-center gap-0 px-2 py-2.5'
                  : 'gap-3 px-3 py-2'),
              variant === 'mobile' && 'gap-3 px-3 py-3',
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
            <span
              className={cn(
                'flex-1',
                variant === 'desktop' && isCollapsed && 'sr-only',
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </>
  );
}

export default DashboardNavigationItems;
