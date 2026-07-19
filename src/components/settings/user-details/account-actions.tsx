import { EditStaffUserDialog } from '@/components/settings/edit-staff-user-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StaffUserDetail } from '@/features/settings/queries';
import { isStaffLoginRole } from '@/features/settings/types';

/**
 * Presents safe account actions for a staff detail record.
 *
 * @param props - Authorized staff details used to expose login-account editing only.
 * @returns Edit controls for login roles or a read-only assignment-record note.
 */
function AccountActions({ staffUser }: { staffUser: StaffUserDetail }) {
  return (
    <Card className="rounded-2xl border border-border bg-linear-to-b from-card to-card-glow shadow-sm">
      <CardHeader>
        <CardTitle id="account-actions-heading">Account Actions</CardTitle>
      </CardHeader>
      <CardContent>
        {isStaffLoginRole(staffUser.role) ? (
          <EditStaffUserDialog
            staffUser={{
              id: staffUser.id,
              name: staffUser.name,
              email: staffUser.email,
              role: staffUser.role,
            }}
          />
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Assignment-only staff records are read-only in Settings.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default AccountActions;
