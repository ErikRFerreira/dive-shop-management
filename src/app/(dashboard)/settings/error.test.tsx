import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import SettingsError from './error';

afterEach(() => {
  cleanup();
});

test('renders generic Settings recovery without exposing server details', () => {
  const retry = vi.fn();

  render(
    <SettingsError
      error={new Error('passwordHash query failed at secret database host')}
      unstable_retry={retry}
    />,
  );

  expect(screen.getByText('Unable to load staff users.')).not.toBeNull();
  expect(screen.queryByText(/passwordHash/i)).toBeNull();
  expect(screen.queryByText(/secret database host/i)).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledOnce();
});

