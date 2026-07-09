'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AddScheduledBookingParticipantValues } from '@/features/bookings/actions';
import {
  formatEnumLabel,
  preferredLanguageOptions,
} from '@/features/bookings/form-options';
import { PreferredLanguage } from '@/generated/prisma/enums';
import { inputClassName } from '@/lib/consts';

type ParticipantFieldName = keyof AddScheduledBookingParticipantValues;

type FieldsProps = {
  isExistingCustomer: boolean;
  onCreateNewInstead: () => void;
  onFieldChange: (name: ParticipantFieldName, value: string) => void;
  values: AddScheduledBookingParticipantValues;
};

/**
 * Renders one labeled text input for scheduled participant add forms.
 *
 * @param props - Field metadata, current value, and update callback.
 * @returns Labeled input control.
 */
function ParticipantInputField({
  label,
  name,
  onChange,
  readOnly = false,
  type = 'text',
  value,
}: {
  label: string;
  name: ParticipantFieldName;
  onChange: (name: ParticipantFieldName, value: string) => void;
  readOnly?: boolean;
  type?: string;
  value: string | undefined;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`add-participant-${name}`}>{label}</Label>
      <Input
        id={`add-participant-${name}`}
        className={inputClassName}
        onChange={(event) => onChange(name, event.target.value)}
        readOnly={readOnly}
        type={type}
        value={value ?? ''}
      />
    </div>
  );
}

/**
 * Renders the linked existing-customer summary for the add participant form.
 *
 * @param props - Selected customer display values and reset callback.
 * @returns Linked customer summary or null when the form is creating a customer.
 */
function LinkedExistingCustomerSummary({
  onCreateNewInstead,
  values,
}: Pick<FieldsProps, 'onCreateNewInstead' | 'values'>) {
  if (!values.customerId) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 p-3">
      <div>
        <p className="font-medium">Linked existing customer</p>
        <p className="text-sm text-muted-foreground">
          {values.customerName || values.customerId}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCreateNewInstead}
      >
        Create new instead
      </Button>
    </div>
  );
}

/**
 * Renders the preferred language control for new or existing participants.
 *
 * @param props - Existing-customer state, form values, and field update callback.
 * @returns Editable select for new customers or read-only display for existing customers.
 */
function PreferredLanguageField({
  isExistingCustomer,
  onFieldChange,
  values,
}: Pick<FieldsProps, 'isExistingCustomer' | 'onFieldChange' | 'values'>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="add-participant-preferredLanguage">
        Preferred language
      </Label>
      {isExistingCustomer ? (
        <div
          className="flex h-8 items-center rounded-md border bg-muted/30 px-3 text-sm"
          id="add-participant-preferredLanguage"
        >
          {values.preferredLanguage
            ? formatEnumLabel(values.preferredLanguage as PreferredLanguage)
            : '-'}
        </div>
      ) : (
        <Select
          value={values.preferredLanguage || undefined}
          onValueChange={(value) => onFieldChange('preferredLanguage', value)}
        >
          <SelectTrigger
            id="add-participant-preferredLanguage"
            className={inputClassName}
          >
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {preferredLanguageOptions.map((language) => (
              <SelectItem key={language} value={language}>
                {formatEnumLabel(language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

/**
 * Renders the compact details form used when adding a scheduled participant.
 *
 * @param props - Current add-participant values and callbacks.
 * @returns Existing-customer summary plus contact, logistics, dive, and notes fields.
 */
export function AddScheduledBookingParticipantFields({
  isExistingCustomer,
  onCreateNewInstead,
  onFieldChange,
  values,
}: FieldsProps) {
  return (
    <>
      <LinkedExistingCustomerSummary
        onCreateNewInstead={onCreateNewInstead}
        values={values}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <ParticipantInputField
          label="Customer name"
          name="customerName"
          onChange={onFieldChange}
          readOnly={isExistingCustomer}
          value={values.customerName}
        />
        <ParticipantInputField
          label="Chinese name"
          name="chineseName"
          onChange={onFieldChange}
          readOnly={isExistingCustomer}
          value={values.chineseName}
        />
        <ParticipantInputField
          label="WeChat ID"
          name="weChatId"
          onChange={onFieldChange}
          readOnly={isExistingCustomer}
          value={values.weChatId}
        />
        <ParticipantInputField
          label="WhatsApp number"
          name="whatsAppNumber"
          onChange={onFieldChange}
          readOnly={isExistingCustomer}
          value={values.whatsAppNumber}
        />
        <ParticipantInputField
          label="Email"
          name="email"
          onChange={onFieldChange}
          readOnly={isExistingCustomer}
          type="email"
          value={values.email}
        />
        <ParticipantInputField
          label="Phone"
          name="phone"
          onChange={onFieldChange}
          readOnly={isExistingCustomer}
          type="tel"
          value={values.phone}
        />
        <ParticipantInputField
          label="Hotel / pickup location"
          name="hotelAtBooking"
          onChange={onFieldChange}
          value={values.hotelAtBooking}
        />
        <PreferredLanguageField
          isExistingCustomer={isExistingCustomer}
          onFieldChange={onFieldChange}
          values={values}
        />
        <ParticipantInputField
          label="Certification level"
          name="certificationLevel"
          onChange={onFieldChange}
          value={values.certificationLevel}
        />
        <ParticipantInputField
          label="Certification agency"
          name="certificationAgency"
          onChange={onFieldChange}
          value={values.certificationAgency}
        />
        <ParticipantInputField
          label="Last dive date"
          name="lastDiveDate"
          onChange={onFieldChange}
          type="date"
          value={values.lastDiveDate}
        />
        <ParticipantInputField
          label="Logged dives"
          name="divesLogged"
          onChange={onFieldChange}
          type="number"
          value={values.divesLogged}
        />
        <ParticipantInputField
          label="Equipment needed?"
          name="equipmentNeeded"
          onChange={onFieldChange}
          value={values.equipmentNeeded}
        />
        <ParticipantInputField
          label="Height (cm)"
          name="heightCm"
          onChange={onFieldChange}
          type="number"
          value={values.heightCm}
        />
        <ParticipantInputField
          label="Weight (kg)"
          name="weightKg"
          onChange={onFieldChange}
          type="number"
          value={values.weightKg}
        />
        <ParticipantInputField
          label="Shoe size"
          name="shoeSize"
          onChange={onFieldChange}
          type="number"
          value={values.shoeSize}
        />
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="add-participant-customerNotes">Notes</Label>
          <Textarea
            id="add-participant-customerNotes"
            className={`${inputClassName} min-h-24 resize-none`}
            onChange={(event) =>
              onFieldChange('customerNotes', event.target.value)
            }
            value={values.customerNotes}
          />
        </div>
      </div>
    </>
  );
}
