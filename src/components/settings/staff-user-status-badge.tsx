import { AssignmentBadge } from '@/components/common/assignment-badge';

/**
 * Renders the persisted staff-account status with shared badge semantics.
 *
 * @param props - Whether the staff account is currently active.
 * @returns An Active or Inactive status badge.
 */
export function StaffUserStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <AssignmentBadge
      colorScheme={isActive ? 'scheduled' : 'unassigned'}
      label={isActive ? 'Active' : 'Inactive'}
    />
  );
}
