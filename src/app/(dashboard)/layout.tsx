import DashboardHeader from '@/components/layout/dashboard-header';
import DashboardSidebar from '@/components/layout/dashboard-sidebar';

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <DashboardSidebar />
      <DashboardHeader />

      <main className="app-content">{children}</main>
    </div>
  );
}

export default DashboardLayout;
