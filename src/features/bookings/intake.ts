/** @deprecated Import booking form utilities from form-options, form-values, or form-mappers. */

export type {
  BookingActivityFormValues,
  BookingCustomerFormValues,
  BookingFormValues,
  NormalizedBookingFormValues,
} from './types';
export { formatEnumLabel } from './form-options';
export {
  bookingActivityDefaultValues,
  bookingCustomerDefaultValues,
  bookingFormDefaultValues,
} from './form-values';
export { hasMeaningfulDeposit, normalizeBookingFormValues } from './form-mappers';
