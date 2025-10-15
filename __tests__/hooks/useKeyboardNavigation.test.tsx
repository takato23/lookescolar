import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation, usePhotoGalleryNavigation } from '@/hooks/useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  let mockEventListeners: Record<string, EventListener> = {};

  beforeEach(() => {
    // Mock document.addEventListener
    document.addEventListener = jest.fn((event, handler) => {
      mockEventListeners[event] = handler;
    });

    // Mock document.removeEventListener
    document.removeEventListener = jest.fn((event, handler) => {
      delete mockEventListeners[event];
    });

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/test',
        searchParams: {
          set: jest.fn()
        },
        history: {
          pushState: jest.fn(),
          replaceState: jest.fn()
        }
      },
      writable: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockEventListeners = {};
  });

  it('debe configurar event listeners correctamente', () => {
    const mockHandlers = {
      onNavigateNext: jest.fn(),
      onNavigatePrevious: jest.fn(),
      onSelectCurrent: jest.fn(),
      onCloseModal: jest.fn(),
      onCheckout: jest.fn()
    };

    renderHook(() => useKeyboardNavigation(mockHandlers));

    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('debe llamar a onNavigateNext con flecha derecha', () => {
    const mockHandlers = {
      onNavigateNext: jest.fn()
    };

    renderHook(() => useKeyboardNavigation(mockHandlers));

    const keydownHandler = mockEventListeners['keydown'];
    const mockEvent = {
      key: 'ArrowRight',
      preventDefault: jest.fn(),
      target: document.body
    } as any;

    act(() => {
      keydownHandler(mockEvent);
    });

    expect(mockHandlers.onNavigateNext).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('debe llamar a onNavigatePrevious con flecha izquierda', () => {
    const mockHandlers = {
      onNavigatePrevious: jest.fn()
    };

    renderHook(() => useKeyboardNavigation(mockHandlers));

    const keydownHandler = mockEventListeners['keydown'];
    const mockEvent = {
      key: 'ArrowLeft',
      preventDefault: jest.fn(),
      target: document.body
    } as any;

    act(() => {
      keydownHandler(mockEvent);
    });

    expect(mockHandlers.onNavigatePrevious).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('debe llamar a onCloseModal con Escape', () => {
    const mockHandlers = {
      onCloseModal: jest.fn()
    };

    renderHook(() => useKeyboardNavigation(mockHandlers));

    const keydownHandler = mockEventListeners['keydown'];
    const mockEvent = {
      key: 'Escape',
      preventDefault: jest.fn(),
      target: document.body
    } as any;

    act(() => {
      keydownHandler(mockEvent);
    });

    expect(mockHandlers.onCloseModal).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('debe llamar a onSelectCurrent con Enter', () => {
    const mockHandlers = {
      onSelectCurrent: jest.fn()
    };

    renderHook(() => useKeyboardNavigation(mockHandlers));

    const keydownHandler = mockEventListeners['keydown'];
    const mockEvent = {
      key: 'Enter',
      preventDefault: jest.fn(),
      target: document.body
    } as any;

    act(() => {
      keydownHandler(mockEvent);
    });

    expect(mockHandlers.onSelectCurrent).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('debe llamar a onCheckout con Ctrl+Enter', () => {
    const mockHandlers = {
      onCheckout: jest.fn()
    };

    renderHook(() => useKeyboardNavigation(mockHandlers));

    const keydownHandler = mockEventListeners['keydown'];
    const mockEvent = {
      key: 'Enter',
      ctrlKey: true,
      preventDefault: jest.fn(),
      target: { tagName: 'DIV' }
    } as any;

    act(() => {
      keydownHandler(mockEvent);
    });

    expect(mockHandlers.onCheckout).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('no debe hacer nada si está deshabilitado', () => {
    const mockHandlers = {
      onNavigateNext: jest.fn()
    };

    renderHook(() => useKeyboardNavigation({ ...mockHandlers, enabled: false }));

    expect(document.addEventListener).not.toHaveBeenCalled();
  });

  it('debe limpiar event listeners al desmontar', () => {
    const { unmount } = renderHook(() => useKeyboardNavigation());

    unmount();

    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

describe('usePhotoGalleryNavigation', () => {
  let mockEventListeners: Record<string, EventListener> = {};

  beforeEach(() => {
    document.addEventListener = jest.fn((event, handler) => {
      mockEventListeners[event] = handler;
    });

    document.removeEventListener = jest.fn((event, handler) => {
      delete mockEventListeners[event];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockEventListeners = {};
  });

  it('debe navegar correctamente en galería de fotos', () => {
    const mockOnNavigate = jest.fn();
    const mockOnPhotoSelect = jest.fn();

    const photos = [
      { id: '1', url: 'photo1.jpg' },
      { id: '2', url: 'photo2.jpg' },
      { id: '3', url: 'photo3.jpg' }
    ];

    const { result } = renderHook(() =>
      usePhotoGalleryNavigation(photos, 1, mockOnPhotoSelect, mockOnNavigate)
    );

    // Probar navegación hacia adelante
    act(() => {
      result.current.navigateNext();
    });

    expect(mockOnNavigate).toHaveBeenCalledWith('next');

    // Probar navegación hacia atrás
    act(() => {
      result.current.navigatePrevious();
    });

    expect(mockOnNavigate).toHaveBeenCalledWith('prev');

    // Probar selección
    act(() => {
      result.current.selectCurrent();
    });

    expect(mockOnPhotoSelect).toHaveBeenCalledWith(photos[1]);
  });

  it('no debe navegar más allá de los límites', () => {
    const mockOnNavigate = jest.fn();
    const mockOnPhotoSelect = jest.fn();

    const photos = [
      { id: '1', url: 'photo1.jpg' },
      { id: '2', url: 'photo2.jpg' }
    ];

    const { result } = renderHook(() =>
      usePhotoGalleryNavigation(photos, 1, mockOnPhotoSelect, mockOnNavigate)
    );

    // Intentar navegar hacia adelante desde el final
    act(() => {
      result.current.navigateNext();
    });

    expect(mockOnNavigate).not.toHaveBeenCalledWith('next');

    // Intentar navegar hacia atrás desde el principio
    const { result: resultStart } = renderHook(() =>
      usePhotoGalleryNavigation(photos, 0, mockOnPhotoSelect, mockOnNavigate)
    );

    act(() => {
      resultStart.current.navigatePrevious();
    });

    expect(mockOnNavigate).not.toHaveBeenCalledWith('prev');
  });
});
