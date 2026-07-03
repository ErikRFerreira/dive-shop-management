'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

const STORAGE_KEY = 'blue-revival-sidebar-collapsed';

const sidebarCollapseListeners = new Set<() => void>();

let cachedSidebarCollapsedState: boolean | null = null;

/** Reads the persisted sidebar collapsed state from local storage. */
function readSidebarCollapsedState() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (cachedSidebarCollapsedState === null) {
    cachedSidebarCollapsedState =
      window.localStorage.getItem(STORAGE_KEY) === 'true';
  }

  return cachedSidebarCollapsedState;
}

/** Subscribes a component to sidebar collapse state changes. */
function subscribeToSidebarCollapseState(listener: () => void) {
  sidebarCollapseListeners.add(listener);

  return () => {
    sidebarCollapseListeners.delete(listener);
  };
}

/** Persists the sidebar collapse state and notifies subscribers. */
function writeSidebarCollapsedState(nextValue: boolean) {
  cachedSidebarCollapsedState = nextValue;
  window.localStorage.setItem(STORAGE_KEY, String(nextValue));

  for (const listener of sidebarCollapseListeners) {
    listener();
  }
}

/** Provides the dashboard sidebar collapse state to the dashboard shell. */
function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  return children;
}

/** Returns the shared dashboard sidebar collapse state. */
function useSidebarCollapse() {
  const isCollapsed = useSyncExternalStore(
    subscribeToSidebarCollapseState,
    readSidebarCollapsedState,
    () => false,
  );

  return {
    isCollapsed,
    toggleCollapsed: () => {
      writeSidebarCollapsedState(!readSidebarCollapsedState());
    },
  };
}

export { SidebarCollapseProvider, useSidebarCollapse };
