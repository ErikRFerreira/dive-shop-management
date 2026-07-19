'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { hashPassword } from '@/features/auth/password';
import { canManageStaffUsers } from '@/features/auth/permissions';
import { Prisma } from '@/generated/prisma/client';
import { UserRole } from '@/generated/prisma/enums';
import { db } from '@/lib/db';
import { requireCurrentUser } from '@/lib/current-user';

import { hasAnotherActiveAdmin } from './admin-invariants';
import type { StaffUserActionResult } from './types';
import {
  createStaffUserSchema,
  staffUserStatusActionSchema,
  updateStaffUserSchema,
} from './validation';

const DUPLICATE_EMAIL_MESSAGE =
  'A staff account with this email already exists.';
const FINAL_ACTIVE_ADMIN_MESSAGE =
  'This account is the final active Admin and cannot be assigned another role.';
const FINAL_ACTIVE_ADMIN_DEACTIVATION_MESSAGE =
  'This account is the final active Admin and cannot be deactivated.';
const SELF_DEACTIVATION_MESSAGE =
  'You cannot deactivate the account you are currently using.';
const STAFF_PERMISSION_MESSAGE =
  'You do not have permission to manage staff users.';
const STAFF_NOT_FOUND_MESSAGE = 'Staff user not found. Refresh and try again.';
const CREATE_FAILURE_MESSAGE =
  'Unable to create the staff account right now. Please try again.';
const UPDATE_FAILURE_MESSAGE =
  'Unable to update the staff account right now. Please try again.';
const DEACTIVATE_FAILURE_MESSAGE =
  'Unable to deactivate the staff account right now. Please try again.';
const REACTIVATE_FAILURE_MESSAGE =
  'Unable to reactivate the staff account right now. Please try again.';
const MAX_SERIALIZABLE_ATTEMPTS = 3;

type StaffUpdateTransactionResult =
  | { outcome: 'success' }
  | { outcome: 'not-found' }
  | { outcome: 'final-active-admin' };

type StaffDeactivationTransactionResult =
  | { outcome: 'success' }
  | { outcome: 'already-inactive' }
  | { outcome: 'not-found' }
  | { outcome: 'self-deactivation' }
  | { outcome: 'final-active-admin' };

/**
 * Converts a Zod failure into the Settings action result consumed by dialogs.
 *
 * @param error - Validation error produced from untrusted staff input.
 * @returns Safe field-level and form-level validation messages.
 */
function getStaffValidationFailure(error: z.ZodError): StaffUserActionResult {
  const flattened = error.flatten();
  const fieldErrors = Object.fromEntries(
    Object.entries(flattened.fieldErrors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );

  return {
    success: false,
    fieldErrors,
    formError: flattened.formErrors[0],
  };
}

/**
 * Resolves the latest database-backed user and checks staff-management access.
 *
 * @returns A safe permission failure for non-ADMIN users, otherwise null.
 */
async function getStaffManagementPermissionFailure(): Promise<StaffUserActionResult | null> {
  const currentUser = await requireCurrentUser();

  return canManageStaffUsers(currentUser)
    ? null
    : { success: false, formError: STAFF_PERMISSION_MESSAGE };
}

/**
 * Checks whether an unknown failure is a specific known Prisma request error.
 *
 * @param error - Unknown caught value from a Prisma operation.
 * @param code - Prisma request code to match without exposing it to the client.
 * @returns Whether the caught value is the requested Prisma error.
 */
function isPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

/**
 * Creates a supported staff login account for an authorized ADMIN.
 *
 * @param input - Untrusted client input containing identity, role, password, and active status.
 * @returns Safe validation, authorization, duplicate-email, or success state.
 */
export async function createStaffUser(
  input: unknown,
): Promise<StaffUserActionResult> {
  const permissionFailure = await getStaffManagementPermissionFailure();
  if (permissionFailure) {
    return permissionFailure;
  }

  const validation = createStaffUserSchema.safeParse(input);
  if (!validation.success) {
    return getStaffValidationFailure(validation.error);
  }

  try {
    const passwordHash = await hashPassword(validation.data.password);

    await db.user.create({
      data: {
        name: validation.data.name,
        email: validation.data.email,
        passwordHash,
        role: validation.data.role,
        isActive: validation.data.isActive,
      },
      select: { id: true },
    });
  } catch (error) {
    if (isPrismaErrorCode(error, 'P2002')) {
      return {
        success: false,
        fieldErrors: { email: [DUPLICATE_EMAIL_MESSAGE] },
      };
    }

    return { success: false, formError: CREATE_FAILURE_MESSAGE };
  }

  revalidatePath('/settings');
  return { success: true };
}

/**
 * Applies one validated staff edit inside the final-active-ADMIN transaction.
 *
 * @param transaction - Serializable Prisma transaction client.
 * @param input - Validated and normalized edit fields.
 * @returns The transaction outcome without returning authentication fields.
 */
async function updateStaffUserInTransaction(
  transaction: Prisma.TransactionClient,
  input: z.output<typeof updateStaffUserSchema>,
): Promise<StaffUpdateTransactionResult> {
  const target = await transaction.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!target) {
    return { outcome: 'not-found' };
  }

  const isActiveAdminDemotion =
    target.isActive &&
    target.role === UserRole.ADMIN &&
    input.role !== UserRole.ADMIN;

  if (isActiveAdminDemotion) {
    const hasBackupAdmin = await hasAnotherActiveAdmin(
      transaction.user,
      target.id,
    );

    if (!hasBackupAdmin) {
      return { outcome: 'final-active-admin' };
    }
  }

  await transaction.user.update({
    where: { id: input.userId },
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
    },
    select: { id: true },
  });

  return { outcome: 'success' };
}

/**
 * Updates a staff account while preserving credentials, active status, and the
 * invariant that at least one active ADMIN remains available.
 *
 * @param input - Untrusted client input containing the target identity and editable fields.
 * @returns Safe validation, authorization, invariant, duplicate-email, or success state.
 */
export async function updateStaffUser(
  input: unknown,
): Promise<StaffUserActionResult> {
  const permissionFailure = await getStaffManagementPermissionFailure();
  if (permissionFailure) {
    return permissionFailure;
  }

  const validation = updateStaffUserSchema.safeParse(input);
  if (!validation.success) {
    return getStaffValidationFailure(validation.error);
  }

  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      const result = await db.$transaction(
        (transaction) =>
          updateStaffUserInTransaction(transaction, validation.data),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if (result.outcome === 'not-found') {
        return {
          success: false,
          formError: STAFF_NOT_FOUND_MESSAGE,
        };
      }

      if (result.outcome === 'final-active-admin') {
        return { success: false, formError: FINAL_ACTIVE_ADMIN_MESSAGE };
      }

      revalidatePath('/settings');
      revalidatePath(`/settings/users/${validation.data.userId}`);
      return { success: true };
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2002')) {
        return {
          success: false,
          fieldErrors: { email: [DUPLICATE_EMAIL_MESSAGE] },
        };
      }

      if (
        isPrismaErrorCode(error, 'P2034') &&
        attempt < MAX_SERIALIZABLE_ATTEMPTS
      ) {
        continue;
      }

      return { success: false, formError: UPDATE_FAILURE_MESSAGE };
    }
  }

  return { success: false, formError: UPDATE_FAILURE_MESSAGE };
}

/**
 * Applies one staff deactivation inside the active-ADMIN invariant transaction.
 *
 * @param transaction - Serializable Prisma transaction client.
 * @param currentUserId - Database-backed ADMIN performing the mutation.
 * @param targetUserId - Persisted user requested for deactivation.
 * @returns A safe transaction outcome without exposing authentication fields.
 */
async function deactivateStaffUserInTransaction(
  transaction: Prisma.TransactionClient,
  currentUserId: string,
  targetUserId: string,
): Promise<StaffDeactivationTransactionResult> {
  const target = await transaction.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!target) {
    return { outcome: 'not-found' };
  }

  if (target.id === currentUserId) {
    return { outcome: 'self-deactivation' };
  }

  if (!target.isActive) {
    return { outcome: 'already-inactive' };
  }

  if (target.role === UserRole.ADMIN) {
    const hasBackupAdmin = await hasAnotherActiveAdmin(
      transaction.user,
      target.id,
    );

    if (!hasBackupAdmin) {
      return { outcome: 'final-active-admin' };
    }
  }

  await transaction.user.update({
    where: { id: target.id },
    data: { isActive: false },
    select: { id: true },
  });

  return { outcome: 'success' };
}

/**
 * Deactivates a persisted staff account for an authorized ADMIN.
 *
 * The action changes only `isActive`, rejects self-deactivation, and performs
 * the final-active-ADMIN check in the same serializable transaction as the
 * update. Existing credentials and operational relationships remain intact.
 *
 * @param input - Untrusted target user identifier submitted by the client.
 * @returns Safe validation, authorization, invariant, or success state.
 */
export async function deactivateStaffUser(
  input: unknown,
): Promise<StaffUserActionResult> {
  const currentUser = await requireCurrentUser();
  if (!canManageStaffUsers(currentUser)) {
    return { success: false, formError: STAFF_PERMISSION_MESSAGE };
  }

  const validation = staffUserStatusActionSchema.safeParse(input);
  if (!validation.success) {
    return getStaffValidationFailure(validation.error);
  }

  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      const result = await db.$transaction(
        (transaction) =>
          deactivateStaffUserInTransaction(
            transaction,
            currentUser.id,
            validation.data.userId,
          ),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if (result.outcome === 'not-found') {
        return { success: false, formError: STAFF_NOT_FOUND_MESSAGE };
      }

      if (result.outcome === 'self-deactivation') {
        return { success: false, formError: SELF_DEACTIVATION_MESSAGE };
      }

      if (result.outcome === 'final-active-admin') {
        return {
          success: false,
          formError: FINAL_ACTIVE_ADMIN_DEACTIVATION_MESSAGE,
        };
      }

      revalidatePath('/settings');
      revalidatePath(`/settings/users/${validation.data.userId}`);
      return { success: true };
    } catch (error) {
      if (
        isPrismaErrorCode(error, 'P2034') &&
        attempt < MAX_SERIALIZABLE_ATTEMPTS
      ) {
        continue;
      }

      return { success: false, formError: DEACTIVATE_FAILURE_MESSAGE };
    }
  }

  return { success: false, formError: DEACTIVATE_FAILURE_MESSAGE };
}

/**
 * Reactivates a persisted staff account for an authorized ADMIN.
 *
 * The action updates only `isActive`; the existing role, password hash,
 * identity, booking ownership, assignments, and history are preserved.
 *
 * @param input - Untrusted target user identifier submitted by the client.
 * @returns Safe validation, authorization, missing-target, or success state.
 */
export async function reactivateStaffUser(
  input: unknown,
): Promise<StaffUserActionResult> {
  const permissionFailure = await getStaffManagementPermissionFailure();
  if (permissionFailure) {
    return permissionFailure;
  }

  const validation = staffUserStatusActionSchema.safeParse(input);
  if (!validation.success) {
    return getStaffValidationFailure(validation.error);
  }

  try {
    const target = await db.user.findUnique({
      where: { id: validation.data.userId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!target) {
      return { success: false, formError: STAFF_NOT_FOUND_MESSAGE };
    }

    if (!target.isActive) {
      await db.user.update({
        where: { id: target.id },
        data: { isActive: true },
        select: { id: true },
      });
    }

    revalidatePath('/settings');
    revalidatePath(`/settings/users/${validation.data.userId}`);
    return { success: true };
  } catch {
    return { success: false, formError: REACTIVATE_FAILURE_MESSAGE };
  }
}
