import type { BookingCustomerPickerResult } from '@/features/customers/types';
import type { BookingCustomerFormValues } from './types';

/**
 * Returns the existing form value when staff has already entered one.
 *
 * @param currentValue - Current text from the booking customer row.
 * @param fallbackValue - Value copied from the selected customer profile/history.
 * @returns Current text when nonblank, otherwise the fallback or an empty string.
 */
function preserveText(currentValue: string, fallbackValue: string | null) {
  return currentValue.trim() ? currentValue : (fallbackValue ?? '');
}

/**
 * Returns a number-like form value while preserving staff-entered text.
 *
 * @param currentValue - Current number input value from the booking customer row.
 * @param fallbackValue - Number copied from the selected customer's latest booking.
 * @returns Current text when nonblank, otherwise the fallback as form text.
 */
function preserveNumberText(
  currentValue: string,
  fallbackValue: number | null,
) {
  return currentValue.trim() ? currentValue : (fallbackValue?.toString() ?? '');
}

/**
 * Applies a selected customer to one booking customer form row.
 *
 * @param currentValues - Current row values, including any booking-specific edits.
 * @param customer - Existing customer selected from the picker.
 * @returns A complete booking customer row linked to the selected customer.
 */
export function mapSelectedCustomerToBookingCustomerValues(
  currentValues: BookingCustomerFormValues,
  customer: BookingCustomerPickerResult,
): BookingCustomerFormValues {
  return {
    ...currentValues,
    customerId: customer.id,
    customerName: customer.name,
    chineseName: customer.chineseName ?? '',
    weChatId: customer.weChatId ?? '',
    whatsAppNumber: customer.whatsAppNumber ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    hotelAtBooking: preserveText(currentValues.hotelAtBooking, customer.hotel),
    preferredLanguage: customer.preferredLanguage ?? '',
    certificationLevel: preserveText(
      currentValues.certificationLevel,
      customer.certificationLevel,
    ),
    certificationAgency: preserveText(
      currentValues.certificationAgency,
      customer.certificationAgency,
    ),
    lastDiveDate: preserveText(currentValues.lastDiveDate, customer.lastDiveDate),
    divesLogged: preserveNumberText(
      currentValues.divesLogged,
      customer.divesLogged,
    ),
  };
}
