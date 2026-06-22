type DashboardHeaderProps = {
  currentUser: {
    name: string;
  };
};

function DashboardHeader({ currentUser }: DashboardHeaderProps) {
  return (
    <header className="app-header">
      <div>Welcome back, {currentUser.name}</div>
    </header>
  );
}

export default DashboardHeader;
