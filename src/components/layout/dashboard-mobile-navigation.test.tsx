import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { UserRole } from '@/generated/prisma/enums';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('@/components/common/mode-toggle', () => ({
  ModeToggle: () => null,
}));

vi.mock('@/features/auth/actions', () => ({
  logout: vi.fn(),
}));

import DashboardHeader from './dashboard-header';
import DashboardSidebar from './dashboard-sidebar';
import { MobileMenuProvider } from './mobile-menu-provider';
import { SidebarCollapseProvider } from './sidebar-collapse-provider';

const currentUser = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@example.test',
  role: UserRole.ADMIN,
};

afterEach(() => {
  cleanup();
});

test('opens the fixed mobile navigation drawer from the dashboard header', () => {
  render(
    <SidebarCollapseProvider>
      <MobileMenuProvider>
        <DashboardSidebar currentUser={currentUser} variant="mobile" />
        <DashboardHeader currentUser={currentUser} />
      </MobileMenuProvider>
    </SidebarCollapseProvider>,
  );

  const trigger = screen.getByRole('button', {
    name: 'Open navigation menu',
  });
  const drawer = document.querySelector<HTMLElement>(
    'aside[aria-label="Mobile navigation menu"]',
  );

  expect(drawer).not.toBeNull();
  if (!drawer) {
    throw new Error('Expected the mobile navigation drawer to render.');
  }

  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(drawer.classList.contains('fixed')).toBe(true);
  expect(drawer.classList.contains('relative')).toBe(false);
  expect(drawer.classList.contains('-translate-x-full')).toBe(true);

  fireEvent.click(trigger);

  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(drawer.getAttribute('aria-hidden')).toBe('false');
  expect(drawer.classList.contains('translate-x-0')).toBe(true);
  expect(drawer.classList.contains('-translate-x-full')).toBe(false);
  expect(
    screen.getAllByRole('button', { name: 'Close navigation menu' }),
  ).toHaveLength(2);
});

test('closes the mobile navigation drawer from its close controls', () => {
  render(
    <SidebarCollapseProvider>
      <MobileMenuProvider>
        <DashboardSidebar currentUser={currentUser} variant="mobile" />
        <DashboardHeader currentUser={currentUser} />
      </MobileMenuProvider>
    </SidebarCollapseProvider>,
  );

  const trigger = screen.getByRole('button', {
    name: 'Open navigation menu',
  });
  const drawer = document.querySelector<HTMLElement>(
    'aside[aria-label="Mobile navigation menu"]',
  );

  expect(drawer).not.toBeNull();
  if (!drawer) {
    throw new Error('Expected the mobile navigation drawer to render.');
  }

  fireEvent.click(trigger);
  const [backdrop] = screen.getAllByRole('button', {
    name: 'Close navigation menu',
  });
  fireEvent.click(backdrop);

  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(drawer.getAttribute('aria-hidden')).toBe('true');
  expect(drawer.classList.contains('-translate-x-full')).toBe(true);

  fireEvent.click(trigger);
  const closeButtons = screen.getAllByRole('button', {
    name: 'Close navigation menu',
  });
  fireEvent.click(closeButtons[1]);

  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(drawer.getAttribute('aria-hidden')).toBe('true');
  expect(drawer.classList.contains('-translate-x-full')).toBe(true);
});

test('keeps the desktop navigation relatively positioned', () => {
  render(
    <SidebarCollapseProvider>
      <MobileMenuProvider>
        <DashboardSidebar currentUser={currentUser} />
      </MobileMenuProvider>
    </SidebarCollapseProvider>,
  );

  const sidebar = screen.getByRole('complementary', {
    name: 'Dashboard navigation',
  });

  expect(sidebar.classList.contains('relative')).toBe(true);
  expect(sidebar.classList.contains('fixed')).toBe(false);
});
