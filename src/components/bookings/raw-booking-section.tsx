import type { UseFormReturn } from 'react-hook-form';

import { BookingFormSection } from '@/components/bookings/booking-form-section';
import { BookingFormField } from '@/components/bookings/booking-form-controls';
import { Textarea } from '@/components/ui/textarea';
import type { BookingFormValues } from '@/features/bookings/types';

export function RawBookingSection({
  form,
}: {
  form: UseFormReturn<BookingFormValues>;
}) {
  return (
    <BookingFormSection
      title="Raw Booking Information"
      description="Keep the original customer message for review."
    >
      <BookingFormField
        id="rawBookingText"
        label=""
        className="grid gap-2 md:col-span-2"
      >
        <Textarea
          id="rawBookingText"
          rows={6}
          {...form.register('rawBookingText')}
        />
      </BookingFormField>
    </BookingFormSection>
  );
}
