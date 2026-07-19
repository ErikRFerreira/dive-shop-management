'use client';

import { useId } from 'react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  staffLoginRoleMetadata,
  staffLoginRoleOptions,
  type StaffLoginRole,
} from '@/features/settings/types';

type StaffUserRoleSelectProps = {
  disabled?: boolean;
  error?: string;
  onValueChange: (role: StaffLoginRole) => void;
  value: StaffLoginRole | '';
};

/**
 * Renders the shared supported-login role selector and explanatory copy.
 *
 * @param props - Controlled role value, validation state, and change callback.
 * @returns An accessible role field limited to supported platform-login roles.
 */
export function StaffUserRoleSelect({
  disabled = false,
  error,
  onValueChange,
  value,
}: StaffUserRoleSelectProps) {
  const fieldId = useId();
  const descriptionId = `${fieldId}-description`;
  const errorId = `${fieldId}-error`;
  const description = value
    ? staffLoginRoleMetadata[value].description
    : 'Choose the staff member\'s platform access level.';

  return (
    <div className="grid gap-2">
      <Label htmlFor={fieldId}>Role</Label>
      <Select
        disabled={disabled}
        onValueChange={(role) => onValueChange(role as StaffLoginRole)}
        value={value || undefined}
      >
        <SelectTrigger
          aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ''}`}
          aria-invalid={Boolean(error)}
          className="w-full"
          id={fieldId}
        >
          <SelectValue placeholder="Select a role" />
        </SelectTrigger>
        <SelectContent>
          {staffLoginRoleOptions.map((role) => (
            <SelectItem key={role} value={role}>
              {staffLoginRoleMetadata[role].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs leading-relaxed text-muted-foreground" id={descriptionId}>
        {description}
      </p>
      {error ? (
        <p className="text-sm text-destructive" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
