import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import StaffUserDetailsError from './error';

afterEach(() => {
  cleanup();
});

test('renders safe staff-detail recovery without exposing server details', () => {
  const retry = vi.fn();

  render(
    <StaffUserDetailsError
      error={new Error('passwordHash leaked from secret database host')}
      unstable_retry={retry}
    />,
  );

  expect(screen.getByText('Unable to load staff user.')).not.toBeNull();
  expect(screen.queryByText(/passwordHash/i)).toBeNull();
  expect(screen.queryByText(/secret database host/i)).toBeNull();
  expect(
    screen
      .getByRole('link', { name: 'Back to Staff Management' })
      .getAttribute('href'),
  ).toBe('/settings');

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledOnce();
});
