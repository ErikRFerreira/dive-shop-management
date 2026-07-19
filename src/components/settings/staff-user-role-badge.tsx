import { AssignmentBadge } from '@/components/common/assignment-badge';
import { UserRole } from '@/generated/prisma/enums';
import { formatEnumLabel } from '@/lib/format';

type BadgeColorScheme =
  | 'ocean'
  | 'primary'
  | 'pending'
  | 'info-alert'
  | 'scheduled'
  | 'unassigned';

const roleColorSchemes: Record<UserRole, BadgeColorScheme> = {
  [UserRole.ADMIN]: 'primary',
  [UserRole.MANAGER]: 'ocean',
  [UserRole.CUSTOMER_SERVICE]: 'info-alert',
  [UserRole.INSTRUCTOR]: 'scheduled',
  [UserRole.DIVEMASTER]: 'unassigned',
};

/**
 * Renders a staff role using the shared operational badge treatment.
 *
 * @param props - Persisted staff role and whether its badge includes a status dot.
 * @returns A read-only, friendly role badge.
 */
export function StaffUserRoleBadge({
  role,
  showDot = false,
}: {
  role: UserRole;
  showDot?: boolean;
}) {
  return (
    <AssignmentBadge
      colorScheme={roleColorSchemes[role]}
      label={formatEnumLabel(role)}
      showDot={showDot}
    />
  );
}
