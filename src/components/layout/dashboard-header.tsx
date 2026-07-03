import AppSearch from '../common/app-search';
import { ModeToggle } from '../common/mode-toggle';

type DashboardHeaderProps = {
  currentUser: {
    name: string;
    email: string;
  };
};

function DashboardHeader({ currentUser }: DashboardHeaderProps) {
  return (
    <header className="app-header">
      {/* <AppSearch /> */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <ModeToggle />

        {/* Profile */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card py-1 pl-1 pr-3">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/12 text-xs font-semibold text-primary ring-1 ring-primary/20">
            AU
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium text-foreground">
              {currentUser.name}
            </p>
            <p className="text-xs text-muted-foreground">{currentUser.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
