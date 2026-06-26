import { beforeEach, expect, test, vi } from 'vitest';

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

import { findPotentialDuplicateCustomers } from './duplicates';

function customerRecord(overrides = {}) {
  return {
    id: 'customer-1',
    fullName: 'Ada Diver',
    firstName: null,
    lastName: null,
    chineseName: '阿达',
    weChatId: 'ada-wx',
    whatsAppNumber: null,
    email: 'ada@example.test',
    phone: '+639171234567',
    hotel: null,
    preferredLanguage: null,
    bookings: [],
    ...overrides,
  };
}

beforeEach(() => {
  mocks.findMany.mockReset();
});

test('does not query when duplicate input has only empty values', async () => {
  await expect(
    findPotentialDuplicateCustomers({
      name: ' ',
      chineseName: '',
      weChatId: null,
      whatsAppNumber: undefined,
      email: '   ',
      phone: '',
    }),
  ).resolves.toEqual([]);

  expect(mocks.findMany).not.toHaveBeenCalled();
});

test('builds strong-match filters only from non-empty values', async () => {
  mocks.findMany.mockResolvedValue([customerRecord()]);

  await findPotentialDuplicateCustomers({
    weChatId: '',
    whatsAppNumber: ' ',
    email: 'ada@example.test',
    phone: null,
    name: 'Ada Diver',
    chineseName: '',
  });

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        AND: [
          {},
          {
            OR: [
              {
                email: {
                  equals: 'ada@example.test',
                  mode: 'insensitive',
                },
              },
            ],
          },
        ],
      },
    }),
  );
});

test('matches name and Chinese name only when both are present', async () => {
  mocks.findMany.mockResolvedValue([
    customerRecord(),
    customerRecord({
      id: 'customer-2',
      fullName: 'Different Diver',
      email: null,
      weChatId: null,
      phone: null,
    }),
  ]);

  await expect(
    findPotentialDuplicateCustomers({
      name: 'Ada Diver',
      chineseName: '阿达',
    }),
  ).resolves.toEqual([
    expect.objectContaining({
      id: 'customer-1',
      matchedFields: ['nameAndChineseName'],
    }),
  ]);

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        AND: [
          {},
          {
            OR: [
              {
                chineseName: {
                  equals: '阿达',
                  mode: 'insensitive',
                },
              },
            ],
          },
        ],
      },
    }),
  );
});
