import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { WorkspaceLoading } from './workspace-loading';

afterEach(() => {
  cleanup();
});

test('renders an accessible branded workspace transition', () => {
  const { container } = render(<WorkspaceLoading />);

  expect(
    screen.getByRole('img', { name: 'Blue Revival Dive Ops' }),
  ).toBeTruthy();
  expect(screen.getByRole('status', { name: 'Loading' })).toBeTruthy();
  expect(screen.getByText('Preparing your workspace...')).toBeTruthy();
  expect(container.querySelector('main')?.getAttribute('aria-busy')).toBe(
    'true',
  );
});
