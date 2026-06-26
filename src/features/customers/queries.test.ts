import { beforeEach, expect, test, vi } from 'vitest';

import { PreferredLanguage } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      findMany: mocks.findMany,
    },
  },
}));

import { searchCustomers } from './queries';

beforeEach(() => {
  mocks.findMany.mockReset();
});

test('does not query customers for blank search input', async () => {
  await expect(searchCustomers('   ')).resolves.toEqual([]);

  expect(mocks.findMany).not.toHaveBeenCalled();
});

test('searches supported customer identity fields', async () => {
  mocks.findMany.mockResolvedValue([]);

  await searchCustomers(' anchie ');

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        OR: [
          { fullName: { contains: 'anchie', mode: 'insensitive' } },
          { firstName: { contains: 'anchie', mode: 'insensitive' } },
          { lastName: { contains: 'anchie', mode: 'insensitive' } },
          { chineseName: { contains: 'anchie', mode: 'insensitive' } },
          { weChatId: { contains: 'anchie', mode: 'insensitive' } },
          { whatsAppNumber: { contains: 'anchie', mode: 'insensitive' } },
          { email: { contains: 'anchie', mode: 'insensitive' } },
          { phone: { contains: 'anchie', mode: 'insensitive' } },
        ],
      },
    }),
  );
});

test('maps customer search results with latest booking details', async () => {
  const lastBookingDate = new Date('2026-07-14T00:00:00.000Z');
  const lastDiveDate = new Date('2026-06-01T00:00:00.000Z');

  mocks.findMany.mockResolvedValue([
    {
      id: 'customer-1',
      fullName: null,
      firstName: 'Anchie',
      lastName: 'Tan',
      chineseName: '安琪',
      weChatId: 'anchie-wx',
      whatsAppNumber: '+639171234567',
      email: 'anchie@example.test',
      phone: null,
      hotel: 'Ocean View',
      preferredLanguage: PreferredLanguage.CHINESE,
      bookings: [
        {
          certificationLevel: 'Advanced Open Water',
          certificationAgency: 'PADI',
          lastDiveAt: lastDiveDate,
          divesLogged: 24,
          bookingRequest: {
            startAt: null,
            requestedDate: lastBookingDate,
            createdAt: new Date('2026-06-20T00:00:00.000Z'),
          },
        },
      ],
    },
  ]);

  await expect(searchCustomers('anchie')).resolves.toEqual([
    {
      id: 'customer-1',
      name: 'Anchie Tan',
      fullName: null,
      firstName: 'Anchie',
      lastName: 'Tan',
      chineseName: '安琪',
      weChatId: 'anchie-wx',
      whatsAppNumber: '+639171234567',
      email: 'anchie@example.test',
      phone: null,
      hotel: 'Ocean View',
      preferredLanguage: PreferredLanguage.CHINESE,
      certificationLevel: 'Advanced Open Water',
      certificationAgency: 'PADI',
      lastDiveDate,
      divesLogged: 24,
      lastBookingDate,
    },
  ]);
});
