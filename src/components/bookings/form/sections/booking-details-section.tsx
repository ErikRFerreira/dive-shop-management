import {
  Controller,
  type FieldPath,
  type UseFormReturn,
  useFieldArray,
} from 'react-hook-form';

import { BookingFormSection } from '@/components/bookings/form/booking-form-section';
import {
  BookingFormField,
  BookingFormFieldError,
  EnumSelect,
} from '@/components/bookings/form/booking-form-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  activityTypeOptions,
  bookingSourceOptions,
} from '@/features/bookings/form-options';
import { bookingActivityDefaultValues } from '@/features/bookings/form-values';
import { getDefaultActivityDurationDays } from '@/features/bookings/activity-utils';
import type {
  BookingActivityFormValues,
  BookingFormValues,
} from '@/features/bookings/types';
import { ActivityType } from '@/generated/prisma/enums';
import { inputClassName } from '@/lib/consts';
import { Plus, Trash2 } from 'lucide-react';

type BookingDetailsSectionProps = {
  form: UseFormReturn<BookingFormValues>;
  activities: BookingActivityFormValues[];
  getFieldError: (path: FieldPath<BookingFormValues>) => string | undefined;
};

/**
 * Renders booking summary fields and the repeatable activity intake rows.
 *
 * @param props - Form state, watched activity rows, and field error lookup.
 * @returns The booking summary and activities sections for booking intake.
 */
export function BookingDetailsSection({
  form,
  activities,
  getFieldError,
}: BookingDetailsSectionProps) {
  const sourceError = getFieldError('source');
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'activities',
  });

  return (
    <>
      <BookingFormSection sectionNumber={2} title="Booking summary">
        <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
          <BookingFormField id="source" label="Source / referrer" required>
            <Controller
              control={form.control}
              name="source"
              render={({ field }) => (
                <EnumSelect
                  id={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                  values={bookingSourceOptions}
                  placeholder="Select source"
                  className={inputClassName}
                />
              )}
            />
          </BookingFormField>
          <BookingFormField id="referrerName" label="Referrer name">
            <Input
              id="referrerName"
              {...form.register('referrerName')}
              className={inputClassName}
            />
          </BookingFormField>
          <BookingFormFieldError
            error={sourceError}
            className="md:col-span-2"
          />
        </div>
        <BookingFormField
          id="internalNotes"
          label="Internal notes"
          className="grid gap-2 md:col-span-2"
        >
          <Textarea
            id="internalNotes"
            {...form.register('internalNotes')}
            className={`${inputClassName} min-h-36 resize-none`}
          />
        </BookingFormField>
      </BookingFormSection>

      <BookingFormSection
        sectionNumber={3}
        title="Activities"
        description="Add one or more activities requested in this booking."
      >
        <div className="space-y-4 md:col-span-2">
          {fields.map((activity: { id: string }, index: number) => {
            const prefix = `activities.${index}` as const;
            const activityTypeError = getFieldError(
              `${prefix}.activityType`,
            );
            const requestedDateError = getFieldError(
              `${prefix}.requestedDate`,
            );
            const isSpecialtyCourse =
              activities[index]?.activityType === ActivityType.SPECIALTY_COURSE;

            return (
              <div
                className="rounded-xl border border-border bg-muted/30 p-4"
                key={activity.id}
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className="font-medium">Activity {index + 1}</h3>
                  {fields.length > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(7rem,0.35fr)_minmax(0,0.65fr)_minmax(7rem,0.35fr)]">
                  <BookingFormField
                    id={`${prefix}.activityType`}
                    label="Activity type"
                    required
                  >
                    <Controller
                      control={form.control}
                      name={`${prefix}.activityType`}
                      render={({ field }) => (
                        <EnumSelect
                          id={field.name}
                          value={field.value}
                          onValueChange={(value) => {
                            const currentDuration = form.getValues(
                              `${prefix}.durationDays`,
                            );
                            const previousDefault =
                              getDefaultActivityDurationDays(field.value);

                            field.onChange(value);

                            if (
                              !currentDuration.trim() ||
                              Number(currentDuration) === previousDefault
                            ) {
                              form.setValue(
                                `${prefix}.durationDays`,
                                String(getDefaultActivityDurationDays(value)),
                                {
                                  shouldDirty: true,
                                  shouldValidate: false,
                                },
                              );
                            }
                          }}
                          values={activityTypeOptions}
                          placeholder="Select activity"
                          className={inputClassName}
                        />
                      )}
                    />
                  </BookingFormField>
                  <BookingFormField
                    id={`${prefix}.durationDays`}
                    label="Duration days"
                  >
                    <Input
                      id={`${prefix}.durationDays`}
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      {...form.register(`${prefix}.durationDays`)}
                      className={inputClassName}
                    />
                  </BookingFormField>
                  <BookingFormField
                    id={`${prefix}.requestedDate`}
                    label="Requested date"
                    required
                  >
                    <Input
                      id={`${prefix}.requestedDate`}
                      type="date"
                      {...form.register(`${prefix}.requestedDate`)}
                      className={inputClassName}
                    />
                  </BookingFormField>
                  <BookingFormField id={`${prefix}.requestedTime`} label="Time">
                    <Input
                      id={`${prefix}.requestedTime`}
                      type="time"
                      {...form.register(`${prefix}.requestedTime`)}
                      className={inputClassName}
                    />
                  </BookingFormField>
                  {activityTypeError || requestedDateError ? (
                    <div className="grid gap-1 md:col-span-4">
                      <BookingFormFieldError error={activityTypeError} />
                      <BookingFormFieldError error={requestedDateError} />
                    </div>
                  ) : null}
                  {isSpecialtyCourse ? (
                    <BookingFormField
                      id={`${prefix}.specialtyCourse`}
                      label="Specialty course"
                      required
                      error={getFieldError(`${prefix}.specialtyCourse`)}
                      className="grid gap-2 md:col-span-4"
                    >
                      <Input
                        id={`${prefix}.specialtyCourse`}
                        {...form.register(`${prefix}.specialtyCourse`)}
                        className={inputClassName}
                      />
                    </BookingFormField>
                  ) : null}
                  <BookingFormField
                    id={`${prefix}.notes`}
                    label="Activity notes"
                    className="grid gap-2 md:col-span-4"
                  >
                    <Textarea
                      id={`${prefix}.notes`}
                      {...form.register(`${prefix}.notes`)}
                      className={`${inputClassName} min-h-24 resize-none`}
                    />
                  </BookingFormField>
                </div>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ ...bookingActivityDefaultValues })}
          >
            <Plus className="h-4 w-4" />
            Add activity
          </Button>
        </div>
      </BookingFormSection>
    </>
  );
}
