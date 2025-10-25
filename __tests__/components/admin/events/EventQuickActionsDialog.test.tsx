import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';

import { EventQuickActionsDialog } from '@/components/admin/events';
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

vi.mock('@/components/ui/separator', () => ({
  __esModule: true,
  Separator: ({ className }: any) => <hr className={className} />,
}));

vi.mock('@/components/admin/events/EventThumbnail', () => ({
  __esModule: true,
  EventThumbnail: ({ className }: any) => <div className={className}>thumbnail</div>,
}));

const eventWithInventory: AdminEvent = {
  id: 'evt-456',
  name: 'Graduación 5º año',
  school: 'Instituto Belgrano',
  date: '2025-11-25T15:00:00.000Z',
  status: 'completed',
  stats: {
    totalPhotos: 480,
    totalSubjects: 180,
    totalRevenue: 35500,
  },
};

const eventWithSecondaryMetrics: AdminEvent = {
  ...eventWithInventory,
  stats: {
    totalPhotos: 480,
    totalSubjects: 180,
    totalRevenue: 35500,
    completionRate: 86,
    conversionRate: 0.42,
    totalOrders: 18,
  },
};

describe('<EventQuickActionsDialog />', () => {
  it('muestra métricas y advertencia cuando el evento tiene recursos', async () => {
    const onDelete = vi.fn();

    renderWithShadcn(
      <EventQuickActionsDialog
        event={eventWithInventory}
        open
        onOpenChange={() => {}}
        onDeleteRequest={onDelete}
      />
    );

    await screen.findByRole('heading', { name: /instituto belgrano/i });

    expect(screen.getByText(/acciones rápidas/i)).toBeInTheDocument();
    expect(screen.getByText(/instituto belgrano/i)).toBeInTheDocument();
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
    const studentsMetricLabel = screen
      .getAllByText(/estudiantes vinculados/i)
      .find((node) =>
        node instanceof HTMLElement && node.className.includes('uppercase tracking-[0.12em]')
      );
    expect(studentsMetricLabel).toBeDefined();
    const studentsMetric = studentsMetricLabel.closest('div');
    expect(studentsMetric).not.toBeNull();
    expect(within(studentsMetric as HTMLElement).getByText('180')).toBeInTheDocument();
    expect(screen.getByText(/hay 480 fotos y 180 estudiantes vinculados/i)).toBeInTheDocument();
    expect(screen.getByText(/ingresos estimados/i)).toBeInTheDocument();
    expect(screen.getByText(/métricas secundarias/i)).toBeInTheDocument();
    expect(screen.getByText(/tasa de finalización/i)).toBeInTheDocument();
    expect(screen.getAllByText(/sin datos/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/próximamente/i)).toBeInTheDocument();
    expect(
      screen.getByText(/este evento contiene contenido publicado/i)
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /eliminar evento definitivamente/i })
    );
    expect(onDelete).toHaveBeenCalledWith(eventWithInventory);
  });

  it('no renderiza advertencia cuando no hay fotos ni estudiantes', async () => {
    renderWithShadcn(
      <EventQuickActionsDialog
        event={{ ...eventWithInventory, stats: { totalPhotos: 0, totalSubjects: 0 } }}
        open
        onOpenChange={() => {}}
        onDeleteRequest={() => {}}
      />
    );

    await screen.findByRole('heading', { name: /instituto belgrano/i });

    expect(
      screen.queryByText(/este evento tiene contenido publicado/i)
    ).not.toBeInTheDocument();
  });

  it('formatea métricas secundarias cuando hay datos', async () => {
    renderWithShadcn(
      <EventQuickActionsDialog
        event={eventWithSecondaryMetrics}
        open
        onOpenChange={() => {}}
        onDeleteRequest={() => {}}
      />
    );

    await screen.findByRole('heading', { name: /instituto belgrano/i });

    expect(await screen.findByText('86%')).toBeInTheDocument();
    expect(await screen.findByText('42%')).toBeInTheDocument();
    expect(await screen.findByText('18')).toBeInTheDocument();
  });
});
