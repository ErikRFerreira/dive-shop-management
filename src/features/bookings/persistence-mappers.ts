import type { NormalizedBookingFormValues } from './types';

export function mapBookingRequestIntakeData(
  bookingValues: NormalizedBookingFormValues,
) {
  const firstActivity = bookingValues.activities[0];

  return {
    activityType: firstActivity?.activityType ?? null,
    specialtyCourse: firstActivity?.specialtyCourse ?? null,
    source: bookingValues.source,
    requestedDate: firstActivity?.requestedDate ?? null,
    requestedTime: firstActivity?.requestedTime ?? null,
    numberOfPeople: bookingValues.numberOfPeople,
    referrerName: bookingValues.referrerName,
    notes: bookingValues.rawBookingText,
    internalNotes: bookingValues.internalNotes,
  };
}

export function mapBookingActivityCreateData(
  activity: NormalizedBookingFormValues['activities'][number],
  sortOrder: number,
) {
  return {
    activityType: activity.activityType,
    specialtyCourse: activity.specialtyCourse,
    requestedDate: activity.requestedDate,
    requestedTime: activity.requestedTime,
    notes: activity.notes,
    sortOrder,
  };
}

export function mapBookingActivityCreateManyData(
  bookingRequestId: string,
  activities: NormalizedBookingFormValues['activities'],
) {
  return activities.map((activity, sortOrder) => ({
    bookingRequestId,
    ...mapBookingActivityCreateData(activity, sortOrder),
  }));
}

export function mapCustomerData(
  bookingCustomer: NormalizedBookingFormValues['customers'][number],
) {
  return {
    fullName: bookingCustomer.customerName,
    chineseName: bookingCustomer.chineseName,
    weChatId: bookingCustomer.weChatId,
    whatsAppNumber: bookingCustomer.whatsAppNumber,
    email: bookingCustomer.email,
    phone: bookingCustomer.phone,
    preferredLanguage: bookingCustomer.preferredLanguage,
  };
}

export function mapBookingCustomerCreateManyData(
  bookingRequestId: string,
  bookingCustomers: NormalizedBookingFormValues['customers'],
  customerIds: string[],
) {
  return bookingCustomers.map((bookingCustomer, index) => ({
    bookingRequestId,
    customerId: customerIds[index],
    role: bookingCustomer.role,
    hotelAtBooking: bookingCustomer.hotelAtBooking,
    equipmentNeeded: bookingCustomer.equipmentNeeded,
    notes: bookingCustomer.customerNotes,
    certificationAgency: bookingCustomer.certificationAgency,
    certificationLevel: bookingCustomer.certificationLevel,
    lastDiveAt: bookingCustomer.lastDiveDate,
    heightCm: bookingCustomer.heightCm,
    weightKg: bookingCustomer.weightKg,
    shoeSize: bookingCustomer.shoeSize,
    divesLogged: bookingCustomer.divesLogged,
  }));
}

export function mapDepositData(
  bookingValues: Pick<
    NormalizedBookingFormValues,
    | 'amount'
    | 'depositStatus'
    | 'currency'
    | 'paidTo'
    | 'paymentMethod'
    | 'paymentNotes'
  >,
) {
  return {
    amount: bookingValues.amount,
    status: bookingValues.depositStatus,
    currency: bookingValues.currency,
    paidTo: bookingValues.paidTo,
    paymentMethod: bookingValues.paymentMethod,
    notes: bookingValues.paymentNotes,
  };
}
