'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type AdminLayoutVariant = 'default' | 'immersive';

export interface AdminLayoutConfig {
  variant: AdminLayoutVariant;
  showSidebar: boolean;
  showHeader: boolean;
  showMobileNav: boolean;
  showFloatingNav: boolean;
  wrapperClassName?: string;
  contentClassName?: string;
  mainClassName?: string;
  floatingNavWrapperClassName?: string;
}

const DEFAULT_CONFIG: AdminLayoutConfig = {
  variant: 'default',
  showSidebar: false,
  showHeader: true,
  showMobileNav: true,
  showFloatingNav: true,
  wrapperClassName: undefined,
  contentClassName: undefined,
  mainClassName: undefined,
  floatingNavWrapperClassName: undefined,
};

const IMMERSIVE_PRESET: AdminLayoutConfig = {
  ...DEFAULT_CONFIG,
  variant: 'immersive',
  showSidebar: false,
  showHeader: false,
  showMobileNav: false,
};

type AdminLayoutContextValue = {
  config: AdminLayoutConfig;
  setConfig: (next: Partial<AdminLayoutConfig>) => void;
  setVariant: (
    variant: AdminLayoutVariant,
    overrides?: Partial<AdminLayoutConfig>
  ) => void;
  resetConfig: () => void;
};

const AdminLayoutContext =
  createContext<AdminLayoutContextValue | undefined>(undefined);

function createPreset(variant: AdminLayoutVariant): AdminLayoutConfig {
  return variant === 'immersive'
    ? { ...IMMERSIVE_PRESET }
    : { ...DEFAULT_CONFIG };
}

export function AdminLayoutProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<AdminLayoutConfig>(
    createPreset('default')
  );

  const setConfig = useCallback((next: Partial<AdminLayoutConfig>) => {
    setConfigState((prev) => ({ ...prev, ...next }));
  }, []);

  const setVariant = useCallback(
    (variant: AdminLayoutVariant, overrides?: Partial<AdminLayoutConfig>) => {
      setConfigState({ ...createPreset(variant), ...overrides });
    },
    []
  );

  const resetConfig = useCallback(() => {
    setConfigState(createPreset('default'));
  }, []);

  const value = useMemo<AdminLayoutContextValue>(
    () => ({ config, setConfig, setVariant, resetConfig }),
    [config, setConfig, setVariant, resetConfig]
  );

  return (
    <AdminLayoutContext.Provider value={value}>
      {children}
    </AdminLayoutContext.Provider>
  );
}

export function useAdminLayout() {
  const context = useContext(AdminLayoutContext);
  if (!context) {
    throw new Error('useAdminLayout must be used within an AdminLayoutProvider');
  }
  return context;
}

export const ADMIN_LAYOUT_DEFAULT_CONFIG = createPreset('default');
