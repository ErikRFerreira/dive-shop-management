import {
  canAccessBookings,
  canAccessCustomers,
  canAccessGlobalSchedule,
  canAccessInstructorAssignments,
  canAccessPlatform,
  canAccessSettings,
  canCreateBookingRequest,
  canManageAssignments,
  canManageStaffUsers,
} from '@/features/auth/permissions';
import { UserRole } from '@/generated/prisma/enums';

export type StaffRoleAccessSummary = {
  items: string[];
  assignmentOnly: boolean;
  explanation?: string;
};

/**
 * Builds staff-facing access copy from the centralized role capabilities.
 *
 * Labels intentionally describe product areas rather than configurable
 * permissions. Instructor copy follows the approved two-item summary even
 * though instructors also have an assignment-focused dashboard experience.
 *
 * @param role - Persisted staff role whose platform access should be described.
 * @returns Read-only access items or the DIVEMASTER assignment-only explanation.
 */
export function getStaffRoleAccessSummary(
  role: UserRole,
): StaffRoleAccessSummary {
  const subject = { role };

  if (!canAccessPlatform(subject)) {
    return {
      items: [],
      assignmentOnly: true,
      explanation:
        'This is an assignment-only staff record. It can be assigned to scheduled activities but cannot sign in to the platform.',
    };
  }

  if (role === UserRole.INSTRUCTOR) {
    return {
      items: [
        ...(canAccessGlobalSchedule(subject) ? ['Global Schedule'] : []),
        ...(canAccessInstructorAssignments(subject) ? ['My Assignments'] : []),
      ],
      assignmentOnly: false,
    };
  }

  if (role === UserRole.CUSTOMER_SERVICE) {
    return {
      items: [
        ...(canAccessPlatform(subject) ? ['Dashboard'] : []),
        ...(canCreateBookingRequest(subject) ? ['Booking intake'] : []),
        ...(canAccessCustomers(subject) ? ['Customer management'] : []),
        ...(canAccessGlobalSchedule(subject) ? ['Schedule view'] : []),
      ],
      assignmentOnly: false,
    };
  }

  return {
    items: [
      ...(canAccessPlatform(subject) ? ['Dashboard'] : []),
      ...(canAccessBookings(subject) ? ['Booking management'] : []),
      ...(canAccessGlobalSchedule(subject) && canManageAssignments(subject)
        ? ['Schedule and assignments']
        : []),
      ...(canAccessCustomers(subject) ? ['Customer management'] : []),
      ...(canManageStaffUsers(subject) ? ['Staff management'] : []),
      ...(canAccessSettings(subject) ? ['Settings access'] : []),
    ],
    assignmentOnly: false,
  };
}
