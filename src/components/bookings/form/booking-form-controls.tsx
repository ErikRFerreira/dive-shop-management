import type { FieldErrors } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatEnumLabel } from '@/features/bookings/form-options';
import type { BookingFormValues } from '@/features/bookings/types';
import { inputClassName } from '@/lib/consts';
import { cn } from '@/lib/utils';

type BookingFormFieldProps = {
  id: string;
  label: string;
  className?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
};

type EnumSelectProps<T extends string> = {
  id: string;
  value: T | '';
  onValueChange: (value: T) => void;
  values: T[];
  placeholder: string;
  className?: string;
  getOptionLabel?: (value: T) => string;
};

type BookingFormFieldErrorProps = {
  error?: string;
  className?: string;
};

/**
 * Renders a labeled booking form control with optional required marker and error text.
 *
 * @param props - Field identity, label, layout class, required flag, error, and control.
 * @returns A consistent labeled control wrapper for booking intake sections.
 */
export function BookingFormField({
  id,
  label,
  className,
  required = false,
  error,
  children,
}: BookingFormFieldProps) {
  return (
    <div className={className ?? 'grid gap-2'}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Renders booking form validation text for layouts that place errors outside
 * the field wrapper to preserve multi-column alignment.
 *
 * @param props - Optional error text and layout classes for the error row.
 * @returns A validation alert when an error is present.
 */
export function BookingFormFieldError({
  error,
  className,
}: BookingFormFieldErrorProps) {
  if (!error) return null;

  return (
    <p className={cn('text-sm text-destructive', className)} role="alert">
      {error}
    </p>
  );
}

/**
 * Renders a booking enum select using the app's enum label formatter.
 *
 * @param props - Select identity, current value, change handler, options, placeholder, and optional label formatter.
 * @returns A shadcn select configured for enum-backed booking form fields.
 */
export function EnumSelect<T extends string>({
  id,
  value,
  onValueChange,
  values,
  placeholder,
  getOptionLabel = formatEnumLabel,
}: EnumSelectProps<T>) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={inputClassName}>
        <SelectValue placeholder={placeholder}>
          {value ? getOptionLabel(value) : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {values.map((option) => (
          <SelectItem key={option} value={option}>
            {getOptionLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Flattens nested React Hook Form field errors into staff-facing messages.
 *
 * @param errors - React Hook Form errors for the booking intake form.
 * @returns Unique caller-ready error messages discovered in the nested error tree.
 */
export function collectBookingFormErrorMessages(
  errors: FieldErrors<BookingFormValues>,
) {
  const messages: string[] = [];

  /**
   * Recursively walks nested error values and appends leaf messages.
   *
   * @param value - Unknown nested error value from React Hook Form.
   */
  function collect(value: unknown) {
    if (!value || typeof value !== 'object') return;

    const error = value as { message?: unknown };
    if (typeof error.message === 'string') {
      messages.push(error.message);
      return;
    }

    Object.values(value).forEach(collect);
  }

  collect(errors);
  return messages;
}
