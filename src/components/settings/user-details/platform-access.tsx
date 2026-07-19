import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CircleCheck } from 'lucide-react';
import type { StaffUserDetail } from '@/features/settings/queries';
import { getStaffRoleAccessSummary } from '@/features/settings/access-summary';
import {
  isStaffLoginRole,
  staffLoginRoleMetadata,
} from '@/features/settings/types';

type Props = {
  staffUser: StaffUserDetail;
};

/**
 * Presents the platform areas available to a staff member's assigned role.
 *
 * @param props - Staff details used to resolve role-specific access and copy.
 * @returns A read-only access summary or assignment-only explanation.
 */
function PlatformAccess({ staffUser }: Props) {
  const accessSummary = getStaffRoleAccessSummary(staffUser.role);
  const roleDescription = isStaffLoginRole(staffUser.role)
    ? staffLoginRoleMetadata[staffUser.role].description
    : 'Assignment-only staff record. Can be assigned to scheduled activities but cannot sign in to the platform.';

  return (
    <Card
      aria-labelledby="platform-access-heading"
      className="gap-0 rounded-[2rem] border border-border/80 bg-linear-to-b from-card to-card-glow py-0 shadow-sm ring-0"
      role="region"
    >
      <CardHeader className="gap-2 px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
        <CardTitle id="platform-access-heading" className="text-lg">
          Platform Access
        </CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-relaxed">
          {roleDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 sm:px-7 sm:pb-7">
        {accessSummary.assignmentOnly ? (
          <p className="text-sm font-medium text-muted-foreground">
            No platform areas are available for this role.
          </p>
        ) : (
          <ul className="space-y-3">
            {accessSummary.items.map((item) => (
              <li
                className="flex items-start gap-3 text-base font-medium"
                key={item}
              >
                <CircleCheck
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-scheduled"
                />
                {item}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default PlatformAccess;
