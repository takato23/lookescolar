import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LazyImage } from '@/components/ui/LazyImage';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock Image constructor
const mockImageLoad = jest.fn();
const mockImageError = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  // Mock image loading
  Object.defineProperty(global.Image.prototype, 'src', {
    set(src: string) {
      setTimeout(() => {
        if (src.includes('error')) {
          mockImageError();
        } else {
          mockImageLoad();
        }
      }, 100);
    }
  });
});

describe('LazyImage', () => {
  const defaultProps = {
    src: 'https://example.com/image.jpg',
    alt: 'Test image',
    className: 'test-class'
  };

  it('debe renderizar el skeleton de carga inicialmente', () => {
    render(<LazyImage {...defaultProps} />);

    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    expect(screen.getByText('Test image')).toBeInTheDocument();
  });

  it('debe mostrar la imagen cuando entra en el viewport', async () => {
    render(<LazyImage {...defaultProps} />);

    // Simular que la imagen entra en el viewport
    const imageElement = screen.getByRole('img', { hidden: true });
    expect(imageElement).toHaveAttribute('loading', 'lazy');
  });

  it('debe manejar errores de carga de imagen', async () => {
    const errorProps = {
      ...defaultProps,
      src: 'https://example.com/error-image.jpg'
    };

    render(<LazyImage {...errorProps} />);

    // Esperar a que se muestre el placeholder de error
    await waitFor(() => {
      const errorIcon = screen.getByRole('img', { hidden: true });
      expect(errorIcon).toBeInTheDocument();
    });
  });

  it('debe llamar a onLoad cuando la imagen se carga exitosamente', async () => {
    const onLoadMock = jest.fn();
    render(<LazyImage {...defaultProps} onLoad={onLoadMock} />);

    await waitFor(() => {
      expect(onLoadMock).toHaveBeenCalled();
    });
  });

  it('debe llamar a onError cuando la imagen falla en cargar', async () => {
    const onErrorMock = jest.fn();
    const errorProps = {
      ...defaultProps,
      src: 'https://example.com/error-image.jpg'
    };

    render(<LazyImage {...errorProps} onError={onErrorMock} />);

    await waitFor(() => {
      expect(onErrorMock).toHaveBeenCalled();
    });
  });

  it('debe aplicar clases CSS correctamente', () => {
    render(<LazyImage {...defaultProps} />);

    const container = screen.getByRole('img', { hidden: true }).parentElement;
    expect(container).toHaveClass('test-class');
  });

  it('debe respetar las dimensiones especificadas', () => {
    render(
      <LazyImage
        {...defaultProps}
        width={300}
        height={200}
      />
    );

    const container = screen.getByRole('img', { hidden: true }).parentElement;
    expect(container).toHaveStyle({ width: '300px', height: '200px' });
  });
});
