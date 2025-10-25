import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';

import { EventCard } from '@/components/admin/events';
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

const mockEvent: AdminEvent = {
  id: 'evt-123',
  name: 'Acto de fin de curso',
  school: 'Colegio San Martín',
  location: 'Buenos Aires',
  date: '2025-03-15T12:00:00.000Z',
  status: 'active',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  stats: {
    totalPhotos: 1250,
    totalSubjects: 320,
    totalRevenue: 12500,
  },
};

describe('<EventCard />', () => {
  it('renderiza nombre, estado y métricas del evento', () => {
    renderWithShadcn(
      <EventCard
        event={mockEvent}
        onQuickView={() => {}}
        onDeleteRequest={() => {}}
      />
    );

    expect(screen.getByText(/colegio san martín/i)).toBeInTheDocument();
    expect(screen.getByText(/evento escolar/i)).toBeInTheDocument();
    expect(screen.getByText(/active/i)).toBeInTheDocument();
    expect(screen.getByText('1.250')).toBeInTheDocument();
    expect(screen.getByText('320')).toBeInTheDocument();
    expect(screen.getByText(/(ARS|\$)\s?12[.,]500/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver detalles/i })).toBeInTheDocument();
  });

  it('dispara acciones de vista rápida y eliminar', () => {
    const onQuickView = vi.fn();
    const onDelete = vi.fn();

    renderWithShadcn(
      <EventCard
        event={mockEvent}
        onQuickView={onQuickView}
        onDeleteRequest={onDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /vista rápida/i }));
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));

    expect(onQuickView).toHaveBeenCalledTimes(1);
    expect(onQuickView).toHaveBeenCalledWith(mockEvent);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(mockEvent);
  });
});
