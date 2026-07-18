import { Suspense } from 'react';

import { WorkspaceLoading } from '@/components/common/workspace-loading';
import DashboardShell from '@/components/layout/dashboard-shell';
import { requireCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

/**
 * Establishes an immediate loading boundary for authenticated dashboard routes.
 *
 * @param props - Dashboard route content rendered after access is resolved.
 * @returns A workspace transition that swaps to the authenticated shell.
 */
function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <AuthenticatedDashboardShell>{children}</AuthenticatedDashboardShell>
    </Suspense>
  );
}

/**
 * Resolves the current active user before rendering the protected app shell.
 *
 * @param props - Dashboard route content for the authenticated user.
 * @returns The role-aware dashboard shell, or the existing login redirect.
 */
async function AuthenticatedDashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await requireCurrentUser();

  return <DashboardShell currentUser={currentUser}>{children}</DashboardShell>;
}

export default DashboardLayout;
