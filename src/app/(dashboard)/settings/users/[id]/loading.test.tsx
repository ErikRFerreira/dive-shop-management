import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import Loading from './loading';

afterEach(() => {
  cleanup();
});

test('renders an accessible staff-detail loading state', () => {
  render(<Loading />);

  expect(
    screen.getByRole('status', { name: 'Loading staff user details' }),
  ).not.toBeNull();
});
