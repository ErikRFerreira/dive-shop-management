import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isPending: false,
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();

  return {
    ...actual,
    useTransition: () => [
      mocks.isPending,
      (callback: () => void) => callback(),
    ],
  };
});

import { CustomerSearch } from './customer-search';

beforeEach(() => {
  mocks.isPending = false;
  mocks.push.mockReset();
});

afterEach(() => {
  cleanup();
});

test('uses full-width search controls on mobile', () => {
  render(<CustomerSearch query="" />);

  const input = screen.getByLabelText('Search customers');
  const searchButton = screen.getByRole('button', { name: 'Search' });
  const form = searchButton.closest('form');
  const inputWrapper = input.parentElement?.parentElement;

  expect(form?.classList.contains('flex-col')).toBe(true);
  expect(form?.classList.contains('sm:flex-row')).toBe(true);
  expect(inputWrapper?.classList.contains('w-full')).toBe(true);
  expect(searchButton.classList.contains('w-full')).toBe(true);
  expect(searchButton.classList.contains('sm:w-auto')).toBe(true);
});

test('submits a normalized customer search query', () => {
  render(<CustomerSearch query="" />);

  fireEvent.change(screen.getByLabelText('Search customers'), {
    target: { value: '  Maria Santos  ' },
  });
  fireEvent.submit(screen.getByRole('button', { name: 'Search' }).closest('form')!);

  expect(mocks.push).toHaveBeenCalledWith('/customers?q=Maria%20Santos');
});

test('clears the customer search back to the default list', () => {
  render(<CustomerSearch query="Maria" />);

  fireEvent.click(screen.getByRole('button', { name: 'Clear customer search' }));

  expect(mocks.push).toHaveBeenCalledWith('/customers');
  expect((screen.getByLabelText('Search customers') as HTMLInputElement).value).toBe(
    '',
  );
});

test('disables search controls while navigation is pending', () => {
  mocks.isPending = true;

  render(<CustomerSearch query="Maria" />);

  expect(
    (screen.getByLabelText('Search customers') as HTMLInputElement).disabled,
  ).toBe(true);
  expect(
    (screen.getByRole('button', { name: 'Searching...' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(
    (
      screen.getByRole('button', {
        name: 'Clear customer search',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
