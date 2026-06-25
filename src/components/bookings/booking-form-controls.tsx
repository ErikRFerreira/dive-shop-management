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

type BookingFormFieldProps = {
  id: string;
  label: string;
  className?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
};

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

export function EnumSelect<T extends string>({
  id,
  value,
  onValueChange,
  values,
  placeholder,
}: {
  id: string;
  value: T | '';
  onValueChange: (value: T) => void;
  values: T[];
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder}>
          {value ? formatEnumLabel(value) : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {values.map((option) => (
          <SelectItem key={option} value={option}>
            {formatEnumLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function collectBookingFormErrorMessages(
  errors: FieldErrors<BookingFormValues>,
) {
  const messages: string[] = [];

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
