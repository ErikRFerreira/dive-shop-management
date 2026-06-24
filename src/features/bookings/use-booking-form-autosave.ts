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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

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
) {
  const hasRestored = useRef(false);

  const clearAutosave = useCallback(() => {
    window.localStorage.removeItem(NEW_BOOKING_FORM_AUTOSAVE_KEY);
  }, []);

  useEffect(() => {
    let cancelled = false;

    try {
      const savedValues = window.localStorage.getItem(
        NEW_BOOKING_FORM_AUTOSAVE_KEY,
      );

      if (savedValues) {
        const parsedValues: unknown = JSON.parse(savedValues);

        if (isRecord(parsedValues)) {
          queueMicrotask(() => {
            if (cancelled) {
              return;
            }

            form.reset({
              ...bookingFormDefaultValues,
              ...(parsedValues as Partial<BookingFormValues>),
            });
            hasRestored.current = true;
          });

          const subscription = form.watch((values) => {
            if (!hasRestored.current) {
              return;
            }

            window.localStorage.setItem(
              NEW_BOOKING_FORM_AUTOSAVE_KEY,
              JSON.stringify(values),
            );
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

      window.localStorage.setItem(
        NEW_BOOKING_FORM_AUTOSAVE_KEY,
        JSON.stringify(values),
      );
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [clearAutosave, form]);

  return { clearAutosave };
}
