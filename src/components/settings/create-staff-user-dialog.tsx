'use client';

import { Eye, EyeOff, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';

import { PendingButton } from '@/components/common/pending-button';
import { StaffUserRoleSelect } from '@/components/settings/staff-user-role-select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { createStaffUser } from '@/features/settings/actions';
import type { StaffLoginRole } from '@/features/settings/types';
import { createStaffUserSchema } from '@/features/settings/validation';

import {
  getStaffUserFormErrors,
  type StaffUserFieldErrors,
} from './staff-user-form-helpers';

type CreateStaffUserFormValues = {
  name: string;
  email: string;
  password: string;
  role: StaffLoginRole | '';
  isActive: boolean;
};

/**
 * Builds fresh create-dialog values without retaining submitted credentials.
 *
 * @returns Empty identity and password fields with new accounts active by default.
 */
function getInitialCreateValues(): CreateStaffUserFormValues {
  return {
    name: '',
    email: '',
    password: '',
    role: '',
    isActive: true,
  };
}

/**
 * Renders the Settings-page dialog for creating supported staff login users.
 *
 * @returns A trigger button and controlled create form with safe pending/error behavior.
 */
export function CreateStaffUserDialog() {
  const router = useRouter();
  const submissionRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(getInitialCreateValues);
  const [fieldErrors, setFieldErrors] = useState<StaffUserFieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const isPending = isActionInFlight || isTransitionPending;

  /** Clears all form and credential state when the dialog is dismissed or succeeds. */
  function resetDialog() {
    setValues(getInitialCreateValues());
    setFieldErrors({});
    setFormError(undefined);
    setShowPassword(false);
  }

  /** Updates open state while preventing dismissal during an active submission. */
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isPending) {
      return;
    }

    setOpen(nextOpen);
    if (!nextOpen) {
      resetDialog();
    }
  }

  /** Validates and submits a new staff account while clearing password state afterward. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionRef.current || isPending) {
      return;
    }

    setFieldErrors({});
    setFormError(undefined);
    const validation = createStaffUserSchema.safeParse(values);

    if (!validation.success) {
      const errors = getStaffUserFormErrors(validation.error);
      setFieldErrors(errors.fieldErrors);
      setFormError(errors.formError);
      setValues((current) => ({ ...current, password: '' }));
      setShowPassword(false);
      return;
    }

    submissionRef.current = true;
    setIsActionInFlight(true);
    startTransition(async () => {
      try {
        const result = await createStaffUser(validation.data);

        if (result.success) {
          resetDialog();
          setOpen(false);
          router.refresh();
          toast.success('Staff user created.');
          return;
        }

        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.formError);
        setValues((current) => ({ ...current, password: '' }));
        setShowPassword(false);
      } catch {
        setFormError(
          'Unable to create the staff account right now. Please try again.',
        );
        setValues((current) => ({ ...current, password: '' }));
        setShowPassword(false);
      } finally {
        submissionRef.current = false;
        setIsActionInFlight(false);
      }
    });
  }

  const nameError = fieldErrors.name?.[0];
  const emailError = fieldErrors.email?.[0];
  const passwordError = fieldErrors.password?.[0];
  const roleError = fieldErrors.role?.[0];

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Create Staff User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <form className="contents" noValidate onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Staff User</DialogTitle>
            <DialogDescription>
              Add a staff login and choose the access their role provides.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[65vh] gap-4 overflow-y-auto px-0.5 py-1">
            <div className="grid gap-2">
              <Label htmlFor="create-staff-name">Full name</Label>
              <Input
                aria-describedby={nameError ? 'create-staff-name-error' : undefined}
                aria-invalid={Boolean(nameError)}
                autoComplete="name"
                disabled={isPending}
                id="create-staff-name"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                value={values.name}
              />
              {nameError ? (
                <p className="text-sm text-destructive" id="create-staff-name-error">
                  {nameError}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-staff-email">Email</Label>
              <Input
                aria-describedby={emailError ? 'create-staff-email-error' : undefined}
                aria-invalid={Boolean(emailError)}
                autoComplete="email"
                disabled={isPending}
                id="create-staff-email"
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
                <p className="text-sm text-destructive" id="create-staff-email-error">
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

            <div className="grid gap-2">
              <Label htmlFor="create-staff-password">Initial password</Label>
              <div className="relative">
                <Input
                  aria-describedby={`create-staff-password-help${passwordError ? ' create-staff-password-error' : ''}`}
                  aria-invalid={Boolean(passwordError)}
                  autoComplete="new-password"
                  className="pr-10"
                  disabled={isPending}
                  id="create-staff-password"
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  disabled={isPending}
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden className="size-4" />
                  ) : (
                    <Eye aria-hidden className="size-4" />
                  )}
                </button>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground" id="create-staff-password-help">
                Set an initial password and share it with the staff member securely.
              </p>
              {passwordError ? (
                <p className="text-sm text-destructive" id="create-staff-password-error">
                  {passwordError}
                </p>
              ) : null}
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox
                aria-describedby="create-staff-active-description"
                checked={values.isActive}
                disabled={isPending}
                id="create-staff-active"
                onCheckedChange={(checked) =>
                  setValues((current) => ({
                    ...current,
                    isActive: checked === true,
                  }))
                }
              />
              <div className="grid gap-1">
                <Label htmlFor="create-staff-active">Active</Label>
                <p className="text-xs text-muted-foreground" id="create-staff-active-description">
                  Active staff users can sign in with their assigned role.
                </p>
              </div>
            </div>

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
              pendingLabel="Creating..."
              type="submit"
            >
              Create Staff User
            </PendingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
