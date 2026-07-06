import { beforeEach, expect, test, vi } from 'vitest';

import { ActivityType, PreferredLanguage } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  findPotentialDuplicateCustomers: vi.fn(),
  requireCurrentUser: vi.fn(),
  requireDashboardRouteAccess: vi.fn(),
  searchCustomers: vi.fn(),
}));

vi.mock('@/features/customers/duplicates', () => ({
  findPotentialDuplicateCustomers: mocks.findPotentialDuplicateCustomers,
}));

vi.mock('@/features/customers/queries', () => ({
  searchCustomers: mocks.searchCustomers,
}));

vi.mock('@/lib/current-user', () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock('@/lib/require-dashboard-route-access', () => ({
  requireDashboardRouteAccess: mocks.requireDashboardRouteAccess,
}));

import {
  findBookingCustomerDuplicates,
  searchBookingCustomers,
} from './booking-actions';

const customerSearchResult = {
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
  lastDiveDate: new Date('2026-06-01T00:00:00.000Z'),
  divesLogged: 42,
  email: 'maria@example.test',
  phone: null,
  weChatId: 'maria-wx',
  whatsAppNumber: null,
  lastBookingDate: new Date('2026-07-01T00:00:00.000Z'),
  lastActivity: ActivityType.FUN_DIVE,
  bookingCount: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'user-1',
    role: 'CUSTOMER_SERVICE',
  });
});

test('searches booking customers with route access and serializable dates', async () => {
  mocks.searchCustomers.mockResolvedValue([customerSearchResult]);

  await expect(searchBookingCustomers(' maria ')).resolves.toEqual([
    {
      ...customerSearchResult,
      lastDiveDate: '2026-06-01',
      lastBookingDate: '2026-07-01',
    },
  ]);

  expect(mocks.requireDashboardRouteAccess).toHaveBeenCalledWith(
    { id: 'user-1', role: 'CUSTOMER_SERVICE' },
    'bookings',
  );
  expect(mocks.searchCustomers).toHaveBeenCalledWith(' maria ');
});

test('forwards duplicate input and serializes duplicate match dates', async () => {
  mocks.findPotentialDuplicateCustomers.mockResolvedValue([
    {
      ...customerSearchResult,
      matchedFields: ['email'],
    },
  ]);

  await expect(
    findBookingCustomerDuplicates({
      excludeCustomerId: 'customer-1',
      email: ' maria@example.test ',
    }),
  ).resolves.toEqual([
    {
      ...customerSearchResult,
      lastDiveDate: '2026-06-01',
      lastBookingDate: '2026-07-01',
      matchedFields: ['email'],
    },
  ]);

  expect(mocks.findPotentialDuplicateCustomers).toHaveBeenCalledWith({
    excludeCustomerId: 'customer-1',
    email: 'maria@example.test',
  });
});

test('returns no duplicate matches for under-threshold input without querying duplicates', async () => {
  await expect(
    findBookingCustomerDuplicates({
      excludeCustomerId: 'customer-1',
      name: 'M',
      chineseName: 'L',
      weChatId: 'wx',
      whatsAppNumber: '12345',
      email: 'a@b',
      phone: '12345',
    }),
  ).resolves.toEqual([]);

  expect(mocks.findPotentialDuplicateCustomers).not.toHaveBeenCalled();
});

test('forwards only eligible duplicate fields', async () => {
  mocks.findPotentialDuplicateCustomers.mockResolvedValue([]);

  await expect(
    findBookingCustomerDuplicates({
      excludeCustomerId: 'customer-1',
      name: 'M',
      chineseName: 'L',
      weChatId: ' wx-123 ',
      phone: '12345',
    }),
  ).resolves.toEqual([]);

  expect(mocks.findPotentialDuplicateCustomers).toHaveBeenCalledWith({
    excludeCustomerId: 'customer-1',
    weChatId: 'wx-123',
  });
});
