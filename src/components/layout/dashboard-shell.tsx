'use client';

import type { CSSProperties, ReactNode } from 'react';

import DashboardHeader from '@/components/layout/dashboard-header';
import DashboardSidebar from '@/components/layout/dashboard-sidebar';
import {
  SidebarCollapseProvider,
  useSidebarCollapse,
} from '@/components/layout/sidebar-collapse-provider';
import type { CurrentUser } from '@/lib/current-user';
import { cn } from '@/lib/utils';

type DashboardShellProps = {
  currentUser: CurrentUser;
  children: ReactNode;
};

/** Renders the dashboard shell and applies the shared sidebar width state. */
function DashboardShell({ currentUser, children }: DashboardShellProps) {
  return (
    <SidebarCollapseProvider>
      <DashboardShellContent currentUser={currentUser}>
        {children}
      </DashboardShellContent>
    </SidebarCollapseProvider>
  );
}

/** Renders the grid layout that responds to the sidebar collapse state. */
function DashboardShellContent({ currentUser, children }: DashboardShellProps) {
  const { isCollapsed } = useSidebarCollapse();

  return (
    <div
      className={cn('app-layout', isCollapsed && 'app-layout-collapsed')}
      style={
        {
          '--sidebar-width': isCollapsed ? '5.25rem' : '15.625rem',
        } as CSSProperties
      }
    >
      <DashboardSidebar currentUser={currentUser} />
      <DashboardHeader currentUser={currentUser} />

      <main className="app-main">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">{children}</div>
      </main>
    </div>
  );
}

export default DashboardShell;
