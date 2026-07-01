import { useEffect, useId, useMemo, useState } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { XIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { duplicateInputFromBookingCustomer } from '@/features/bookings/customer-duplicate-input';
import type { BookingFormValues } from '@/features/bookings/types';
import { findBookingCustomerDuplicates } from '@/features/customers/booking-actions';
import {
  areDuplicateCustomerIdentitySnapshotsEqual,
  getDuplicateCustomerIdentitySnapshot,
  getEligibleDuplicateCustomerLookupInput,
  type DuplicateCustomerIdentitySnapshot,
} from '@/features/customers/duplicate-lookup-rules';
import type { PotentialDuplicateBookingCustomer } from '@/features/customers/types';

import { applyExistingCustomer } from './customer-form-actions';

const selectedCustomerIdSeparator = '\u001f';

/**
 * Parses the compact selected-customer ID dependency key.
 *
 * @param selectedCustomerIdKey - Joined selected customer IDs for effect dependencies.
 * @returns Individual selected customer IDs.
 */
function selectedCustomerIdsFromKey(selectedCustomerIdKey: string) {
  return selectedCustomerIdKey
    ? selectedCustomerIdKey.split(selectedCustomerIdSeparator)
    : [];
}

/**
 * Formats duplicate-match field names for staff-facing warning copy.
 *
 * @param fields - Strong duplicate fields returned by duplicate detection.
 * @returns Comma-separated field labels.
 */
function formatMatchedFields(
  fields: PotentialDuplicateBookingCustomer['matchedFields'],
) {
  const labels: Record<
    PotentialDuplicateBookingCustomer['matchedFields'][number],
    string
  > = {
    weChatId: 'WeChat ID',
    whatsAppNumber: 'WhatsApp number',
    email: 'email',
    phone: 'phone',
    nameAndChineseName: 'name and Chinese name',
  };

  return fields.map((field) => labels[field]).join(', ');
}

/**
 * Renders the custom toast content for possible duplicate customer matches.
 *
 * @param props - Duplicate matches and actions for dismissing or applying one.
 * @returns Toast content with duplicate details and selection controls.
 */
function DuplicateCustomerToastContent({
  duplicates,
  onDismiss,
  onUseCustomer,
}: {
  duplicates: PotentialDuplicateBookingCustomer[];
  onDismiss: () => void;
  onUseCustomer: (customer: PotentialDuplicateBookingCustomer) => void;
}) {
  return (
    <div className="grid w-full gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">Possible existing customer</p>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="text-amber-950 hover:bg-amber-100"
          aria-label="Dismiss possible existing customer notice"
          onClick={onDismiss}
        >
          <XIcon />
        </Button>
      </div>
      <div className="grid gap-2">
        {duplicates.map((duplicate) => (
          <div
            className="flex flex-wrap items-center justify-between gap-3"
            key={duplicate.id}
          >
            <p>
              {duplicate.name} matches existing customer details by{' '}
              {formatMatchedFields(duplicate.matchedFields)}.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="bg-background"
              onClick={() => onUseCustomer(duplicate)}
            >
              Use this customer
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Watches one booking customer row and warns when it may duplicate a customer.
 *
 * @param props - Form row identity, selected customer IDs, and duplicate suppression state.
 * @returns Null because warnings are displayed through toast notifications.
 */
export function PotentialDuplicateCustomerWarning({
  form,
  index,
  rowId,
  selectedCustomerIds,
  suppressedDuplicateSnapshot,
  onDuplicateIdentityEdited,
}: {
  form: UseFormReturn<BookingFormValues>;
  index: number;
  rowId: string;
  selectedCustomerIds: string[];
  suppressedDuplicateSnapshot?: DuplicateCustomerIdentitySnapshot;
  onDuplicateIdentityEdited: (rowId: string) => void;
}) {
  const customer = useWatch({
    control: form.control,
    name: `customers.${index}`,
  });
  const [duplicates, setDuplicates] = useState<
    PotentialDuplicateBookingCustomer[]
  >([]);
  const duplicateToastId = useId();
  const selectedCustomerIdKey = selectedCustomerIds.join(
    selectedCustomerIdSeparator,
  );
  const customerName = customer?.customerName;
  const chineseName = customer?.chineseName;
  const weChatId = customer?.weChatId;
  const whatsAppNumber = customer?.whatsAppNumber;
  const email = customer?.email;
  const phone = customer?.phone;
  const hasCustomer = Boolean(customer);
  const hasSelectedCustomer = Boolean(customer?.customerId);
  const duplicateInput = useMemo(
    () =>
      duplicateInputFromBookingCustomer({
        customerName,
        chineseName,
        weChatId,
        whatsAppNumber,
        email,
        phone,
      }),
    [chineseName, customerName, email, phone, weChatId, whatsAppNumber],
  );

  useEffect(() => {
    let isCurrent = true;
    const duplicateIdentitySnapshot =
      getDuplicateCustomerIdentitySnapshot(duplicateInput);
    const isSuppressedDuplicateSnapshot =
      suppressedDuplicateSnapshot &&
      areDuplicateCustomerIdentitySnapshotsEqual(
        duplicateIdentitySnapshot,
        suppressedDuplicateSnapshot,
      );
    const eligibleDuplicateInput =
      getEligibleDuplicateCustomerLookupInput(duplicateInput);
    const shouldSearchForDuplicates =
      hasCustomer && !hasSelectedCustomer && !isSuppressedDuplicateSnapshot;

    if (suppressedDuplicateSnapshot && !isSuppressedDuplicateSnapshot) {
      onDuplicateIdentityEdited(rowId);
    }

    if (!shouldSearchForDuplicates || !eligibleDuplicateInput) {
      const clearTimeoutId = window.setTimeout(() => {
        if (isCurrent) {
          setDuplicates([]);
        }
      }, 0);

      return () => {
        isCurrent = false;
        window.clearTimeout(clearTimeoutId);
      };
    }

    const timeoutId = window.setTimeout(() => {
      void findBookingCustomerDuplicates(eligibleDuplicateInput)
        .then((matches) => {
          if (!isCurrent) return;

          const selectedCustomerIdSet = new Set(
            selectedCustomerIdsFromKey(selectedCustomerIdKey),
          );
          setDuplicates(
            matches.filter((match) => !selectedCustomerIdSet.has(match.id)),
          );
        })
        .catch(() => {
          if (isCurrent) {
            setDuplicates([]);
          }
        });
    }, 500);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [
    duplicateInput,
    hasCustomer,
    hasSelectedCustomer,
    onDuplicateIdentityEdited,
    rowId,
    selectedCustomerIdKey,
    suppressedDuplicateSnapshot,
  ]);

  useEffect(() => {
    const toastId = `possible-existing-customer-${duplicateToastId}`;

    if (duplicates.length === 0) {
      toast.dismiss(toastId);
      return;
    }

    toast.custom(
      () => (
        <DuplicateCustomerToastContent
          duplicates={duplicates}
          onDismiss={() => toast.dismiss(toastId)}
          onUseCustomer={(duplicate) => {
            applyExistingCustomer(form, index, duplicate);
            toast.dismiss(toastId);
          }}
        />
      ),
      {
        id: toastId,
        duration: Infinity,
        position: 'top-right',
      },
    );

    return () => {
      toast.dismiss(toastId);
    };
  }, [duplicateToastId, duplicates, form, index]);

  return null;
}
