/**
 * Purpose: This module provides a React hook for automatically saving and restoring unsaved booking form values in the browser's localStorage.
 *
 * @remarks
 * - The `useBookingFormAutosave` hook watches the form values and persists them to localStorage.
 * - It restores any saved values when the component mounts, ensuring that users do not lose their progress.
 * - The hook provides a function to clear the saved values from localStorage when needed.
 *
 * @module features/bookings/use-booking-form-autosave
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { bookingFormDefaultValues } from '@/features/bookings/form-values';
import type { BookingFormValues } from '@/features/bookings/types';

/** Versioned browser storage key for unsaved new-booking form values. */
export const NEW_BOOKING_FORM_AUTOSAVE_KEY = 'dive-shop:new-booking-form:v2';

/** Versioned browser storage key for unsaved edits to one existing booking. */
export function getBookingEditFormAutosaveKey(bookingId: string) {
  return `dive-shop:booking-edit-form:${bookingId}:v2`;
}

/**
 * Checks if a value is a plain object (i.e., a record with string keys and unknown values).
 *
 * @param value - The value to check.
 * @returns True if the value is a plain object, otherwise false.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type BookingFormAutosaveOptions =
  | boolean
  | {
      enabled?: boolean;
      storageKey?: string;
      restoreBaseValues?: BookingFormValues;
    };

/**
 * Restores and persists unsaved booking form values in browser localStorage.
 *
 * @param form - React Hook Form instance that owns the booking values.
 * @returns A function that removes the current unsaved browser backup.
 * @remarks This hook is intentionally browser-only and does not implement
 * retries, synchronization, or conflict resolution.
 */
export function useBookingFormAutosave(
  form: Pick<UseFormReturn<BookingFormValues>, 'reset' | 'watch'>,
  options: BookingFormAutosaveOptions = true,
) {
  const hasRestored = useRef(false);
  const autosaveOptions =
    typeof options === 'boolean' ? { enabled: options } : options;
  const enabled = autosaveOptions.enabled ?? true;
  const storageKey =
    autosaveOptions.storageKey ?? NEW_BOOKING_FORM_AUTOSAVE_KEY;
  const restoreBaseValues =
    autosaveOptions.restoreBaseValues ?? bookingFormDefaultValues;

  const clearAutosave = useCallback(() => {
    window.localStorage.removeItem(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    hasRestored.current = false;

    try {
      const savedValues = window.localStorage.getItem(storageKey);

      if (savedValues) {
        const parsedValues: unknown = JSON.parse(savedValues);

        if (isRecord(parsedValues)) {
          queueMicrotask(() => {
            if (cancelled) {
              return;
            }

            form.reset({
              ...restoreBaseValues,
              ...(parsedValues as Partial<BookingFormValues>),
            });
            hasRestored.current = true;
          });

          const subscription = form.watch((values) => {
            if (!hasRestored.current) {
              return;
            }

            window.localStorage.setItem(storageKey, JSON.stringify(values));
          });

          return () => {
            cancelled = true;
            subscription.unsubscribe();
          };
        }
      }
    } catch {
      clearAutosave();
    }

    hasRestored.current = true;

    const subscription = form.watch((values) => {
      if (!hasRestored.current) {
        return;
      }

      window.localStorage.setItem(storageKey, JSON.stringify(values));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [clearAutosave, enabled, form, restoreBaseValues, storageKey]);

  return { clearAutosave };
}
