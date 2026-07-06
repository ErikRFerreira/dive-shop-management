'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type MobileMenuContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

type MobileMenuProviderProps = {
  children: ReactNode;
};

export function MobileMenuProvider({ children }: MobileMenuProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const value: MobileMenuContextValue = {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };

  return (
    <MobileMenuContext.Provider value={value}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  const context = useContext(MobileMenuContext);
  if (!context) {
    throw new Error('useMobileMenu must be used within MobileMenuProvider');
  }
  return context;
}
