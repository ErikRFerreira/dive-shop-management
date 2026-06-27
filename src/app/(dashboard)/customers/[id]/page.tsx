import { CustomerBookingHistory } from '@/components/customers/customer-booking-history';
import { CustomerContactCard } from '@/components/customers/customer-contact-card';
import { CustomerDivingInfoCard } from '@/components/customers/customer-diving-info-card';
import { CustomerProfileHeader } from '@/components/customers/customer-profile-header';
import { getCustomerDetail } from '@/features/customers/queries';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { notFound } from 'next/navigation';

type CustomerDetailsPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Renders a protected, read-only customer detail page.
 *
 * @param props - Dynamic route params for the current customer ID.
 * @returns Customer profile, latest known dive information, and booking history.
 */
async function CustomerDetailsPage({ params }: CustomerDetailsPageProps) {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'customers');

  const { id } = await params;
  const customer = await getCustomerDetail(id);

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <CustomerProfileHeader customer={customer} />
      <CustomerContactCard customer={customer} />
      <CustomerDivingInfoCard diveInfo={customer.diveInfo} />
      <CustomerBookingHistory bookings={customer.bookingHistory} />
    </div>
  );
}

export default CustomerDetailsPage;
