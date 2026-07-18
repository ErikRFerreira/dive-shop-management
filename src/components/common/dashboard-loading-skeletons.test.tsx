import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { DashboardLoadingSkeleton } from './dashboard-loading-skeletons';

afterEach(() => {
  cleanup();
});

test('renders the non-interactive operational dashboard structure', () => {
  const { container } = render(<DashboardLoadingSkeleton />);

  expect(
    screen.getByRole('status', { name: 'Loading dashboard' }),
  ).toBeTruthy();
  expect(container.querySelectorAll('section')).toHaveLength(8);
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByRole('link')).toBeNull();
});
