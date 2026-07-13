import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function LoginForm() {
  return (
    <div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Development Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Full authentication is not implemented yet. During Sprint 1, the app
            uses a seeded development user from <code>DEV_USER_EMAIL</code>.
          </p>

          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">Default local user:</p>
            <p className="text-muted-foreground">cs@diveshop.local</p>
          </div>

          <Button asChild>
            <Link href="/dashboard">Try Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
