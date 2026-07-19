import { Card, CardHeader, CardTitle } from '@/components/ui/card';

function AccountActions() {
  return (
    <Card className="rounded-2xl border border-border bg-linear-to-b from-card to-card-glow shadow-sm">
      <CardHeader>
        <CardTitle id="account-status-heading">Account Status</CardTitle>
      </CardHeader>
    </Card>
  );
}

export default AccountActions;
