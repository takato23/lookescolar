import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette } from '@/components/admin/CommandPalette';

describe('CommandPalette', () => {
  it('muestra y cierra el diálogo', () => {
    const onClose = () => {};
    render(<CommandPalette isOpen={true} onClose={onClose} />);

    expect(
      screen.getByRole('dialog', { name: /paleta de comandos/i })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/buscar comandos/i)).toBeInTheDocument();
  });

  it('filtra resultados por texto', () => {
    const onClose = () => {};
    render(<CommandPalette isOpen={true} onClose={onClose} />);

    const input = screen.getByPlaceholderText(/buscar comandos/i);
    fireEvent.change(input, { target: { value: 'Eventos' } });

    expect(screen.getByText(/Eventos/i)).toBeInTheDocument();
  });
});
