import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { UserRole } from '@/generated/prisma/enums';

vi.mock('@/components/common/mode-toggle', () => ({
  ModeToggle: () => null,
}));

vi.mock('@/features/auth/actions', () => ({
  logout: vi.fn(),
}));

import { MobileMenuProvider } from './mobile-menu-provider';
import DashboardHeader from './dashboard-header';

afterEach(() => {
  cleanup();
});

test('shows safe authenticated identity fields and exposes logout', async () => {
  render(
    <MobileMenuProvider>
      <DashboardHeader
        currentUser={{
          name: 'Admin User',
          email: 'admin@example.test',
          role: UserRole.ADMIN,
        }}
      />
    </MobileMenuProvider>,
  );

  expect(screen.getByText('AU')).toBeTruthy();
  expect(screen.getByText('Admin User')).toBeTruthy();
  expect(screen.getByText('admin@example.test')).toBeTruthy();

  fireEvent.pointerDown(screen.getByRole('button', { name: 'Open user menu' }), {
    button: 0,
    ctrlKey: false,
  });

  expect(await screen.findByText('Admin')).toBeTruthy();
  expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeTruthy();
});
