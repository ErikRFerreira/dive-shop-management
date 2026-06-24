import Link from 'next/link';

import { getDashboardNavigation } from '@/lib/dashboard-navigation';
import type { CurrentUser } from '@/lib/current-user';

function DashboardSidebar({ currentUser }: { currentUser: CurrentUser }) {
  const navItems = getDashboardNavigation(currentUser);

  return (
    <aside className="app-sidebar">
      <div className="mb-8">
        <p className="text-sm font-medium text-muted-foreground">
          Blue Revival
        </p>
        <h1 className="text-xl font-semibold">Dive Ops</h1>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export default DashboardSidebar;
