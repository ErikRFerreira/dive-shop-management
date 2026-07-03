import DashboardShell from '@/components/layout/dashboard-shell';
import { requireCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

/** Renders the authenticated dashboard shell for the current user. */
async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await requireCurrentUser();

  return <DashboardShell currentUser={currentUser}>{children}</DashboardShell>;
}

export default DashboardLayout;
