import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';

import { AppDrawer } from '@/components/nav/app-drawer';

interface DrawerValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const DrawerContext = createContext<DrawerValue | null>(null);

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo<DrawerValue>(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return (
    <DrawerContext value={value}>
      {children}
      <AppDrawer visible={isOpen} onClose={close} />
    </DrawerContext>
  );
}

export function useDrawer(): DrawerValue {
  const value = use(DrawerContext);
  if (!value) throw new Error('useDrawer must be used inside DrawerProvider');
  return value;
}
