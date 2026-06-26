import { expect, test } from 'vitest';

import {
  areDuplicateCustomerIdentitySnapshotsEqual,
  getDuplicateCustomerIdentitySnapshot,
  getEligibleDuplicateCustomerLookupInput,
} from './duplicate-lookup-rules';

test('returns null when duplicate lookup fields are below thresholds', () => {
  expect(
    getEligibleDuplicateCustomerLookupInput({
      excludeCustomerId: 'customer-1',
      name: 'M',
      chineseName: 'L',
      weChatId: 'wx',
      whatsAppNumber: '123-45',
      email: 'a@b',
      phone: '+1 234',
    }),
  ).toBeNull();
});

test('keeps eligible duplicate lookup fields after trimming', () => {
  expect(
    getEligibleDuplicateCustomerLookupInput({
      excludeCustomerId: 'customer-1',
      name: ' Maria ',
      chineseName: ' Li ',
      weChatId: ' wx1 ',
      whatsAppNumber: ' +63 917 123 ',
      email: ' maria@example.test ',
      phone: ' +63 2 1234 ',
    }),
  ).toEqual({
    excludeCustomerId: 'customer-1',
    name: 'Maria',
    chineseName: 'Li',
    weChatId: 'wx1',
    whatsAppNumber: '+63 917 123',
    email: 'maria@example.test',
    phone: '+63 2 1234',
  });
});

test('requires both customer name and Chinese name before name duplicate lookup', () => {
  expect(
    getEligibleDuplicateCustomerLookupInput({
      name: 'Maria',
      chineseName: 'L',
    }),
  ).toBeNull();

  expect(
    getEligibleDuplicateCustomerLookupInput({
      name: 'Ma',
      chineseName: 'Li',
    }),
  ).toEqual({
    name: 'Ma',
    chineseName: 'Li',
  });
});

test('counts digits rather than punctuation for phone thresholds', () => {
  expect(
    getEligibleDuplicateCustomerLookupInput({
      whatsAppNumber: '+1 (23) 45',
      phone: '+1 (23) 45',
    }),
  ).toBeNull();

  expect(
    getEligibleDuplicateCustomerLookupInput({
      whatsAppNumber: '+1 (23) 456',
      phone: '+1 (23) 456',
    }),
  ).toEqual({
    whatsAppNumber: '+1 (23) 456',
    phone: '+1 (23) 456',
  });
});

test('normalizes identity snapshots for edit suppression comparisons', () => {
  const first = getDuplicateCustomerIdentitySnapshot({
    name: ' Maria ',
    chineseName: ' Li ',
    weChatId: ' Wx-One ',
    whatsAppNumber: '+1 (23) 456',
    email: ' MARIA@EXAMPLE.TEST ',
    phone: '+63 2 1234',
  });
  const second = getDuplicateCustomerIdentitySnapshot({
    name: 'maria',
    chineseName: 'li',
    weChatId: 'wx-one',
    whatsAppNumber: '123456',
    email: 'maria@example.test',
    phone: '6321234',
  });

  expect(areDuplicateCustomerIdentitySnapshotsEqual(first, second)).toBe(true);
});
