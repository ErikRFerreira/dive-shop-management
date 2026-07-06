'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';

import DashboardNavigationItems from '@/components/layout/dashboard-navigation-items';
import { useMobileMenu } from '@/components/layout/mobile-menu-provider';
import { useSidebarCollapse } from '@/components/layout/sidebar-collapse-provider';
import type { CurrentUser } from '@/lib/current-user';
import { cn } from '@/lib/utils';

type DashboardSidebarProps = {
  currentUser: CurrentUser;
  variant?: 'desktop' | 'mobile';
};

/**
 * Renders the role-aware dashboard navigation for both the desktop sidebar and
 * mobile drawer while keeping desktop collapse behavior isolated to large
 * screens.
 */
function DashboardSidebar({
  currentUser,
  variant = 'desktop',
}: DashboardSidebarProps) {
  const { isCollapsed, toggleCollapsed } = useSidebarCollapse();
  const { isOpen, close } = useMobileMenu();
  const pathname = usePathname();
  const isMobile = variant === 'mobile';
  const isVisuallyCollapsed = !isMobile && isCollapsed;
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (!isMobile) {
      previousPathnameRef.current = pathname;
      return;
    }

    if (previousPathnameRef.current !== pathname && isOpen) {
      close();
    }

    previousPathnameRef.current = pathname;
  }, [pathname, isMobile, isOpen, close]);

  return (
    <>
      {isMobile && isOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] lg:hidden"
          onClick={close}
        />
      ) : null}

      <aside
        aria-hidden={isMobile && !isOpen}
        aria-label={
          isMobile ? 'Mobile navigation menu' : 'Dashboard navigation'
        }
        className={cn(
          isMobile
            ? 'fixed inset-y-0 left-0 z-50 flex h-dvh w-[85vw] max-w-sm flex-col text-sidebar-foreground shadow-2xl transition-transform duration-200 ease-out lg:hidden'
            : 'app-sidebar',
          isMobile && (isOpen ? 'translate-x-0' : '-translate-x-full'),
          isVisuallyCollapsed && 'app-sidebar-collapsed',
        )}
        style={
          isMobile
            ? {
                background:
                  'linear-gradient(to bottom, color-mix(in oklch, var(--sidebar) 100%, oklch(0.35 0.045 220) 12%), var(--sidebar) 45%, color-mix(in oklch, var(--sidebar) 100%, oklch(0.25 0.03 248) 8%))',
              }
            : undefined
        }
      >
        <div
          className={cn(
            'flex items-center',
            isVisuallyCollapsed
              ? 'flex-col gap-3 px-3 py-5'
              : 'gap-3 px-5 py-6',
            isMobile && 'border-b border-sidebar-border py-4',
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

          <div
            className={cn(
              'min-w-0 leading-tight',
              isVisuallyCollapsed && 'sr-only',
            )}
          >
            <p className="text-sm font-semibold tracking-tight">Blue Revival</p>
            <p className="text-xs text-sidebar-foreground/55">Dive Ops</p>
          </div>

          {isMobile ? (
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={close}
              className="ml-auto inline-flex size-8 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/30 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/55 hover:text-sidebar-foreground"
            >
              <X className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={toggleCollapsed}
              className={cn(
                'ml-auto inline-flex size-8 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/30 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/55 hover:text-sidebar-foreground',
                isVisuallyCollapsed && 'ml-0',
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </button>
          )}
        </div>

        <nav
          className={cn(
            'flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2',
            isVisuallyCollapsed && 'px-2',
            isMobile && 'py-4',
          )}
        >
          <DashboardNavigationItems
            currentUser={currentUser}
            isCollapsed={isVisuallyCollapsed}
            onItemClick={isMobile ? close : undefined}
            variant={isMobile ? 'mobile' : 'desktop'}
          />
        </nav>

        <div
          className={cn(
            'mt-auto px-5 py-5',
            isVisuallyCollapsed && 'px-3 py-4',
            isMobile && 'border-t border-sidebar-border py-4',
          )}
        >
          <div
            className={cn(
              'flex items-center rounded-lg bg-sidebar-accent/40 px-3 py-2.5 ring-1 ring-sidebar-border',
              isVisuallyCollapsed ? 'justify-center gap-0 px-2.5' : 'gap-2',
            )}
          >
            <MapPin className="size-4 text-sidebar-primary" />
            <p
              className={cn(
                'text-xs text-sidebar-foreground/70',
                isVisuallyCollapsed && 'sr-only',
              )}
            >
              Panglao Island{' '}
              <span className="text-sidebar-foreground/40">/</span> Bohol
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default DashboardSidebar;
