import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm, useWatch, type FieldPath, type UseFormReturn } from 'react-hook-form';
import { afterEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findBookingCustomerDuplicates: vi.fn(),
  searchBookingCustomers: vi.fn(),
  toastCustom: vi.fn(),
  toastDismiss: vi.fn(),
}));

vi.mock('@/features/customers/booking-actions', () => ({
  findBookingCustomerDuplicates: mocks.findBookingCustomerDuplicates,
  searchBookingCustomers: mocks.searchBookingCustomers,
}));

vi.mock('sonner', () => ({
  toast: {
    custom: mocks.toastCustom,
    dismiss: mocks.toastDismiss,
  },
}));

import {
  bookingCustomerDefaultValues,
  bookingFormDefaultValues,
} from '@/features/bookings/form-values';
import type { BookingFormValues } from '@/features/bookings/types';
import {
  BookingCustomerRole,
  PreferredLanguage,
} from '@/generated/prisma/enums';
import { CustomerDiverDetailsSection } from './customer-diver-details-section';

const selectedCustomer = {
  id: 'customer-1',
  name: 'Maria Santos',
  fullName: 'Maria Santos',
  firstName: null,
  lastName: null,
  chineseName: null,
  hotel: 'Ocean View',
  preferredLanguage: PreferredLanguage.ENGLISH,
  certificationLevel: 'Advanced Open Water',
  certificationAgency: 'PADI',
  lastDiveDate: '2026-06-01',
  divesLogged: 42,
  email: 'maria@example.test',
  phone: '+639171234567',
  weChatId: 'maria-wx',
  whatsAppNumber: '+639170000000',
  lastBookingDate: '2026-07-01',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function bookingValues(
  overrides: Partial<BookingFormValues> = {},
): BookingFormValues {
  return {
    ...bookingFormDefaultValues,
    activities: bookingFormDefaultValues.activities.map((activity) => ({
      ...activity,
    })),
    customers: bookingFormDefaultValues.customers.map((customer) => ({
      ...customer,
    })),
    ...overrides,
  };
}

function CustomersState({
  form,
}: {
  form: UseFormReturn<BookingFormValues>;
}) {
  const customers =
    useWatch({ control: form.control, name: 'customers' }) ?? [];

  return (
    <pre data-testid="customers-state">{JSON.stringify(customers)}</pre>
  );
}

function CustomerDetailsHarness({
  defaultValues = bookingValues(),
  includesFunDive = false,
  fieldErrors = {},
}: {
  defaultValues?: BookingFormValues;
  includesFunDive?: boolean;
  fieldErrors?: Partial<Record<FieldPath<BookingFormValues>, string>>;
}) {
  const form = useForm<BookingFormValues>({ defaultValues });

  return (
    <form>
      <CustomerDiverDetailsSection
        form={form}
        includesFunDive={includesFunDive}
        getFieldError={(path) => fieldErrors[path]}
      />
      <CustomersState form={form} />
    </form>
  );
}

function currentCustomers() {
  return JSON.parse(
    screen.getByTestId('customers-state').textContent ?? '[]',
  ) as BookingFormValues['customers'];
}

test('renders customer, equipment, and diving experience labels', () => {
  render(<CustomerDetailsHarness />);

  expect(screen.getByText('Customers & divers')).not.toBeNull();
  expect(screen.getByLabelText('Equipment needed?')).not.toBeNull();
  expect(screen.getByText('Diving experience')).not.toBeNull();
  expect(screen.getByLabelText('Hotel / pickup location')).not.toBeNull();
  expect(screen.getByLabelText('Customer notes')).not.toBeNull();
  expect(screen.getByLabelText('Logged dives')).not.toBeNull();
});

test('shows equipment details when equipment is marked yes', () => {
  render(
    <CustomerDetailsHarness
      defaultValues={bookingValues({
        customers: [
          {
            ...bookingCustomerDefaultValues,
            role: BookingCustomerRole.PRIMARY_CONTACT,
            equipmentNeeded: 'YES',
          },
        ],
      })}
    />,
  );

  expect(screen.getByText('Equipment details')).not.toBeNull();
  expect(screen.getByLabelText('Height (cm)')).not.toBeNull();
  expect(screen.getByLabelText('Weight (kg)')).not.toBeNull();
  expect(screen.getByLabelText('Shoe size')).not.toBeNull();
});

test('links an existing customer selected from search results', async () => {
  mocks.searchBookingCustomers.mockResolvedValue([selectedCustomer]);

  render(<CustomerDetailsHarness />);

  fireEvent.change(screen.getByLabelText('Search existing customers'), {
    target: { value: ' Maria ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));

  expect(await screen.findByText('Maria Santos')).not.toBeNull();
  expect(mocks.searchBookingCustomers).toHaveBeenCalledWith('Maria');

  fireEvent.click(screen.getByRole('button', { name: 'Use this customer' }));

  await waitFor(() => {
    expect(currentCustomers()[0]).toMatchObject({
      customerId: 'customer-1',
      customerName: 'Maria Santos',
      email: 'maria@example.test',
    });
  });
  expect(screen.getByText('Linked existing customer')).not.toBeNull();
});

test('shows a clear empty state when existing customer search has no results', async () => {
  mocks.searchBookingCustomers.mockResolvedValue([]);

  render(<CustomerDetailsHarness />);

  fireEvent.change(screen.getByLabelText('Search existing customers'), {
    target: { value: 'Unknown Customer' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));

  expect(
    await screen.findByText(
      'No customers found. Try searching by name, Chinese name, WeChat, WhatsApp, email, or phone.',
    ),
  ).not.toBeNull();
  expect(mocks.searchBookingCustomers).toHaveBeenCalledWith(
    'Unknown Customer',
  );
});

test('promotes the first remaining customer when removing the primary contact', async () => {
  render(
    <CustomerDetailsHarness
      defaultValues={bookingValues({
        customers: [
          {
            ...bookingCustomerDefaultValues,
            role: BookingCustomerRole.PRIMARY_CONTACT,
            customerName: 'Maria Santos',
            email: 'maria@example.test',
          },
          {
            ...bookingCustomerDefaultValues,
            role: BookingCustomerRole.PARTICIPANT,
            customerName: 'Kai Chen',
          },
        ],
      })}
    />,
  );

  fireEvent.click(
    screen.getAllByRole('button', { name: 'Remove customer' })[0],
  );

  await waitFor(() => {
    expect(currentCustomers()).toHaveLength(1);
  });
  expect(currentCustomers()[0]).toMatchObject({
    customerName: 'Kai Chen',
    role: BookingCustomerRole.PRIMARY_CONTACT,
  });
});
