'use client';

import { ChevronDown, LogOut, Menu } from 'lucide-react';

import { ModeToggle } from '../common/mode-toggle';
import { useMobileMenu } from '@/components/layout/mobile-menu-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/features/auth/actions';
import { formatEnumLabel } from '@/lib/format';
import type { CurrentUser } from '@/lib/current-user';

type DashboardHeaderProps = {
  currentUser: Pick<CurrentUser, 'name' | 'email' | 'role'>;
};

/**
 * Derives a compact two-character avatar label from a staff member's name.
 *
 * @param name - Authenticated staff display name.
 * @returns Up to two uppercase initials, or a safe fallback for an empty name.
 */
function getUserInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();

  return initials || '?';
}

/**
 * Renders dashboard utilities and the authenticated user's session menu.
 *
 * @param props - Safe authenticated user fields displayed in the header.
 * @returns The responsive dashboard header with profile and logout controls.
 */
function DashboardHeader({ currentUser }: DashboardHeaderProps) {
  const { toggle } = useMobileMenu();
  const roleLabel = formatEnumLabel(currentUser.role);

  return (
    <header className="app-header">
      {/* Mobile menu button - visible below lg breakpoint */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        aria-label="Open navigation menu"
        className="lg:hidden"
      >
        <Menu className="size-5" />
      </Button>

      {/* <AppSearch /> */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <ModeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Open user menu"
              className="flex items-center gap-3 rounded-lg border border-border bg-card py-1 pr-2 pl-1 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/30"
              type="button"
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-primary/12 text-xs font-semibold text-primary ring-1 ring-primary/20">
                {getUserInitials(currentUser.name)}
              </span>
              <span className="hidden min-w-0 leading-tight sm:block">
                <span className="block truncate text-sm font-medium text-foreground">
                  {currentUser.name}
                </span>
                <span className="block max-w-44 truncate text-xs text-muted-foreground">
                  {currentUser.email}
                </span>
              </span>
              <ChevronDown
                aria-hidden
                className="hidden size-3.5 text-muted-foreground sm:block"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <span className="block truncate text-sm font-medium text-foreground">
                {currentUser.name}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {currentUser.email}
              </span>
              <span className="mt-2 inline-flex rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                {roleLabel}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={logout} className="contents">
              <DropdownMenuItem asChild>
                <button className="w-full" type="submit">
                  <LogOut aria-hidden />
                  Sign out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default DashboardHeader;
