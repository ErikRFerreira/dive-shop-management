import type { UseFormReturn } from 'react-hook-form';

import { BookingFormSection } from '@/components/bookings/booking-form-section';
import { BookingFormField } from '@/components/bookings/booking-form-controls';
import { Textarea } from '@/components/ui/textarea';
import type { BookingFormValues } from '@/features/bookings/types';

/**
 * Renders the original booking message capture area at the top of intake.
 *
 * @param props - React Hook Form instance used to register the raw message.
 * @returns The optional original booking message form section.
 */
export function RawBookingSection({
  form,
}: {
  form: UseFormReturn<BookingFormValues>;
}) {
  return (
    <BookingFormSection
      title="Original booking message"
      description="Paste the original customer, WeChat, WhatsApp, or agent message."
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
