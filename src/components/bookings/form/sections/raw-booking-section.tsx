import type { UseFormReturn } from 'react-hook-form';

import { BookingFormField } from '@/components/bookings/form/booking-form-controls';
import { BookingFormSection } from '@/components/bookings/form/booking-form-section';
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
      sectionNumber={1}
      title="Original booking message"
      description="Paste the original customer, WeChat, WhatsApp, or agent message. This is the source material for admin review."
    >
      <BookingFormField
        id="rawBookingText"
        label=""
        className="grid gap-2 md:col-span-2"
      >
        <Textarea
          id="rawBookingText"
          className="min-h-36 bg-muted/20 text-[0.95rem] resize-none"
          rows={6}
          {...form.register('rawBookingText')}
        />
      </BookingFormField>
    </BookingFormSection>
  );
}
