'use client';

import { Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';

import { PendingButton } from '@/components/common/pending-button';
import { StaffUserRoleSelect } from '@/components/settings/staff-user-role-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateStaffUser } from '@/features/settings/actions';
import type { StaffLoginRole } from '@/features/settings/types';
import { updateStaffUserSchema } from '@/features/settings/validation';
import { UserRole } from '@/generated/prisma/enums';

import {
  getStaffUserFormErrors,
  type StaffUserFieldErrors,
} from './staff-user-form-helpers';

export type EditableStaffUser = {
  id: string;
  name: string;
  email: string;
  role: StaffLoginRole;
};

type EditStaffUserFormValues = {
  name: string;
  email: string;
  role: StaffLoginRole;
};

type RoleChangeConfirmation = 'grant-admin' | 'remove-admin';

/**
 * Copies safe persisted fields into fresh controlled edit values.
 *
 * @param staffUser - Supported login account opened from the details page.
 * @returns Editable name, email, and role values.
 */
function getInitialEditValues(
  staffUser: EditableStaffUser,
): EditStaffUserFormValues {
  return {
    name: staffUser.name,
    email: staffUser.email,
    role: staffUser.role,
  };
}

/**
 * Determines whether an ADMIN boundary change requires explicit UI confirmation.
 *
 * @param currentRole - Persisted role shown when the dialog opened.
 * @param nextRole - Newly selected supported login role.
 * @returns The required confirmation kind, or null for ordinary role changes.
 */
function getRoleChangeConfirmation(
  currentRole: StaffLoginRole,
  nextRole: StaffLoginRole,
): RoleChangeConfirmation | null {
  if (currentRole === UserRole.ADMIN && nextRole !== UserRole.ADMIN) {
    return 'remove-admin';
  }

  if (currentRole !== UserRole.ADMIN && nextRole === UserRole.ADMIN) {
    return 'grant-admin';
  }

  return null;
}

/**
 * Renders the staff-details dialog for safe identity and role edits.
 *
 * @param props - Safe editable staff fields from the authorized details query.
 * @returns Edit trigger, form, and confirmation step for ADMIN boundary changes.
 */
export function EditStaffUserDialog({
  staffUser,
}: {
  staffUser: EditableStaffUser;
}) {
  const router = useRouter();
  const submissionRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(() => getInitialEditValues(staffUser));
  const [fieldErrors, setFieldErrors] = useState<StaffUserFieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [confirmation, setConfirmation] =
    useState<RoleChangeConfirmation | null>(null);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const isPending = isActionInFlight || isTransitionPending;

  /** Restores the current safe staff fields and clears transient feedback. */
  function resetDialog() {
    setValues(getInitialEditValues(staffUser));
    setFieldErrors({});
    setFormError(undefined);
    setConfirmation(null);
  }

  /** Updates open state while preventing dismissal during an active update. */
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isPending) {
      return;
    }

    if (nextOpen) {
      resetDialog();
    }

    setOpen(nextOpen);
    if (!nextOpen) {
      resetDialog();
    }
  }

  /** Sends already validated edit values to the authoritative Server Action. */
  function submitValidatedValues(
    validatedValues: ReturnType<typeof updateStaffUserSchema.parse>,
  ) {
    if (submissionRef.current || isPending) {
      return;
    }

    submissionRef.current = true;
    setIsActionInFlight(true);
    setFieldErrors({});
    setFormError(undefined);
    startTransition(async () => {
      try {
        const result = await updateStaffUser(validatedValues);

        if (result.success) {
          resetDialog();
          setOpen(false);
          router.refresh();
          toast.success('Staff user updated.');
          return;
        }

        setConfirmation(null);
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.formError);
      } catch {
        setConfirmation(null);
        setFormError(
          'Unable to update the staff account right now. Please try again.',
        );
      } finally {
        submissionRef.current = false;
        setIsActionInFlight(false);
      }
    });
  }

  /** Validates edits and opens confirmation before crossing the ADMIN boundary. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionRef.current || isPending) {
      return;
    }

    setFieldErrors({});
    setFormError(undefined);
    const validation = updateStaffUserSchema.safeParse({
      userId: staffUser.id,
      ...values,
    });

    if (!validation.success) {
      const errors = getStaffUserFormErrors(validation.error);
      setFieldErrors(errors.fieldErrors);
      setFormError(errors.formError);
      return;
    }

    const requiredConfirmation = getRoleChangeConfirmation(
      staffUser.role,
      validation.data.role,
    );

    if (requiredConfirmation) {
      setConfirmation(requiredConfirmation);
      return;
    }

    submitValidatedValues(validation.data);
  }

  /** Revalidates and submits the role change accepted in the confirmation step. */
  function handleConfirmedSubmit() {
    const validation = updateStaffUserSchema.safeParse({
      userId: staffUser.id,
      ...values,
    });

    if (!validation.success) {
      const errors = getStaffUserFormErrors(validation.error);
      setConfirmation(null);
      setFieldErrors(errors.fieldErrors);
      setFormError(errors.formError);
      return;
    }

    submitValidatedValues(validation.data);
  }

  const nameError = fieldErrors.name?.[0];
  const emailError = fieldErrors.email?.[0];
  const roleError = fieldErrors.role?.[0];
  const isRemovingAdmin = confirmation === 'remove-admin';

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <Pencil className="size-4" />
          Edit Staff User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        {confirmation ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {isRemovingAdmin ? 'Remove Admin access?' : 'Grant Admin access?'}
              </DialogTitle>
              <DialogDescription>
                {isRemovingAdmin
                  ? 'Removing Admin removes Settings and staff-management access from this staff member.'
                  : 'Granting Admin gives this staff member full staff-management access, including Settings access.'}
              </DialogDescription>
            </DialogHeader>
            {formError ? (
              <p aria-live="polite" className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                disabled={isPending}
                onClick={() => setConfirmation(null)}
                type="button"
                variant="outline"
              >
                Back
              </Button>
              <PendingButton
                onClick={handleConfirmedSubmit}
                pending={isPending}
                pendingLabel="Updating..."
                type="button"
                variant={isRemovingAdmin ? 'destructive' : 'default'}
              >
                {isRemovingAdmin ? 'Remove Admin access' : 'Grant Admin access'}
              </PendingButton>
            </DialogFooter>
          </>
        ) : (
          <form className="contents" noValidate onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Staff User</DialogTitle>
              <DialogDescription>
                Update this staff member&apos;s identity and platform role.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-1">
              <div className="grid gap-2">
                <Label htmlFor="edit-staff-name">Full name</Label>
                <Input
                  aria-describedby={nameError ? 'edit-staff-name-error' : undefined}
                  aria-invalid={Boolean(nameError)}
                  autoComplete="name"
                  disabled={isPending}
                  id="edit-staff-name"
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  value={values.name}
                />
                {nameError ? (
                  <p className="text-sm text-destructive" id="edit-staff-name-error">
                    {nameError}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-staff-email">Email</Label>
                <Input
                  aria-describedby={emailError ? 'edit-staff-email-error' : undefined}
                  aria-invalid={Boolean(emailError)}
                  autoComplete="email"
                  disabled={isPending}
                  id="edit-staff-email"
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  type="email"
                  value={values.email}
                />
                {emailError ? (
                  <p className="text-sm text-destructive" id="edit-staff-email-error">
                    {emailError}
                  </p>
                ) : null}
              </div>

              <StaffUserRoleSelect
                disabled={isPending}
                error={roleError}
                onValueChange={(role) =>
                  setValues((current) => ({ ...current, role }))
                }
                value={values.role}
              />

              {formError ? (
                <p aria-live="polite" className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                disabled={isPending}
                onClick={() => handleOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <PendingButton
                pending={isPending}
                pendingLabel="Updating..."
                type="submit"
              >
                Save changes
              </PendingButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
