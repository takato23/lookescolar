import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';

import { EventListRow } from '@/components/admin/events';
import type { AdminEvent } from '@/components/admin/events';
import { renderWithShadcn } from '@/tests/utils/shadcn-test-wrapper';

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<typeof import('lucide-react')>('lucide-react');
  const FallbackIcon = (props: any) => <svg role="img" aria-hidden {...props} />;

  return {
    ...actual,
    FolderImage: actual.FolderImage ?? FallbackIcon,
  };
});

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt || 'mock-image'} />,
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  __esModule: true,
  Button: ({ children, onClick, className, 'aria-label': ariaLabel }: any) => (
    <button type="button" onClick={onClick} className={className} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  __esModule: true,
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

vi.mock('@/components/ui/card', () => ({
  __esModule: true,
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardFooter: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
}));

vi.mock('@/components/admin/events/EventThumbnail', () => ({
  __esModule: true,
  EventThumbnail: ({ className }: any) => <div className={className}>thumbnail</div>,
}));

const baseEvent: AdminEvent = {
  id: 'evt-789',
  name: 'Kermesse primaveral',
  school: 'Escuela Río de la Plata',
  date: '2025-09-01T12:00:00.000Z',
  status: 'active',
  stats: {
    totalPhotos: 1920,
    totalSubjects: 210,
    totalRevenue: 18750,
  },
};

describe('<EventListRow />', () => {
  it('renderiza métricas y respeta densidad compacta', () => {
    const onQuickView = vi.fn();

    expect(typeof EventListRow).toBe('function');

    renderWithShadcn(
      <EventListRow
        event={baseEvent}
        onQuickView={onQuickView}
        onDeleteRequest={() => {}}
        density="compact"
      />
    );

    const row = screen.getByRole('row', { name: /evento escuela río de la plata/i });
    expect(row).toHaveAttribute('data-density', 'compact');

    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('1.920')).toBeInTheDocument();
    expect(screen.getByText('210')).toBeInTheDocument();
    expect(screen.getByText(/escuela río de la plata/i)).toBeInTheDocument();

    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onQuickView).toHaveBeenCalledWith(baseEvent);
  });

  it('permite abrir vista rápida desde botón dedicado', () => {
    const onQuickView = vi.fn();

    renderWithShadcn(
      <EventListRow
        event={baseEvent}
        onQuickView={onQuickView}
        onDeleteRequest={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /vista rápida/i }));
    expect(onQuickView).toHaveBeenCalledWith(baseEvent);
  });
});
