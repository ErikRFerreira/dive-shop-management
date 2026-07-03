import DashboardHeader from '@/components/layout/dashboard-header';
import DashboardSidebar from '@/components/layout/dashboard-sidebar';
import { requireCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await requireCurrentUser();

  return (
    <div className="app-layout">
      <DashboardSidebar currentUser={currentUser} />
      <DashboardHeader currentUser={currentUser} />

      <main className="app-main">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">{children}</div>
      </main>
    </div>
  );
}

export default DashboardLayout;
