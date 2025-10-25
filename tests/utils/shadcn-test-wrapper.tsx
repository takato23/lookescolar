import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';

import { TooltipProvider } from '@/components/ui/tooltip';

type ShadcnRenderOptions = Omit<RenderOptions, 'wrapper'>;

const PORTAL_ROOT_IDS = ['radix-sheet-portal-root', 'radix-tooltip-portal-root'];

const ensurePortalRoots = () => {
  if (typeof document === 'undefined') return;

  PORTAL_ROOT_IDS.forEach((id) => {
    if (!document.getElementById(id)) {
      const root = document.createElement('div');
      root.setAttribute('id', id);
      root.setAttribute('data-testid', id);
      document.body.appendChild(root);
    }
  });
};

interface ShadcnTestWrapperProps {
  children: ReactNode;
}

const ShadcnTestWrapper = ({ children }: ShadcnTestWrapperProps) => {
  useEffect(() => {
    ensurePortalRoots();
  }, []);

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      {children}
    </TooltipProvider>
  );
};

export const renderWithShadcn = (
  ui: ReactElement,
  options?: ShadcnRenderOptions
) => {
  ensurePortalRoots();

  return render(ui, {
    wrapper: ShadcnTestWrapper,
    ...options,
  });
};

